'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { updateActaCompleta } from "../updateActaEstadoDownload";

export async function actualizarEstadoDesdeCliente(file_name: string, transcription: string, url: string) {
  try {
    const email = await getUserEmailFromSession();
    const user_id = await getUserIdByEmail(email);

    await updateActaCompleta({
      user_id,
      file_name,
      transcription,
      url,
      nuevo_estatus_id: 3, // "enviada"
    });

    console.log("✅ Estado actualizado desde cliente");
  } catch (error) {
    console.error("❌ Error actualizando acta desde cliente:", error);
    throw error;
  }
}
