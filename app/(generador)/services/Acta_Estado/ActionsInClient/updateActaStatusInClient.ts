'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { updateEstatusActa } from "../updateActaStatus";


export async function actualizarEstatusDesdeCliente(
  file_name: string,
  nuevo_estatus_id: number
) {
  try {
    const email = await getUserEmailFromSession();
    const user_id = await getUserIdByEmail(email);

    await updateEstatusActa({
      user_id,
      file_name,
      nuevo_estatus_id,
    });

    console.log("✅ Estatus actualizado desde cliente");
  } catch (error) {
    console.error("❌ Error al actualizar estatus desde cliente:", error);
    throw error;
  }
}
