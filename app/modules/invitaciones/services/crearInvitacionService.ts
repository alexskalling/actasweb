"use server";

import { db } from "@/lib/db/db";
import { invitaciones } from "@/lib/db/schema";
import { randomBytes } from "crypto";

interface CrearInvitacionInput {
  empresaId: string;
  email: string;
}

export async function crearInvitacionService({ empresaId, email }: CrearInvitacionInput) {
  try {
    // Generar un token único
    const token = randomBytes(32).toString("hex");

    // Insertar en la base de datos
    await db.insert(invitaciones).values({
      token,
      empresaId,
      email,
    });

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error("Error creando invitación:", error);
    return {
      success: false,
      error: "No se pudo crear la invitación",
    };
  }
}
