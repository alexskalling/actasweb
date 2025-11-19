'use server';

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
  automation?: boolean | null,
  codigoAtencion?: string | null,
  automation_mail?: string | null,
  codigoReferido?: string | null,
) {
  try {
    let user_id;
    const mail = await getUserEmailFromSession();
    
    if (mail) {
      try {
        user_id = await getUserIdByEmail(mail);
        if (!user_id) {
          user_id = automation 
            ? '7ac85184-20a5-4a44-a8a3-bd1aaad138d5' 
            : 'a817fffe-bc7e-4e29-83f7-b512b039e817';
        }
      } catch (error) {
        user_id = automation 
          ? '7ac85184-20a5-4a44-a8a3-bd1aaad138d5' 
          : 'a817fffe-bc7e-4e29-83f7-b512b039e817';
      }
    } else {
      user_id = automation 
        ? '7ac85184-20a5-4a44-a8a3-bd1aaad138d5' 
        : 'a817fffe-bc7e-4e29-83f7-b512b039e817';
    }

    const existing = await db.select().from(actas).where(
      and(
        eq(actas.nombre, nombre),
        eq(actas.idUsuario, user_id)
      )
    );
    if (!existing || existing.length === 0) {
      return { status: 'error', message: `No existe un acta con ese nombre (${nombre}) para este usuario.` };
    }

    const updateFields: Record<string, string | number> = {};
    if (idEstadoProceso !== undefined && idEstadoProceso !== null) updateFields.idEstadoProceso = idEstadoProceso;
    if (duracion !== undefined && duracion !== null && duracion !== '') updateFields.duracion = duracion;
    if (costo !== undefined && costo !== null) updateFields.costo = costo.toString();
    if (tx !== undefined && tx !== null && tx !== '') updateFields.tx = tx;
    if (urlAssembly !== undefined && urlAssembly !== null && urlAssembly !== '') updateFields.urlAssembly = urlAssembly;
    if (referencia !== undefined && referencia !== null && referencia !== '') updateFields.referencia = referencia;
    
    if (urlTranscripcion !== undefined && urlTranscripcion !== null) {
      const urlTranscripcionTrim = String(urlTranscripcion).trim();
      if (urlTranscripcionTrim !== '') {
        updateFields.urlTranscripcion = urlTranscripcionTrim;
      }
    }
    
    if (urlborrador !== undefined && urlborrador !== null) {
      const urlborradorTrim = String(urlborrador).trim();
      if (urlborradorTrim !== '') {
        updateFields.urlBorrador = urlborradorTrim;
      }
    }
    
    if (codigoAtencion !== undefined) updateFields.codigoAtencion = codigoAtencion || null;
    if (codigoReferido !== undefined) updateFields.codigoReferido = codigoReferido ? codigoReferido.trim().toUpperCase() : null;

    if (Object.keys(updateFields).length === 0) {
      return { status: 'error', message: 'No se proporcionaron campos para actualizar.' };
    }

    await db.update(actas)
      .set(updateFields)
      .where(
        and(
          eq(actas.nombre, nombre),
          eq(actas.idUsuario, user_id)
        )
      );
    
    return { status: 'success', message: 'Acta actualizada correctamente.' };
  } catch (error) {
    console.error("Error al actualizar el acta:", error);
    throw error;
  }
}
