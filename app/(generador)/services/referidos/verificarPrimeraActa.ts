'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, gte } from "drizzle-orm";

/**
 * Verifica si el usuario tiene actas pagadas (estado >= 6)
 * Retorna true si NO tiene actas pagadas (es primera acta), false si ya tiene actas pagadas
 */
export async function verificarPrimeraActa(): Promise<boolean> {
  try {
    const mail = await getUserEmailFromSession();
    if (!mail) {
      return false;
    }

    const user_id = await getUserIdByEmail(mail);
    if (!user_id) {
      return false;
    }

    // Obtener todas las actas del usuario con su estado
    const todasLasActas = await db
      .select({
        idEstadoProceso: actas.idEstadoProceso,
      })
      .from(actas)
      .where(eq(actas.idUsuario, user_id));

    // Verificar si hay alguna acta con estado >= 6 (pagadas/generadas/entregadas)
    const tieneActasPagadas = todasLasActas.some(
      (acta) => acta.idEstadoProceso !== null && Number(acta.idEstadoProceso) >= 6
    );

    // Retornar true si NO tiene actas pagadas (es primera acta)
    return !tieneActasPagadas;
  } catch (error) {
    console.error("Error al verificar primera acta:", error);
    return false;
  }
}

