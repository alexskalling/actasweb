"use server";

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function getActaStatusByName(fileName: string, userId: string): Promise<number | null> {
  if (!fileName || !userId) {
    console.error("[getActaStatusByName] El nombre del archivo o el ID de usuario no fue proporcionado.");
    return null;
  }

  try {
    const result = await db
      .select({ idEstadoProceso: actas.idEstadoProceso })
      .from(actas)
      .where(
        and(
          eq(actas.nombre, fileName),
          eq(actas.idUsuario, userId)
        )
      )
      .limit(1);

    return result[0]?.idEstadoProceso ?? null;
  } catch (error) {
    console.error("Error al buscar el estado del acta por nombre:", error);
    return null;
  }
}