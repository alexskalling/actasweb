"use server";

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function BuscarExistenteProceso(
  nombreActa: string,
  automation_mail?: string,
) {
  try {
    const hasMail = automation_mail?.trim() !== "";
    const mail = hasMail ? automation_mail : await getUserEmailFromSession();
    const user_id = !mail
      ? "7ac85184-20a5-4a44-a8a3-bd1aaad138d5"
      : (await getUserIdByEmail(mail)) ||
        "7ac85184-20a5-4a44-a8a3-bd1aaad138d5";

    const actaEncontrada = await db
      .select()
      .from(actas)
      .where(and(eq(actas.nombre, nombreActa), eq(actas.idUsuario, user_id)))
      .limit(1);

    if (actaEncontrada.length > 0) {
      throw new Error("DUPLICATE_ACTA");
    }

    return {
      status: "success",
      message: "Acta no encontrada, se puede crear.",
    };
  } catch (error) {
    console.error("❌ Error al buscar acta:", error);
    throw error;
  }
}
