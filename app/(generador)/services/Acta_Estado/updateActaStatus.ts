'use server';

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface UpdateEstatusInput {
  user_id: string;         // UUID del usuario
  file_name: string;       // nombre del acta
  nuevo_estatus_id: number; // nuevo id de estado_proceso
}

export async function updateEstatusActa({
  user_id,
  file_name,
  nuevo_estatus_id,
}: UpdateEstatusInput) {
  try {
    const result = await db
      .update(actas)
      .set({ idEstadoProceso: nuevo_estatus_id })
      .where(
        and(
          eq(actas.idUsuario, user_id),
          eq(actas.nombre, file_name)
        )
      );

    console.log(`Estado actualizado`);
    return result;
  } catch (error) {
    console.error("Error al actualizar estatus del acta:", error);
    throw error;
  }
}
