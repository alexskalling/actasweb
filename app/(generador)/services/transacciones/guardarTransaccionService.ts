"use server";

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function guardarTransaccionService(
  nombre: string,
  tx?: string,
  idUsuarioActa?: string | null
) {
  try {
    let user_id_acta: string | undefined;
    if (idUsuarioActa) {
      user_id_acta = idUsuarioActa;
    } else {
      const mail = await getUserEmailFromSession();

      if (mail) {
        user_id_acta = await getUserIdByEmail(mail);
      } else {
        return {
          status: "error",
          message: "No se pudo obtener el correo del usuario de la sesión.",
        };
      }
    }

    const existing = await db
      .select()
      .from(actas)
      .where(and(eq(actas.nombre, nombre), eq(actas.idUsuario, user_id_acta)));
    if (!existing || existing.length === 0) {
      return {
        status: "error",
        message: `No existe un acta con ese nombre (${nombre}) para este usuario.`,
      };
    }

    const updateFields: Record<string, string | number | null> = {};

    if (tx !== undefined && tx !== null && tx !== "") updateFields.tx = tx;

    if (Object.keys(updateFields).length === 0) {
      return {
        status: "error",
        message: "No se proporcionó transaccion para actualizar.",
      };
    }

    await db
      .update(actas)
      .set(updateFields)
      .where(and(eq(actas.nombre, nombre), eq(actas.idUsuario, user_id_acta)));

    return { status: "success", message: "Acta actualizada correctamente." };
  } catch (error) {
    console.error("Error al actualizar el acta:", error);
    throw error;
  }
}
