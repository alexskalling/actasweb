"use server";

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function BuscarAbiertoProceso(nombreActa: string) {
  try {
    const actaExistente = await db
      .select()
      .from(actas)
      .where(and(eq(actas.nombre, nombreActa)))
      .limit(1);

    if (actaExistente.length > 0) {
      const acta = actaExistente[0];
      return {
        existe: true,
        id: acta.id,
        nombre: acta.nombre,
        idEstadoProceso: acta.idEstadoProceso
          ? Number(acta.idEstadoProceso)
          : null,
        fechaProcesamiento: acta.fechaProcesamiento,
        idUsuario: acta.idUsuario,
        urlAssembly: acta.urlAssembly,
        duracion: acta.duracion,
        costo: acta.costo,
        tx: acta.tx,
        urlTranscripcion: acta.urlTranscripcion,
        urlBorrador: acta.urlBorrador,
      };
    }

    return null;
  } catch (error: unknown) {
    console.error("❌ Error al Buscar acta:", error);
    throw error;
  }
}
