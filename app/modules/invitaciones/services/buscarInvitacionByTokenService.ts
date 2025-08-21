
"use server";

import { db } from "@/lib/db/db";
import { invitaciones } from "@/lib/db/schema";
import { eq } from "drizzle-orm";



export async function buscarInvitacionByTokenService(token: string) {
  try {
    // Generar un token único
  const invitacion = await db
    .select()
    .from(invitaciones)
    .where(eq(invitaciones.token, token))
    .then((res) => res[0]);

    return {
      success: true,
      invitacion,
    };
  } catch (error) {
    console.error("Error buscanto invitación:", error);
    return {
      success: false,
      error: "No se pudo buscar la invitación",
    };
  }
}
