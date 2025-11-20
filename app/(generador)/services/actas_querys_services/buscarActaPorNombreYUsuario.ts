"use server";

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function buscarActaPorNombreYUsuario(
  nombreActa: string,
  idUsuario: string,
): Promise<{
  status: "success" | "error";
  idActa?: string;
  message?: string;
}> {
  try {
    if (!nombreActa || !idUsuario) {
      return {
        status: "error",
        message: "Nombre del acta e ID de usuario son requeridos",
      };
    }

    const actaEncontrada = await db
      .select({
        id: actas.id,
        nombre: actas.nombre,
        idEstadoProceso: actas.idEstadoProceso,
        idUsuario: actas.idUsuario,
      })
      .from(actas)
      .where(and(eq(actas.nombre, nombreActa), eq(actas.idUsuario, idUsuario)))
      .limit(1)
      .then((res) => res[0]);

    if (!actaEncontrada) {
      return {
        status: "error",
        message: "El usuario no tiene un acta con ese nombre",
      };
    }

    const estado = actaEncontrada.idEstadoProceso;
    if (!estado || estado <= 4) {
      return {
        status: "error",
        message: "El acta anterior nunca fue pagado",
      };
    }

    return {
      status: "success",
      idActa: actaEncontrada.id,
    };
  } catch (error) {
    console.error("Error al buscar acta por nombre y usuario:", error);
    return {
      status: "error",
      message: "Error al buscar el acta. Por favor, intenta nuevamente.",
    };
  }
}
