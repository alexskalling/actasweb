"use server";

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function guardarTransaccionService(
  nombreActa: string,
  idUsuario: string,
  tx: string,
  costo: number,
  referencia: string,
) {
  try {
    if (!nombreActa || !idUsuario || !tx) {
      throw new Error("Parámetros inválidos para guardar la transacción.");
    }

    const updated = await db
      .update(actas)
      .set({ 
        tx: tx,
        costo: costo.toString(),
        referencia: referencia,
       })
      .where(and(eq(actas.nombre, nombreActa), eq(actas.idUsuario, idUsuario)));

    if (updated.length === 0) {
      console.warn(`[WARN] No se encontró el acta "${nombreActa}" para el usuario "${idUsuario}" al intentar guardar la transacción.`);
      return { status: "warn", message: "No se encontró el acta para guardar la transacción." };
    }

    return { status: "success", message: "Transacción guardada correctamente." };
  } catch (error) {
    console.error("Error al guardar la transacción:", error);
    throw new Error("No se pudo guardar la transacción.");
  }
}