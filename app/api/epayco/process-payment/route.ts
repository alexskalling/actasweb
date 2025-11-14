import { NextRequest, NextResponse } from 'next/server';
import { ActualizarProceso } from '@/app/(generador)/services/actas_querys_services/actualizarProceso';
import { processAction } from '@/app/(generador)/services/generacion_contenido_services/processAction';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options/authOptions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, folder, fileid, transactionId, amount, invoice, email, name } = body;

    if (!file) {
      return NextResponse.json({ error: 'Falta el nombre del archivo' }, { status: 400 });
    }

    // Obtener sesión del servidor para ActualizarProceso
    const session = await getServerSession(authOptions);
    
    // Actualizar estado del acta
    // Nota: ActualizarProceso usa getUserEmailFromSession internamente
    // Si no hay sesión, usará un usuario por defecto
    try {
      await ActualizarProceso(
        file,
        5, // Estado: Aprobado
        undefined,
        parseFloat(amount || "0"),
        transactionId || "",
        undefined,
        invoice || "",
        undefined, // NO actualizar urlTranscripcion - puede que ya esté guardada
        undefined, // NO actualizar urlborrador - puede que ya esté guardada
        null
      );
    } catch (error) {
      console.error('Error al actualizar acta:', error);
      // Continuar de todas formas para intentar procesar
    }

    // Iniciar procesamiento del acta si tenemos los datos necesarios
    if (folder && fileid) {
      try {
        const result = await processAction(folder, file, fileid, email || '', name || '');
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

