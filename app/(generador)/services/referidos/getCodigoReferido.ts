'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Obtiene el código de referido del usuario actual
 * @returns Código de referido o null si no existe
 */
export async function getCodigoReferido(): Promise<string | null> {
  try {
    const mail = await getUserEmailFromSession();
    if (!mail) {
      return null;
    }

    const user_id = await getUserIdByEmail(mail);
    if (!user_id) {
      return null;
    }

    const usuario = await db
      .select({
        codigoReferido: usuarios.codigoReferido,
      })
      .from(usuarios)
      .where(eq(usuarios.id, user_id))
      .limit(1)
      .then((res) => res[0]);

    return usuario?.codigoReferido || null;
  } catch (error) {
    console.error("Error al obtener código de referido:", error);
    return null;
  }
}


