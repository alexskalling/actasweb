import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getActaStatusByName } from '@/app/(generador)/services/actas_querys_services/getActaStatusByName';
import { actualizarEstadoProcesoService } from '@/app/(generador)/services/actas_querys_services/actualizarEstadoProcesoService';
import { guardarTransaccionService } from '@/app/(generador)/services/transacciones/guardarTransaccionService';
import { processAction } from '@/app/(generador)/services/generacion_contenido_services/processAction';
import { getActaParaProcesarService, ActaParaProcesar } from '@/app/(generador)/services/actas_querys_services/getActaParaProcesarService';

function validateEpaycoSignature(formData: FormData): boolean {
  console.log('[DEBUG] Iniciando validación de firma...');
  const pKey = process.env.EPAYCO_P_KEY || process.env.P_KEY;
  const custIdCliente = process.env.P_CUST_ID_CLIENTE || process.env.EPAYCO_CUST_ID_CLIENTE;

  if (!pKey || !custIdCliente) {
    console.log('[DEBUG] No se encontraron P_KEY o P_CUST_ID_CLIENTE en las variables de entorno. Se omite la validación de firma.');
    return true;
  }

  const refPayco = formData.get('x_ref_payco') as string;
  const transactionId = formData.get('x_transaction_id') as string;
  const amount = formData.get('x_amount') as string;
  const currency = formData.get('x_currency_code') as string || 'COP';
  const receivedSignature = formData.get('x_signature') as string;

  if (!refPayco || !transactionId || !amount || !receivedSignature) {
    console.error('[DEBUG] Faltan campos necesarios para la validación de la firma:', { refPayco, transactionId, amount, receivedSignature });
    return false;
  }

  const signatureString = `${custIdCliente}^${pKey}^${refPayco}^${transactionId}^${amount}^${currency}`;
  const expectedSignature = crypto
    .createHash('sha256')
    .update(signatureString)
    .digest('hex');

  const isValid = expectedSignature.toLowerCase() === receivedSignature.toLowerCase();
  console.log('[DEBUG] String para firma:', signatureString);
  console.log('[DEBUG] Firma esperada:', expectedSignature);
  console.log('[DEBUG] Firma recibida:', receivedSignature);
  console.log('[DEBUG] ¿La firma es válida?:', isValid);

  return isValid;
}

export async function POST(request: NextRequest) {
  console.log('\n--- [DEBUG] INICIO CONFIRMACIÓN EPAYCO ---', new Date().toISOString());
  try {
    const formData = await request.formData();
    console.log('[DEBUG] FormData recibida de ePayco:', Object.fromEntries(formData.entries()));

    const transactionId = formData.get('x_transaction_id') as string;
    const amount = formData.get('x_amount') as string;
    const response = formData.get('x_response') as string;
    const invoice = formData.get('x_id_invoice') as string;
    const signature = formData.get('x_signature') as string;

    if (!validateEpaycoSignature(formData)) {
      console.error('[DEBUG] ERROR: Firma de ePayco inválida. Rechazando petición.');
      return NextResponse.json({
        x_cod_response: 2,
        x_response: 'Rechazada',
        x_response_reason_text: 'Firma inválida'
      }, { status: 400 });
    }

    let fileName = "";

    console.log('[DEBUG] Extrayendo user_id de x_extra1...');
    const user_id = formData.get('x_extra1') as string;

    if (invoice) {
      const tipo = process.env.NEXT_PUBLIC_PAGO || "acta";
      let withoutTipo = invoice;
      if (invoice.startsWith(tipo)) {
        withoutTipo = invoice.substring(tipo.length);
      }
      const lastDashIndex = withoutTipo.lastIndexOf('-');
      fileName = lastDashIndex > 0 ? withoutTipo.substring(0, lastDashIndex) : withoutTipo;
      console.log('[DEBUG] Nombre de archivo extraído de la factura:', fileName);
    }

    if (!fileName) {
      console.error('[DEBUG] ERROR: No se pudo extraer el nombre del archivo de la referencia:', invoice);
      return NextResponse.json({
        x_cod_response: 2,
        x_response: 'Rechazada',
        x_response_reason_text: 'Referencia inválida'
      }, { status: 400 });
    }

    if (!user_id) {
      console.error('[DEBUG] ERROR: No se pudo extraer el user_id de la referencia (x_extra1). Factura:', invoice);
      return NextResponse.json({ message: "Confirmación recibida pero sin user_id en la factura." });
    }

    console.log(`[DEBUG] Consultando estado actual del acta "${fileName}" para el usuario "${user_id}"...`);
    const idEstadoProcesoActual = await getActaStatusByName(fileName, user_id);
    console.log('[DEBUG] Estado actual del proceso:', idEstadoProcesoActual);

    if (idEstadoProcesoActual && idEstadoProcesoActual >= 5) {
      console.log(`[DEBUG] Notificación para el acta "${fileName}" ignorada porque ya fue procesada. Estado actual: ${idEstadoProcesoActual}.`);
      return NextResponse.json({
        x_cod_response: 1,
        x_response: 'Aceptada',
        x_response_reason_text: 'Transacción ya procesada anteriormente.'
      });
    }
    
    console.log('[DEBUG] Respuesta de ePayco (x_response):', response);

    if (response === 'Aceptada' || response === '1') {
      console.log('[DEBUG] Procesando pago ACEPTADO.');

      let actaParaProcesar: ActaParaProcesar | null = null;

        try {
          actaParaProcesar = await getActaParaProcesarService(fileName, user_id);
          if (actaParaProcesar) {
            console.log('[DEBUG] Acta encontrada para procesar:', actaParaProcesar.nombre);
          } else {
            console.error(`[DEBUG] ERROR: No se encontró el acta "${fileName}" para el usuario "${user_id}" para iniciar el procesamiento.`);
          }
        } catch (error) {
          console.error('[DEBUG] Error al buscar el acta para procesar:', error);
        }

      try {
        console.log('[DEBUG] Actualizando proceso a estado 5 (aprobado)...');
        await actualizarEstadoProcesoService(fileName, user_id, 5);
        
        console.log('[DEBUG] Guardando datos de la transacción...');
        await guardarTransaccionService(
          fileName, 
          user_id, 
          transactionId, 
          parseFloat(amount), 
          invoice
        );

        console.log('[DEBUG] Proceso actualizado exitosamente para pago aceptado.');

        if (actaParaProcesar && actaParaProcesar.urlAssembly) {
          console.log('[DEBUG] Iniciando procesamiento del acta en background...');
          const folder = actaParaProcesar.nombre?.replace(/\.[^/.]+$/, "") || "";
          
          // No usamos await para que se ejecute en segundo plano
          processAction(
            folder,
            actaParaProcesar.nombre || '',
            actaParaProcesar.urlAssembly,
            actaParaProcesar.emailUsuario || '',
            actaParaProcesar.nombreUsuario || '',
            false,
            undefined, // codigoAtencion no aplica aquí
            user_id
          );
        }

      } catch (updateError: any) {

        console.error('[DEBUG] ERROR al actualizar acta después de pago aprobado:', updateError);
        console.error('[DEBUG] Detalles del error:', {
          fileName,
          transactionId,
          amount,
          invoice,
          error: updateError?.message || updateError
        });
      }

      console.log('[DEBUG] Enviando respuesta de éxito a ePayco.');
      return NextResponse.json({
        x_cod_response: 1,
        x_response: 'Aceptada',
        x_response_reason_text: 'Transacción aprobada'
      });
    } else {
      console.log('[DEBUG] Procesando pago RECHAZADO/PENDIENTE.');
      try {
        console.log('[DEBUG] Actualizando proceso a estado 9 (rechazado)...');
        // Usamos el nuevo servicio especializado, pasando el user_id
        await actualizarEstadoProcesoService(fileName, user_id, 9);
        console.log('[DEBUG] Proceso actualizado exitosamente para pago rechazado.');
      } catch (updateError: any) {
        console.error('[DEBUG] ERROR al actualizar acta después de pago rechazado:', updateError);
      }

      console.log('[DEBUG] Enviando respuesta de rechazo a ePayco.');
      return NextResponse.json({
        x_cod_response: 2,
        x_response: 'Rechazada',
        x_response_reason_text: 'Transacción rechazada'
      });
    }
  } catch (error) {
    console.error('[DEBUG] ERROR CRÍTICO en el endpoint de confirmación ePayco:', error);
    return NextResponse.json({
      x_cod_response: 2,
      x_response: 'Rechazada',
      x_response_reason_text: 'Error procesando confirmación'
    }, { status: 500 });
  } finally {
    console.log('--- [DEBUG] FIN CONFIRMACIÓN EPAYCO ---', new Date().toISOString());
  }
}

export async function GET(request: NextRequest) {
  console.log('[DEBUG] Se recibió una petición GET, se redirige a POST.');
  return POST(request);
}
