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
) {
  try {
    const mail = await getUserEmailFromSession();
    let user_id;
    if(!automation){
      if (!mail) {
      user_id = 'a817fffe-bc7e-4e29-83f7-b512b039e817';
    } else {
      user_id = await getUserIdByEmail(mail);
      if (!user_id) {
        user_id = 'a817fffe-bc7e-4e29-83f7-b512b039e817';
      }
    }
    }else{
      user_id = "7ac85184-20a5-4a44-a8a3-bd1aaad138d5"
    }
    

    // Buscar el acta por nombre y usuario
    const existing = await db.select().from(actas).where(
      and(
        eq(actas.nombre, nombre),
        eq(actas.idUsuario, user_id)
      )
    );
    if (!existing || existing.length === 0) {
      return { status: 'error', message: 'No existe un acta con ese nombre para este usuario.' };
    }

    // Construir solo los campos a actualizar
    const updateFields: Record<string, string | number> = {};
    if (idEstadoProceso !== undefined && idEstadoProceso !== null) updateFields.idEstadoProceso = idEstadoProceso;
    if (duracion !== undefined && duracion !== null && duracion !== '') updateFields.duracion = duracion;
    if (costo !== undefined && costo !== null) updateFields.costo = costo.toString();
    if (tx !== undefined && tx !== null && tx !== '') updateFields.tx = tx;
    if (urlAssembly !== undefined && urlAssembly !== null && urlAssembly !== '') updateFields.urlAssembly = urlAssembly;
    if (referencia !== undefined && referencia !== null && referencia !== '') updateFields.referencia = referencia;
    if (urlTranscripcion !== undefined && urlTranscripcion !== null && urlTranscripcion !== '') updateFields.urlTranscripcion = urlTranscripcion;
    if (urlborrador !== undefined && urlborrador !== null && urlborrador !== '') updateFields.urlBorrador = urlborrador;

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

    console.log("✅ Acta actualizada desde cliente");
    return { status: 'success', message: 'Acta actualizada correctamente.' };
  } catch (error) {
    console.error("❌ Error al actualizar el acta desde cliente:", error);
    throw error;
  }
}