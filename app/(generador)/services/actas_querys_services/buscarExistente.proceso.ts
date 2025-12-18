"use server";

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function BuscarExistenteProceso(nombreActa: string) {
  try {
    const actaEncontrada = await db
      .select()
      .from(actas)
      .where(and(eq(actas.nombre, nombreActa)))
      .limit(1);

    if (actaEncontrada.length > 0) {
      throw new Error("DUPLICATE_ACTA");
    }

    return {
      status: "success",
      message: "Acta no encontrada, se puede crear.",
    };
  } catch (error) {
    console.error("❌ Error al buscar acta:", error);
    throw error;
  }
}
