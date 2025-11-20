"use server";

import { db } from "@/lib/db/db";
import { actas, usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUsuarioDeActa(idActa: string) {
  try {
    const actaConUsuario = await db
      .select({
        nombreUsuario: usuarios.nombre,
        emailUsuario: usuarios.email,
      })
      .from(actas)
      .leftJoin(usuarios, eq(actas.idUsuario, usuarios.id))
      .where(eq(actas.id, idActa))
      .limit(1)
      .then((res) => res[0]);

    if (!actaConUsuario) {
      return {
        status: "error",
        message: "Acta no encontrada",
        nombreUsuario: null,
        emailUsuario: null,
      };
    }

    return {
      status: "success",
      nombreUsuario: actaConUsuario.nombreUsuario || "Usuario",
      emailUsuario: actaConUsuario.emailUsuario || null,
    };
  } catch (error) {
    console.error("Error al obtener usuario del acta:", error);
    return {
      status: "error",
      message: "Error al obtener datos del usuario",
      nombreUsuario: null,
      emailUsuario: null,
    };
  }
}
