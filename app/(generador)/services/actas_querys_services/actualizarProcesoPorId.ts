"use server";

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function ActualizarProcesoPorId(
  idActa: string,
  idEstadoProceso?: number,
  duracion?: string,
  costo?: number,
  tx?: string,
  urlAssembly?: string | null,
  referencia?: string,
  urlTranscripcion?: string | null,
  urlborrador?: string | null,
  urlContenido?: string | null,
  automation?: boolean | null,
  codigoAtencion?: string | null,
  automation_mail?: string | null,
  codigoReferido?: string | null,
  soporte?: string | null,
) {
  try {
    if (!idActa) {
      return { status: "error", message: "ID del acta es requerido" };
    }

    const existing = await db
      .select()
      .from(actas)
      .where(eq(actas.id, idActa))
      .limit(1);
    if (!existing || existing.length === 0) {
      return {
        status: "error",
        message: `No existe un acta con el ID ${idActa}`,
      };
    }

    const updateFields: Record<string, string | number | null> = {};
    if (idEstadoProceso !== undefined && idEstadoProceso !== null)
      updateFields.idEstadoProceso = idEstadoProceso;
    if (duracion !== undefined && duracion !== null && duracion !== "")
      updateFields.duracion = duracion;
    if (costo !== undefined && costo !== null)
      updateFields.costo = costo.toString();
    if (tx !== undefined && tx !== null && tx !== "") updateFields.tx = tx;
    if (urlAssembly !== undefined && urlAssembly !== null && urlAssembly !== "")
      updateFields.urlAssembly = urlAssembly;
    if (referencia !== undefined && referencia !== null && referencia !== "")
      updateFields.referencia = referencia;

    if (urlTranscripcion !== undefined && urlTranscripcion !== null) {
      const urlTranscripcionTrim = String(urlTranscripcion).trim();
      if (urlTranscripcionTrim !== "") {
        updateFields.urlTranscripcion = urlTranscripcionTrim;
      }
    }

    if (urlborrador !== undefined && urlborrador !== null) {
      const urlborradorTrim = String(urlborrador).trim();
      if (urlborradorTrim !== "") {
        updateFields.urlBorrador = urlborradorTrim;
      }
    }

    if (urlContenido !== undefined && urlContenido !== null) {
      const urlContenidoTrim = String(urlContenido).trim();
      if (urlContenidoTrim !== "") {
        updateFields.urlContenido = urlContenidoTrim;
      }
    }

    if (codigoAtencion !== undefined)
      updateFields.codigoAtencion = codigoAtencion;
    if (codigoReferido !== undefined)
      updateFields.codigoReferido = codigoReferido
        ? codigoReferido.trim().toUpperCase()
        : null;
    if (soporte !== undefined) updateFields.soporte = soporte;

    if (Object.keys(updateFields).length === 0) {
      return {
        status: "error",
        message: "No se proporcionaron campos para actualizar.",
      };
    }

    await db.update(actas).set(updateFields).where(eq(actas.id, idActa));

    return { status: "success", message: "Acta actualizada correctamente." };
  } catch (error) {
    console.error("Error al actualizar el acta por ID:", error);
    throw error;
  }
}
