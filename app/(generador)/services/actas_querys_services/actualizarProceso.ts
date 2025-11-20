"use server";

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function ActualizarProceso(
  nombre: string,
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
  idUsuarioActa?: string | null,
) {
  try {
    let user_id_acta: string;
    if (idUsuarioActa) {
      user_id_acta = idUsuarioActa;
    } else if (automation_mail && automation_mail.trim() !== "") {
      try {
        user_id_acta = await getUserIdByEmail(automation_mail);
        if (!user_id_acta) {
          user_id_acta = "7ac85184-20a5-4a44-a8a3-bd1aaad138d5";
        }
      } catch (error) {
        user_id_acta = "7ac85184-20a5-4a44-a8a3-bd1aaad138d5";
      }
    } else {
      let user_id;
      const mail = await getUserEmailFromSession();

      if (mail) {
        try {
          user_id = await getUserIdByEmail(mail);
          if (!user_id) {
            user_id = automation
              ? "7ac85184-20a5-4a44-a8a3-bd1aaad138d5"
              : "a817fffe-bc7e-4e29-83f7-b512b039e817";
          }
        } catch (error) {
          user_id = automation
            ? "7ac85184-20a5-4a44-a8a3-bd1aaad138d5"
            : "a817fffe-bc7e-4e29-83f7-b512b039e817";
        }
      } else {
        user_id = automation
          ? "7ac85184-20a5-4a44-a8a3-bd1aaad138d5"
          : "a817fffe-bc7e-4e29-83f7-b512b039e817";
      }
      user_id_acta = user_id;
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
