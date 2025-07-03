'use server';

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";

export async function fetchActaByUserAndFile(email: string, file_name: string) {
  try {
    const user_id = await getUserIdByEmail(email);

    const result = await db
      .select()
      .from(actas)
      .where(
        and(
          eq(actas.idUsuario, user_id),
          eq(actas.nombre, file_name)
        )
      )
      .limit(1);

    return result[0]; // puede ser undefined si no hay coincidencias
  } catch (error) {
    console.error("❌ Error obteniendo acta:", error);
    throw error;
  }
}
