"use server";

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";


export async function getReferralCodeByActaName(fileName: string, userId: string): Promise<string | null> {
  if (!fileName || !userId) {
    console.error("[getReferralCodeByActaName] El nombre del archivo o el ID de usuario no fueron proporcionados.");
    return null;
  }

  try {
    const actaExistente = await db
      .select({
        codigoReferido: actas.codigoReferido,
      })
      .from(actas)
      .where(and(eq(actas.nombre, fileName), eq(actas.idUsuario, userId)))
      .limit(1)
      .then((res) => res[0]);

    return actaExistente?.codigoReferido || null;
  } catch (error) {
    console.error("Error al buscar el código de referido por nombre de acta:", error);
    return null;
  }
}