import { NextRequest, NextResponse } from 'next/server';
import { ActualizarProceso } from '@/app/(generador)/services/actas_querys_services/actualizarProceso';
import { processAction } from '@/app/(generador)/services/generacion_contenido_services/processAction';
import { getUserIdByEmail } from '@/lib/auth/session/getIdOfEmail';
import { getReferralCodeByActaName } from '../../../(generador)/services/referidos/getReferralCodeByActaName';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, folder, fileid, transactionId, amount, invoice, email, name } = body;

    if (!file) {
      return NextResponse.json({ error: 'Falta el nombre del archivo' }, { status: 400 });
    }

    let userId;
    if (email) {
      userId = await getUserIdByEmail(email);
    }

    if (!userId) {
      console.error('No se pudo encontrar el ID de usuario para el email:', email);
    }

    try {
      const codigoReferidoExistente = await getReferralCodeByActaName(file, userId!);

      await ActualizarProceso(
        file,
        5,
        undefined,
        parseFloat(amount || "0"),
        transactionId || "",
        fileid,
        invoice || "",
        undefined,
        undefined,
        null,
        false,
        undefined,
        email,
        codigoReferidoExistente || undefined,
        undefined, // soporte
        userId,
      );
    } catch (error) {
      console.error('Error al actualizar acta:', error);

    }

    if (folder && fileid) {
      try {
        const result = await processAction(folder, file, fileid, email || '', name || '', false, undefined, userId);
        return NextResponse.json({
          success: true,
          message: 'Pago procesado y acta en proceso',
          result
        });
      } catch (error) {
        console.error('Error al procesar acta:', error);
        return NextResponse.json({
          success: true,
          message: 'Pago procesado pero error al iniciar generación',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pago procesado correctamente'
    });

  } catch (error) {
    console.error('Error en process-payment:', error);
    return NextResponse.json({
      error: 'Error al procesar pago',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
