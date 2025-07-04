'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GuardarNuevoProceso(
    nombreActa: string,
    idEstadoProceso: number,
    duracion: number | string,
    costo: number | string,
    tx: string,
    urlAssembly: string | null | undefined,
    referencia: string,
    urlTranscripcion: string | null | undefined,
    urlborrador: string | null | undefined,
) {
  try {
    const mail = await getUserEmailFromSession();
    let user_id;
    if (!mail) {
      user_id = 'a817fffe-bc7e-4e29-83f7-b512b039e817';
    } else {
      user_id = await getUserIdByEmail(mail);
      if (!user_id) {
        user_id = 'a817fffe-bc7e-4e29-83f7-b512b039e817';
      }
    }

    // Verificar si ya existe un acta con el mismo nombre y user_id
    const existing = await db.select().from(actas).where(
      and(
        eq(actas.nombre, nombreActa),
        eq(actas.idUsuario, user_id)
      )
    );
    if (existing && existing.length > 0) {
      return { status: 'error', message: 'Ya existe un acta con ese nombre para este usuario.' };
    }

    await db.insert(actas).values({
        idUsuario: user_id,
        idEstadoProceso: idEstadoProceso,
        urlAssembly: urlAssembly,
        nombre: nombreActa,
        duracion: duracion.toString(),
        costo: costo.toString(),
        tx: tx,
        referencia: referencia,
        urlTranscripcion: urlTranscripcion,
        urlBorrador: urlborrador,
      });

    console.log("✅ Acta creada desde cliente");
    return { status: 'success', message: 'Acta creada correctamente.' };
  } catch (error) {
    console.error("❌ Error al crear el acta desde cliente:", error);
    throw error;
  }
}