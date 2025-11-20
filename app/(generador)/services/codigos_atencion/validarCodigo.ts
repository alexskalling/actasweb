"use server";

import { db } from "@/lib/db/db";
import { codigosAtencion } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export interface ValidacionCodigoResult {
  valido: boolean;
  mensaje: string;
  codigo?: {
    id: string;
    codigo: string;
    saldo: number;
    reserva: number;
  };
  minutosNecesarios?: number;
}

function segundosAMinutos(segundos: number): number {
  return Math.ceil(segundos / 60);
}

export async function validarCodigo(
  codigo: string,
  duracionSegundos: number,
): Promise<ValidacionCodigoResult> {
  try {
    const codigoFormateado = codigo.trim().toLowerCase();

    if (!codigoFormateado) {
      return {
        valido: false,
        mensaje: "El código no puede estar vacío",
      };
    }

    const codigoEncontrado = await db
      .select({
        id: codigosAtencion.id,
        codigo: codigosAtencion.codigo,
        saldo: codigosAtencion.saldo,
        reserva: codigosAtencion.reserva,
        estado: codigosAtencion.estado,
      })
      .from(codigosAtencion)
      .where(
        and(
          eq(codigosAtencion.codigo, codigoFormateado),
          eq(codigosAtencion.estado, true),
        ),
      )
      .then((res) => res[0]);

    if (!codigoEncontrado) {
      return {
        valido: false,
        mensaje: "Código inválido",
      };
    }

    const minutosNecesarios = segundosAMinutos(duracionSegundos);

    const saldoDisponible = codigoEncontrado.saldo - codigoEncontrado.reserva;

    if (saldoDisponible < minutosNecesarios) {
      return {
        valido: false,
        mensaje: "Saldo insuficiente",
        codigo: {
          id: codigoEncontrado.id,
          codigo: codigoEncontrado.codigo,
          saldo: codigoEncontrado.saldo,
          reserva: codigoEncontrado.reserva,
        },
        minutosNecesarios,
      };
    }

    return {
      valido: true,
      mensaje: "Código válido",
      codigo: {
        id: codigoEncontrado.id,
        codigo: codigoEncontrado.codigo,
        saldo: codigoEncontrado.saldo,
        reserva: codigoEncontrado.reserva,
      },
      minutosNecesarios,
    };
  } catch (error) {
    console.error("Error al validar código:", error);
    return {
      valido: false,
      mensaje: "Error al validar el código. Por favor, intenta nuevamente.",
    };
  }
}
