import { NextRequest, NextResponse } from 'next/server';
import { ActualizarProceso } from '@/app/(generador)/services/actas_querys_services/actualizarProceso';

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
    
    console.log('Confirmación de ePayco recibida:', {
      refPayco,
      transactionId,
      amount,
      response,
      invoice
    });

    // TODO: Validar la firma de ePayco aquí para seguridad
    // const isValid = validarFirmaEpayco(/* parámetros */);
    // if (!isValid) {
    //   return NextResponse.json({ 
    //     x_cod_response: 2,
    //     x_response: 'Rechazada',
    //     x_response_reason_text: 'Firma inválida'
    //   }, { status: 400 });
    // }
    
    // Extraer el nombre del archivo de la referencia (invoice)
    // Formato: tipo + file + "-" + random
    // Ejemplo: "actaarchivo-12345"
    let fileName = "";
    if (invoice) {
      // Remover el prefijo (tipo) y el número aleatorio
      // Asumimos que el formato es: tipo + nombreArchivo + "-" + random
      const match = invoice.match(/^[^-]+(.+?)-/);
      if (match && match[1]) {
        fileName = match[1];
      } else {
        // Si no coincide el patrón, intentar extraer de otra forma
        const parts = invoice.split('-');
        if (parts.length >= 2) {
          // Tomar todo excepto el último (que es el random)
          fileName = parts.slice(0, -1).join('-');
          // Remover el prefijo tipo si existe
          const tipo = process.env.NEXT_PUBLIC_PAGO || "";
          if (fileName.startsWith(tipo)) {
            fileName = fileName.substring(tipo.length);
          }
        }
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
      // Pago aprobado
      await ActualizarProceso(
        fileName,
        5, // Estado: Aprobado
        undefined,
        parseFloat(amount),
        transactionId,
        undefined,
        invoice,
        null,
        null,
        null
      );

      console.log('Pago confirmado y acta actualizada:', fileName);
      
      return NextResponse.json({ 
        x_cod_response: 1,
        x_response: 'Aceptada',
        x_response_reason_text: 'Transacción aprobada'
      });
    } else {
      // Pago rechazado
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

      console.log('Pago rechazado, acta actualizada:', fileName);
      
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

