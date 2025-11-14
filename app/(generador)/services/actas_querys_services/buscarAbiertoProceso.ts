'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Busca si existe un acta con el nombre dado (sin importar el estado)
 * Retorna true si existe (duplicado), false si no existe
 */
export async function BuscarAbiertoProceso(nombreActa: string) {
  try {
    const mail = await getUserEmailFromSession();
    const user_id = !mail
      ? 'a817fffe-bc7e-4e29-83f7-b512b039e817'
      : (await getUserIdByEmail(mail)) || 'a817fffe-bc7e-4e29-83f7-b512b039e817';

    // Buscar si existe CUALQUIER acta con ese nombre (abierta o cerrada)
    const actaExistente = await db
      .select()
      .from(actas)
      .where(
        and(
          eq(actas.nombre, nombreActa),
          eq(actas.idUsuario, user_id)
        )
      )
      .limit(1);

    // Si existe, retornar true (es duplicado)
    if (actaExistente.length > 0) {
      return true;
    }

    // No existe, retornar false (no es duplicado)
    return false;

  } catch (error: unknown) {
    console.error("❌ Error al Buscar acta:", error);
    throw error;
  }
}
