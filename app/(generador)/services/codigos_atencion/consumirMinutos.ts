'use server';

import { db } from "@/lib/db/db";
import { codigosAtencion } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Convierte duración en segundos a minutos, redondeando siempre hacia arriba
 */
function segundosAMinutos(segundos: number): number {
  return Math.ceil(segundos / 60);
}

/**
 * Consume minutos del código de atención
 * Resta los minutos de la reserva y del saldo
 * Se llama cuando la transcripción se guarda exitosamente
 * @param codigoTexto - Código de atención usado (texto)
 * @param duracionSegundos - Duración del acta en segundos
 * @returns true si se consumió correctamente, false en caso de error
 */
export async function consumirMinutos(
  codigoTexto: string,
  duracionSegundos: number
): Promise<{ success: boolean; message?: string }> {
  try {
    // Formatear código
    const codigoFormateado = codigoTexto.trim().toLowerCase();
    
    if (!codigoFormateado) {
      return {
        success: false,
        message: "Código vacío",
      };
    }

    const minutosNecesarios = segundosAMinutos(duracionSegundos);

    // Buscar el código
    const codigoActual = await db
      .select({
        id: codigosAtencion.id,
        saldo: codigosAtencion.saldo,
        reserva: codigosAtencion.reserva,
      })
      .from(codigosAtencion)
      .where(eq(codigosAtencion.codigo, codigoFormateado))
      .then((res) => res[0]);

    if (!codigoActual) {
      return {
        success: false,
        message: "Código no encontrado",
      };
    }

    // Verificar que hay suficiente en reserva
    if (codigoActual.reserva < minutosNecesarios) {
      // Aún así intentar consumir lo que haya
    }

    // Restar de reserva y saldo
    const nuevaReserva = Math.max(0, codigoActual.reserva - minutosNecesarios);
    const nuevoSaldo = Math.max(0, codigoActual.saldo - minutosNecesarios);

    await db
      .update(codigosAtencion)
      .set({
        reserva: nuevaReserva,
        saldo: nuevoSaldo,
      })
      .where(eq(codigosAtencion.id, codigoActual.id));

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error al consumir minutos:", error);
    return {
      success: false,
      message: "Error al consumir minutos",
    };
  }
}


