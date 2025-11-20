"use server";

import { db } from "@/lib/db/db";
import { codigosAtencion } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function segundosAMinutos(segundos: number): number {
  return Math.ceil(segundos / 60);
}

export async function reservarMinutos(
  codigoId: string,
  duracionSegundos: number,
): Promise<{ success: boolean; message?: string }> {
  try {
    const minutosNecesarios = segundosAMinutos(duracionSegundos);

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

    const saldoDisponible = codigoActual.saldo + codigoActual.reserva;
    if (saldoDisponible < minutosNecesarios) {
      return {
        success: false,
        message: "Saldo insuficiente para reservar",
      };
    }

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
