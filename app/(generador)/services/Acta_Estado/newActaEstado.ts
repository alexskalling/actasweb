'use server';

import { db } from "@/lib/db/db";
import { actaEstado } from "@/lib/db/schema";

interface NewActaEstadoInput {
  user_id: string;
  transcription: string | null;
  url: string | null | undefined;
  file_name: string;
}

export async function newActaEstado({
  user_id,
  url,
  transcription,
  file_name,
}: NewActaEstadoInput) {
  try {
    await db.insert(actaEstado).values({
      user_id,
      estatus_id: 1, // Estado "pendiente de pago"
      transcription,
      url,
      file_name,
    });
  } catch (error) {
    console.error("❌ Error al crear estado del acta:", error);
    throw error;
  }
}
