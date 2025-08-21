"use server";

import { db } from "@/lib/db/db";
import { invitaciones, agentesEmpresa, usuarios } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

// Aceptar invitación
export async function validarInvitacion(userId: string, email: string, token: string) {
  try {
    const invitacion = await db
      .select()
      .from(invitaciones)
      .where(eq(invitaciones.token, token))
      .then(res => res[0]);

    if (!invitacion) return { success: false, error: "Invitación no encontrada o inválida" };
    if (invitacion.email !== email) return { success: false, error: "El correo no coincide" };

    // Verificar si ya existe la asociación
    const existingAssociation = await db
      .select()
      .from(agentesEmpresa)
      .where(
        and(
          eq(agentesEmpresa.empresaId, invitacion.empresaId),
          eq(agentesEmpresa.agenteId, userId)))
      .then(res => res[0]);

    if (!existingAssociation) {
      await db.insert(agentesEmpresa).values({
        empresaId: invitacion.empresaId,
        agenteId: userId,
      });
    }

    await db.update(invitaciones)
      .set({ accepted: true })
      .where(eq(invitaciones.token, token));

    await db.update(usuarios)
      .set({ rol: 2 })
      .where(eq(usuarios.id, userId));

    return { success: true };
  } catch (error) {
    console.error("❌ Error al aceptar invitación:", error);
    return { success: false, error: "No se pudo aceptar la invitación" };
  }
}
