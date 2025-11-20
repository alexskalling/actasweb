"use server";

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { usuarios, actas } from "@/lib/db/schema";
import { eq, and, gte, isNotNull } from "drizzle-orm";

export async function contarReferidos(): Promise<number> {
  try {
    const mail = await getUserEmailFromSession();
    if (!mail) {
      return 0;
    }

    const user_id = await getUserIdByEmail(mail);
    if (!user_id) {
      return 0;
    }

    const usuario = await db
      .select({
        codigoReferido: usuarios.codigoReferido,
      })
      .from(usuarios)
      .where(eq(usuarios.id, user_id))
      .limit(1)
      .then((res) => res[0]);

    if (!usuario || !usuario.codigoReferido) {
      return 0;
    }

    const actasConCodigo = await db
      .select({
        id: actas.id,
      })
      .from(actas)
      .where(
        and(
          eq(actas.codigoReferido, usuario.codigoReferido),
          isNotNull(actas.idEstadoProceso),
          gte(actas.idEstadoProceso, 6),
        ),
      );

    return actasConCodigo.length;
  } catch (error) {
    console.error("Error al contar referidos:", error);
    return 0;
  }
}
