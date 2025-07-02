'use server';

import { db } from "@/lib/db/db";
import { actaEstado } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface UpdateEstatusInput {
  user_id: string;
  file_name: string;
  nuevo_estatus_id: number ; 
}

export async function updateEstatusActa({
  user_id,
  file_name,
  nuevo_estatus_id,
}: UpdateEstatusInput) {
  try {
    const result = await db
      .update(actaEstado)
      .set({ estatus_id: nuevo_estatus_id })
      .where(
        and(
          eq(actaEstado.user_id, user_id),
          eq(actaEstado.file_name, file_name)
        )
      );

    console.log(`Estado actualizado `);
  } catch (error) {
    console.error(" Error al actualizar estatus del acta:", error);
    throw error;
  }
}
