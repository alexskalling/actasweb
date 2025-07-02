'use server';

import { db } from "@/lib/db/db";
import { actaEstado } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

interface UpdateActaCompletaInput {
  user_id: string;
  file_name: string;
  transcription: string;
  url: string;
  nuevo_estatus_id: number;
}

export async function updateActaCompleta({
  user_id,
  file_name,
  transcription,
  url,
  nuevo_estatus_id,
}: UpdateActaCompletaInput) {
  try {
    const result = await db
      .update(actaEstado)
      .set({
        transcription,
        estatus_id: nuevo_estatus_id,
        url,
      })
      .where(
        and(
          eq(actaEstado.user_id, user_id),
          eq(actaEstado.file_name, file_name)
        )
      );

    console.log(` Acta actualizada.`);
  } catch (error) {
    console.error("❌ Error actualizando acta:", error);
    throw error;
  }
}
