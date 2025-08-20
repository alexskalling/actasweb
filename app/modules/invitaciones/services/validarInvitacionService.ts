"use server";

import { db } from "@/lib/db/db";
import { invitaciones, agentesEmpresa, usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Aceptar invitación
export async function validarInvitacion(userId: string, email: string, token: string) {
  try {
    // 1. Buscar la invitación por token
    const invitacion = await db
      .select()
      .from(invitaciones)
      .where(eq(invitaciones.token, token))
      .then(res => res[0]);

    if (!invitacion) {
      return { success: false, error: "Invitación no encontrada o inválida" };
    }

    // 2. Validar que el correo coincida
    if (invitacion.email !== email) {
      return { success: false, error: "El correo no coincide con la invitación" };
    }

    // 3. Asociar el agente a la empresa
    await db.insert(agentesEmpresa).values({
      empresaId: invitacion.empresaId,
      agenteId: userId,
    });

    // 4. Marcar invitación como aceptada
    await db
      .update(invitaciones)
      .set({ accepted: true })
      .where(eq(invitaciones.token, invitacion.token));

      await db
      .update(usuarios)
      .set({ rol: 2 })
      .where(eq(usuarios.id, userId));

    return { success: true };
  } catch (error) {
    console.error("❌ Error al aceptar invitación:", error);
    return { success: false, error: "No se pudo aceptar la invitación" };
  }
}
