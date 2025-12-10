import { NextRequest, NextResponse } from 'next/server';
import { ActualizarProceso } from '@/app/(generador)/services/actas_querys_services/actualizarProceso';
import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { getActaStatusByName } from '@/app/(generador)/services/actas_querys_services/getActaStatusByName';

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

  const signatureString = `${custIdCliente}^${pKey}^${refPayco}^${transactionId}^${amount}^${currency}`;
  const expectedSignature = crypto
    .createHash('sha256')
    .update(signatureString)
    .digest('hex');

  return expectedSignature.toLowerCase() === receivedSignature.toLowerCase();
}

export async function POST(request: NextRequest) {
  try {

    const formData = await request.formData();

    const refPayco = formData.get('x_ref_payco') as string;
    const transactionId = formData.get('x_transaction_id') as string;
    const amount = formData.get('x_amount') as string;
    const response = formData.get('x_response') as string;
    const invoice = formData.get('x_id_invoice') as string;
    const signature = formData.get('x_signature') as string;

    if (!validateEpaycoSignature(formData)) {
      console.error('Firma de ePayco inválida');
      return NextResponse.json({
        x_cod_response: 2,
        x_response: 'Rechazada',
        x_response_reason_text: 'Firma inválida'
      }, { status: 400 });
    }

    let fileName = "";
    let userIdFromInvoice = "";

    if (invoice) {
      const tipo = process.env.NEXT_PUBLIC_PAGO || "acta";
      let withoutTipo = invoice;
      if (invoice.startsWith(tipo)) {
        withoutTipo = invoice.substring(tipo.length);
      }

      const lastDashIndex = withoutTipo.lastIndexOf('-');
      const secondToLastDashIndex = withoutTipo.lastIndexOf('-', lastDashIndex - 1);

      if (secondToLastDashIndex > 0) {
        fileName = withoutTipo.substring(0, secondToLastDashIndex);
        userIdFromInvoice = withoutTipo.substring(secondToLastDashIndex + 1, lastDashIndex);
      } else {
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

    // El user_id ahora se extrae de la factura.
    // getUserEmailFromSession() no es fiable en un webhook.
    const user_id = userIdFromInvoice;

    if (!user_id) {
      console.error('No se pudo extraer el user_id de la referencia:', invoice);
      // Devolvemos una respuesta exitosa a ePayco para que no siga reintentando,
      // pero registramos el error para una revisión manual.
      return NextResponse.json({ message: "Confirmación recibida pero sin user_id en la factura." });
    }

    // 1. Verificar el estado actual del acta ANTES de procesar cualquier cosa.
    const idEstadoProcesoActual = await getActaStatusByName(fileName, user_id);

    // 2. Si el acta ya fue procesada (estado 5 o superior), ignorar esta notificación.
    // Esto previene que una notificación de "Rechazada" que llegue tarde sobrescriba una "Aceptada".
    if (idEstadoProcesoActual && idEstadoProcesoActual >= 5) {
      console.log(`Notificación para el acta "${fileName}" ignorada porque ya fue procesada. Estado actual: ${idEstadoProcesoActual}.`);
      return NextResponse.json({
        x_cod_response: 1,
        x_response: 'Aceptada',
        x_response_reason_text: 'Transacción ya procesada anteriormente.'
      });
    }

    if (response === 'Aceptada' || response === '1') {

      try {

        let codigoReferidoExistente: string | null = null;
        try {
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

        }

        await ActualizarProceso(
          fileName,
          5,
          undefined,
          parseFloat(amount),
          transactionId,
          undefined,
          invoice,
          undefined,
          undefined,
          null,
          false,
          undefined,
          undefined,
          codigoReferidoExistente || undefined,
          undefined,
          undefined,
        );
      } catch (updateError: any) {

        console.error('Error al actualizar acta después de pago aprobado:', updateError);
        console.error('Detalles:', {
          fileName,
          transactionId,
          amount,
          invoice,
          error: updateError?.message || updateError
        });

      }

      return NextResponse.json({
        x_cod_response: 1,
        x_response: 'Aceptada',
        x_response_reason_text: 'Transacción aprobada'
      });
    } else {

      try {
        await ActualizarProceso(
          fileName,
          9,
          undefined,
          parseFloat(amount || "0"),
          transactionId || "",
          undefined,
          invoice || "",
          null,
          null,
          null,
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        );
      } catch (updateError: any) {

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

export async function GET(request: NextRequest) {
  return POST(request);
}
