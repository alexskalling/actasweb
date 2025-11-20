"use server";

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
  urlContenido: string | null | undefined,
  Industria: number | null | undefined,
  automation_mail: string | null | undefined,
  codigoAtencion?: string | null | undefined,
  codigoReferido?: string | null | undefined,
  soporte?: string | null | undefined,
  idUsuarioSoporte?: string | null | undefined,
) {
  try {
    let user_id: string;

    if (soporte) {
      if (!idUsuarioSoporte) {
        throw new Error(
          "Error: Para actas de soporte se requiere el ID del usuario seleccionado.",
        );
      }
      user_id = idUsuarioSoporte;
    } else if (idUsuarioSoporte) {
      user_id = idUsuarioSoporte;
    } else {
      const hasMail = automation_mail?.trim() !== "";
      const mail = hasMail ? automation_mail : await getUserEmailFromSession();
      user_id = !mail
        ? "a817fffe-bc7e-4e29-83f7-b512b039e817"
        : (await getUserIdByEmail(mail)) ||
          "a817fffe-bc7e-4e29-83f7-b512b039e817";
    }

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
      urlContenido: urlContenido || null,
      idIndustria: Industria,
      codigoAtencion: codigoAtencion || null,
      codigoReferido: codigoReferido
        ? codigoReferido.trim().toUpperCase()
        : null,
      soporte: soporte || null,
    };

    const actaAbierta = await db
      .select()
      .from(actas)
      .where(
        and(
          eq(actas.nombre, nombreActa),
          eq(actas.idUsuario, user_id),
          lt(actas.idEstadoProceso, 6),
        ),
      )
      .limit(1);

    if (actaAbierta.length > 0) {
      await db
        .update(actas)
        .set(data)
        .where(and(eq(actas.nombre, nombreActa), eq(actas.idUsuario, user_id)));

      return { status: "success", message: "Acta actualizada correctamente." };
    }

    const actaCerrada = await db
      .select()
      .from(actas)
      .where(
        and(
          eq(actas.nombre, nombreActa),
          eq(actas.idUsuario, user_id),
          gte(actas.idEstadoProceso, 6),
        ),
      )
      .limit(1);

    if (actaCerrada.length > 0) {
      throw new Error("DUPLICATE_ACTA");
    }

    await db.insert(actas).values(data);

    return { status: "success", message: "Acta creada correctamente." };
  } catch (error: unknown) {
    console.error("❌ Error al guardar el acta:", error);
    throw error;
  }
}
