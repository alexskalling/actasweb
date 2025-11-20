"use server";

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, gte } from "drizzle-orm";

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

    const todasLasActas = await db
      .select({
        idEstadoProceso: actas.idEstadoProceso,
      })
      .from(actas)
      .where(eq(actas.idUsuario, user_id));

    const tieneActasPagadas = todasLasActas.some(
      (acta: any) =>
        acta.idEstadoProceso !== null && Number(acta.idEstadoProceso) >= 6,
    );

    return !tieneActasPagadas;
  } catch (error) {
    console.error("Error al verificar primera acta:", error);
    return false;
  }
}
