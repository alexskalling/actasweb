'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { usuarios, actas } from "@/lib/db/schema";
import { eq, and, gte, isNotNull } from "drizzle-orm";

/**
 * Cuenta cuántas actas tienen el código de referido del usuario actual
 * @returns Número de referidos (actas que usaron el código del usuario)
 */
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

    // Obtener el código de referido del usuario actual
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

    // Contar solo actas pagadas (estado >= 6) que usaron este código de referido
    const actasConCodigo = await db
      .select({
        id: actas.id,
      })
      .from(actas)
      .where(
        and(
          eq(actas.codigoReferido, usuario.codigoReferido),
          isNotNull(actas.idEstadoProceso),
          gte(actas.idEstadoProceso, 6) // Solo actas pagadas (estado >= 6)
        )
      );

    return actasConCodigo.length;
  } catch (error) {
    console.error("Error al contar referidos:", error);
    return 0;
  }
}

