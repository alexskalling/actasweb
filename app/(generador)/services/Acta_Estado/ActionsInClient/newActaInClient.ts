'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { newActa } from "../newActaEstado";


export async function crearActaDesdeCliente(
  file_name: string,
  urlAssembly: string | null | undefined
) {
  try {
    const mail = await getUserEmailFromSession();
    const user_id = await getUserIdByEmail(mail);

    await newActa({
      user_id,
      file_name,
      urlAssembly,
    });

    console.log("✅ Acta creada desde cliente");
  } catch (error) {
    console.error("❌ Error al crear el acta desde cliente:", error);
    throw error;
  }
}
