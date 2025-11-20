"use server";

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUserType(): Promise<string> {
  try {
    const mail = await getUserEmailFromSession();
    if (!mail) {
      return "cliente";
    }

    const user_id = await getUserIdByEmail(mail);
    if (!user_id) {
      return "cliente";
    }

    const usuario = await db
      .select({
        tipoUsuarioRol: usuarios.tipoUsuarioRol,
      })
      .from(usuarios)
      .where(eq(usuarios.id, user_id))
      .limit(1)
      .then((res) => res[0]);

    return usuario?.tipoUsuarioRol || "cliente";
  } catch (error) {
    console.error("Error al obtener tipo de usuario:", error);
    return "cliente";
  }
}
