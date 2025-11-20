"use server";

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas, DetalleError, fallosActa } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface GuardarFalloPagoInput {
  nombreActa: string;
  detalleFallo: DetalleError;
  automation?: boolean | null;
}

export async function guardarFalloPagoService({
  nombreActa,
  detalleFallo,
  automation,
}: GuardarFalloPagoInput) {
  try {
    const mail = await getUserEmailFromSession();
    let user_id;
    if (!automation) {
      if (!mail) {
        user_id = "a817fffe-bc7e-4e29-83f7-b512b039e817";
      } else {
        user_id = await getUserIdByEmail(mail);
        if (!user_id) {
          user_id = "a817fffe-bc7e-4e29-83f7-b512b039e817";
        }
      }
    } else {
      user_id = "7ac85184-20a5-4a44-a8a3-bd1aaad138d5";
    }

    const existing = await db
      .select()
      .from(actas)
      .where(and(eq(actas.nombre, nombreActa), eq(actas.idUsuario, user_id)));

    if (!existing || existing.length === 0) {
      return {
        status: "error",
        message: "No existe un acta con ese nombre para este usuario.",
      };
    }

    if (!existing) {
      throw new Error("El acta no existe");
    }
    const idActa = existing[0].id;

    const nuevoFallo = await db
      .insert(fallosActa)
      .values({
        idActa,
        detalleFallo: detalleFallo as DetalleError,
      })
      .returning();

    return {
      ok: true,
      data: nuevoFallo[0],
    };
  } catch (error) {
    console.error("Error guardando el fallo:", error);
    return {
      ok: false,
      error: (error as Error).message,
    };
  }
}
