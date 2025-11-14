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
 * Reserva minutos en el código de atención
 * Suma los minutos necesarios a la columna reserva
 * @param codigoId - ID del código de atención
 * @param duracionSegundos - Duración del acta en segundos
 * @returns true si se reservó correctamente, false en caso de error
 */
export async function reservarMinutos(
  codigoId: string,
  duracionSegundos: number
): Promise<{ success: boolean; message?: string }> {
  try {
    const minutosNecesarios = segundosAMinutos(duracionSegundos);

    // Obtener el código actual para verificar saldo disponible
    const codigoActual = await db
      .select({
        saldo: codigosAtencion.saldo,
        reserva: codigosAtencion.reserva,
      })
      .from(codigosAtencion)
      .where(eq(codigosAtencion.id, codigoId))
      .then((res) => res[0]);

    if (!codigoActual) {
      return {
        success: false,
        message: "Código no encontrado",
      };
    }

    // Verificar que aún hay saldo disponible
    const saldoDisponible = codigoActual.saldo + codigoActual.reserva;
    if (saldoDisponible < minutosNecesarios) {
      return {
        success: false,
        message: "Saldo insuficiente para reservar",
      };
    }

    // Sumar minutos a la reserva
    await db
      .update(codigosAtencion)
      .set({
        reserva: codigoActual.reserva + minutosNecesarios,
      })
      .where(eq(codigosAtencion.id, codigoId));

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error al reservar minutos:", error);
    return {
      success: false,
      message: "Error al reservar minutos",
    };
  }
}


