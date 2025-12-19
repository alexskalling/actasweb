"use server";

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function actualizarEstadoProcesoService(
  nombreActa: string,
  idUsuario: string,
  idEstadoProceso: number
) {
  try {
    if (!nombreActa || !idUsuario || idEstadoProceso === undefined) {
      throw new Error("Parámetros inválidos para actualizar el estado del proceso.");
    }

    const updated = await db
      .update(actas)
      .set({ idEstadoProceso })
      .where(and(eq(actas.nombre, nombreActa), eq(actas.idUsuario, idUsuario)));

    if (updated.length === 0) {
      console.warn(`[WARN] No se encontró el acta "${nombreActa}" para el usuario "${idUsuario}" al intentar actualizar el estado a ${idEstadoProceso}.`);
      return { status: "warn", message: "No se encontró el acta para actualizar." };
    }

    return { status: "success", message: "Estado del proceso actualizado correctamente." };
  } catch (error) {
    console.error("Error al actualizar el estado del proceso:", error);
    throw new Error("No se pudo actualizar el estado del proceso.");
  }
}