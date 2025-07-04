'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and, lt, gte } from "drizzle-orm";

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
    // 📨 obtener usuario
    const mail = await getUserEmailFromSession();
    const user_id =
      !mail
        ? 'a817fffe-bc7e-4e29-83f7-b512b039e817'
        : (await getUserIdByEmail(mail)) || 'a817fffe-bc7e-4e29-83f7-b512b039e817';

    const data = {
      idUsuario: user_id,
      idEstadoProceso,
      urlAssembly,
      nombre: nombreActa,
      duracion: duracion.toString(),
      costo: costo.toString(),
      tx,
      referencia,
      urlTranscripcion,
      urlBorrador: urlborrador,
    };

    // 🔎 buscar si ya existe con estado <4
    const actaAbierta = await db
      .select()
      .from(actas)
      .where(
        and(
          eq(actas.nombre, nombreActa),
          eq(actas.idUsuario, user_id),
          lt(actas.idEstadoProceso, 4)
        )
      )
      .limit(1);

    if (actaAbierta.length > 0) {
      // existe abierta → actualizar
      await db
        .update(actas)
        .set(data)
        .where(
          and(
            eq(actas.nombre, nombreActa),
            eq(actas.idUsuario, user_id),
            lt(actas.idEstadoProceso, 4)
          )
        );

      console.log("✅ Acta actualizada");
      return { status: 'success', message: 'Acta actualizada correctamente.' };
    }

    // 🔎 si no hay abierta, verificar si existe con estado >=4
    const actaCerrada = await db
      .select()
      .from(actas)
      .where(
        and(
          eq(actas.nombre, nombreActa),
          eq(actas.idUsuario, user_id),
          gte(actas.idEstadoProceso, 4)
        )
      )
      .limit(1);

    if (actaCerrada.length > 0) {
      console.log("Ya existe un acta con estado >=4 para este nombre y usuario.");
      throw new Error("DUPLICATE_ACTA");
    }

    // 📄 si no existe ninguna → crear
    await db.insert(actas).values(data);

    console.log("✅ Acta creada");
    return { status: 'success', message: 'Acta creada correctamente.' };

  } catch (error: any) {
    console.error("❌ Error al guardar el acta:", error);
    throw error;
  }
}
