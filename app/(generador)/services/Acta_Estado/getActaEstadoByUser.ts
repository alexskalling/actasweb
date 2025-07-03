'use server';

import { db } from "@/lib/db/db";
import { actaEstado } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";

export async function fetchActaByUserAndFile(email: string, file_name: string) {
  try {
    const user_id = await getUserIdByEmail(email);

    const result = await db
      .select()
      .from(actaEstado)
      .where(
        and(
          eq(actaEstado.user_id, user_id),
          eq(actaEstado.file_name, file_name)
        )
      )
      .limit(1);

    return result[0]; // Puede ser undefined si no hay coincidencias
  } catch (error) {
    console.error("❌ Error obteniendo acta:", error);
    throw error;
  }
}
