'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and, lt, gte } from "drizzle-orm";

export async function BuscarAbiertoProceso(nombreActa: string) {
  try {
    const mail = await getUserEmailFromSession();
    const user_id = !mail
      ? 'a817fffe-bc7e-4e29-83f7-b512b039e817'
      : (await getUserIdByEmail(mail)) || 'a817fffe-bc7e-4e29-83f7-b512b039e817';

    const actaAbierta = await db
      .select()
      .from(actas)
      .where(
        and(
          eq(actas.nombre, nombreActa),
          eq(actas.idUsuario, user_id),
          lt(actas.idEstadoProceso, 6)

        )
      )
      .limit(1);

    if (actaAbierta.length > 0) {
      // existe abierta → actualizar
     return false;
    }

    // 🔎 si no hay abierta, verificar si existe con estado >=5
    const actaCerrada = await db
      .select()
      .from(actas)
      .where(
        and(
          eq(actas.nombre, nombreActa),
          eq(actas.idUsuario, user_id),
          gte(actas.idEstadoProceso, 6)

        )
      )
      .limit(1);

    if (actaCerrada.length > 0) {

      return true;
    }
    return false;

  } catch (error: unknown) {
    console.error("❌ Error al Buscar acta:", error);
    throw error;
  }
}
