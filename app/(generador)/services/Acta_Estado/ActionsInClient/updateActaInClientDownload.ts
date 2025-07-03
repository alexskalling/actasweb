'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { updateActaCompleta } from "../updateActaEstadoDownload";

export async function actualizarEstadoDesdeCliente(file_name: string, urlTranscription: string | undefined, urlBorrador: string | undefined) {
  try {
    const email = await getUserEmailFromSession();
    const user_id = await getUserIdByEmail(email);
    if (urlTranscription && urlBorrador) {
      await updateActaCompleta({
        user_id,
        file_name,
        urlTranscription,
        urlBorrador,
        nuevo_estatus_id: 3,
      });
      console.log(" Estado actualizado desde cliente");
    }else{
      console.error(" Error actualizando acta desde cliente: url or transcription is undefined");
    }


    
  } catch (error) {
    console.error(" Error actualizando acta desde cliente:", error);
    throw error;
  }
}
