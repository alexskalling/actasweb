"use server";

import { db } from "@/lib/db/db";
import { codigosAtencion } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function segundosAMinutos(segundos: number): number {
  return Math.ceil(segundos / 60);
}

export async function liberarReserva(
  codigoTexto: string,
  duracionSegundos: number,
): Promise<{ success: boolean; message?: string }> {
  try {
    const codigoFormateado = codigoTexto.trim().toLowerCase();

    if (!codigoFormateado) {
      return {
        success: false,
        message: "Código vacío",
      };
    }

    const minutosNecesarios = segundosAMinutos(duracionSegundos);

    const codigoActual = await db
      .select({
        id: codigosAtencion.id,
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

    const nuevaReserva = Math.max(0, codigoActual.reserva - minutosNecesarios);

    await db
      .update(codigosAtencion)
      .set({
        reserva: nuevaReserva,
      })
      .where(eq(codigosAtencion.id, codigoActual.id));

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error al liberar reserva:", error);
    return {
      success: false,
      message: "Error al liberar reserva",
    };
  }
}
