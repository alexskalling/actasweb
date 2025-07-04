'use server';

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

interface UpdateActaCompletaInput {
  user_id: string;            // UUID usuario
  file_name: string;          // nombre del acta
  urlTranscription: string;      // nueva transcripción
  urlBorrador: string;                // nueva URL del borrador
  nuevo_estatus_id: number;   // nuevo estado
}

export async function updateActaCompleta({
  user_id,
  file_name,
  urlTranscription,
  urlBorrador,
  nuevo_estatus_id,
}: UpdateActaCompletaInput) {
  try {
    const result = await db
      .update(actas)
      .set({
        urlTranscripcion: urlTranscription,
        idEstadoProceso: nuevo_estatus_id,
        urlBorrador: urlBorrador,
      })
      .where(
        and(
          eq(actas.idUsuario, user_id),
          eq(actas.nombre, file_name)
        )
      );

    console.log(`Acta actualizada.`);
    return result;
  } catch (error) {
    console.error("Error actualizando acta:", error);
    throw error;
  }
}
