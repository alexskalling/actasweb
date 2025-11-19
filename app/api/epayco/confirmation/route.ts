import { NextRequest, NextResponse } from 'next/server';
import { ActualizarProceso } from '@/app/(generador)/services/actas_querys_services/actualizarProceso';
import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from 'crypto';

/**
 * Valida la firma de ePayco
 * La firma se genera con: x_cust_id_cliente + x_ref_payco + x_transaction_id + x_amount + x_currency_code + P_KEY
 */
function validateEpaycoSignature(formData: FormData): boolean {
  const pKey = process.env.EPAYCO_P_KEY || process.env.P_KEY;
  const custIdCliente = process.env.P_CUST_ID_CLIENTE || process.env.EPAYCO_CUST_ID_CLIENTE;
  
  if (!pKey || !custIdCliente) {
    return true;
  }

  const refPayco = formData.get('x_ref_payco') as string;
  const transactionId = formData.get('x_transaction_id') as string;
  const amount = formData.get('x_amount') as string;
  const currency = formData.get('x_currency_code') as string || 'COP';
  const receivedSignature = formData.get('x_signature') as string;

  if (!refPayco || !transactionId || !amount || !receivedSignature) {
    return false;
  }

  // Generar la firma esperada
  const signatureString = `${custIdCliente}^${pKey}^${refPayco}^${transactionId}^${amount}^${currency}`;
  const expectedSignature = crypto
    .createHash('sha256')
    .update(signatureString)
    .digest('hex');

  // Comparar firmas (case-insensitive)
  return expectedSignature.toLowerCase() === receivedSignature.toLowerCase();
}

/**
 * Endpoint para recibir confirmaciones de ePayco
 * ePayco llama a este endpoint desde el servidor después de procesar un pago
 */
export async function POST(request: NextRequest) {
  try {
    // ePayco envía los datos como form-data
    const formData = await request.formData();
    
    // Extraer parámetros de ePayco
    const refPayco = formData.get('x_ref_payco') as string;
    const transactionId = formData.get('x_transaction_id') as string;
    const amount = formData.get('x_amount') as string;
    const response = formData.get('x_response') as string;
    const invoice = formData.get('x_id_invoice') as string;
    const signature = formData.get('x_signature') as string;

    // Validar la firma de ePayco para seguridad
    if (!validateEpaycoSignature(formData)) {
      console.error('Firma de ePayco inválida');
      return NextResponse.json({ 
        x_cod_response: 2,
        x_response: 'Rechazada',
        x_response_reason_text: 'Firma inválida'
      }, { status: 400 });
    }
    
    // Extraer el nombre del archivo de la referencia (invoice)
    // Formato: tipo + file + "-" + random
    // Ejemplo: "actareunionluz.aac-42542"
    let fileName = "";
    if (invoice) {
      const tipo = process.env.NEXT_PUBLIC_PAGO || "acta";
      
      // Remover el prefijo tipo si existe
      let withoutTipo = invoice;
      if (invoice.startsWith(tipo)) {
        withoutTipo = invoice.substring(tipo.length);
      }
      
      // El formato es: file + "-" + random
      // Buscar el último guion (que separa el nombre del random)
      const lastDashIndex = withoutTipo.lastIndexOf('-');
      if (lastDashIndex > 0) {
        // Todo antes del último guion es el nombre del archivo
        fileName = withoutTipo.substring(0, lastDashIndex);
      } else {
        // Si no hay guion, usar todo como nombre (fallback)
        fileName = withoutTipo;
      }
    }
    
    if (!fileName) {
      console.error('No se pudo extraer el nombre del archivo de la referencia:', invoice);
      return NextResponse.json({ 
        x_cod_response: 2,
        x_response: 'Rechazada',
        x_response_reason_text: 'Referencia inválida'
      }, { status: 400 });
    }

    if (response === 'Aceptada' || response === '1') {
      // Pago aprobado por ePayco
      try {
        // Obtener el código de referido existente del acta antes de actualizar
        let codigoReferidoExistente: string | null = null;
        try {
          const mail = await getUserEmailFromSession();
          const user_id = !mail
            ? 'a817fffe-bc7e-4e29-83f7-b512b039e817'
            : (await getUserIdByEmail(mail)) || 'a817fffe-bc7e-4e29-83f7-b512b039e817';

          const actaExistente = await db
            .select({
              codigoReferido: actas.codigoReferido,
            })
            .from(actas)
            .where(
              and(
                eq(actas.nombre, fileName),
                eq(actas.idUsuario, user_id)
              )
            )
            .limit(1);

          if (actaExistente.length > 0 && actaExistente[0].codigoReferido) {
            codigoReferidoExistente = actaExistente[0].codigoReferido;
            console.log('Código de referido encontrado y preservado:', codigoReferidoExistente);
          }
        } catch (error) {
          console.error('Error al obtener código de referido existente:', error);
          // Continuar aunque falle, no es crítico
        }

        await ActualizarProceso(
          fileName,
          5, // Estado: Aprobado
          undefined,
          parseFloat(amount),
          transactionId,
          undefined,
          invoice,
          undefined, // NO actualizar urlTranscripcion - puede que ya esté guardada
          undefined, // NO actualizar urlborrador - puede que ya esté guardada
          null,
          undefined, // codigoAtencion
          undefined, // automation_mail
          codigoReferidoExistente || undefined // Preservar código de referido si existe
        );
      } catch (updateError: any) {
        // Si falla la actualización, loguear pero NO rechazar el pago
        // porque ePayco ya aprobó la transacción
        console.error('Error al actualizar acta después de pago aprobado:', updateError);
        console.error('Detalles:', {
          fileName,
          transactionId,
          amount,
          invoice,
          error: updateError?.message || updateError
        });
        // Continuar y devolver éxito a ePayco
      }
      
      // Siempre devolver éxito a ePayco si el pago fue aprobado
      return NextResponse.json({ 
        x_cod_response: 1,
        x_response: 'Aceptada',
        x_response_reason_text: 'Transacción aprobada'
      });
    } else {
      // Pago rechazado por ePayco
      try {
        await ActualizarProceso(
          fileName,
          9, // Estado: Pago fallido
          undefined,
          parseFloat(amount || "0"),
          transactionId || "",
          undefined,
          invoice || "",
          null,
          null,
          null
        );
      } catch (updateError: any) {
        // Si falla la actualización, loguear pero continuar
        console.error('Error al actualizar acta después de pago rechazado:', updateError);
      }
      
      return NextResponse.json({ 
        x_cod_response: 2,
        x_response: 'Rechazada',
        x_response_reason_text: 'Transacción rechazada'
      });
    }
    
  } catch (error) {
    console.error('Error en confirmación ePayco:', error);
    return NextResponse.json({ 
      x_cod_response: 2,
      x_response: 'Rechazada',
      x_response_reason_text: 'Error procesando confirmación'
    }, { status: 500 });
  }
}

// ePayco también puede hacer GET a este endpoint
export async function GET(request: NextRequest) {
  return POST(request);
}

