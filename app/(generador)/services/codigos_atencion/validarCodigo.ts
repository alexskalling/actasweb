'use server';

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

/**
 * Convierte duración en segundos a minutos, redondeando siempre hacia arriba
 * Ejemplo: 661 segundos (11 min 1 seg) → 12 minutos
 */
function segundosAMinutos(segundos: number): number {
  return Math.ceil(segundos / 60);
}

/**
 * Valida un código de atención y verifica si tiene suficiente saldo
 * @param codigo - Código a validar (se formatea automáticamente)
 * @param duracionSegundos - Duración del acta en segundos
 * @returns Resultado de la validación con mensaje apropiado
 */
export async function validarCodigo(
  codigo: string,
  duracionSegundos: number
): Promise<ValidacionCodigoResult> {
  try {
    // Formatear código: minúsculas y sin espacios
    const codigoFormateado = codigo.trim().toLowerCase();
    
    if (!codigoFormateado) {
      return {
        valido: false,
        mensaje: "El código no puede estar vacío",
      };
    }

    // Buscar código en la base de datos (solo activos)
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
          eq(codigosAtencion.estado, true)
        )
      )
      .then((res) => res[0]);

    if (!codigoEncontrado) {
      return {
        valido: false,
        mensaje: "Código inválido",
      };
    }

    // Calcular minutos necesarios (redondeando hacia arriba)
    const minutosNecesarios = segundosAMinutos(duracionSegundos);

    // Verificar si hay suficiente saldo disponible
    // El saldo disponible es: saldo - reserva (lo que realmente está libre)
    // Ejemplo: saldo=100, reserva=67 → disponible=33
    // Si necesito 50 minutos, NO puedo generar porque 33 < 50
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

    // Código válido y con saldo suficiente
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

