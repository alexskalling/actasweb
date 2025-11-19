'use server';

import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Genera un código de referido único de 7 caracteres alfanuméricos en mayúsculas
 * @returns Código único de 7 caracteres
 */
export async function generateReferralCode(): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  // Intentar generar un código único
  while (!isUnique && attempts < maxAttempts) {
    // Generar código de 7 caracteres
    code = '';
    for (let i = 0; i < 7; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Verificar si el código ya existe
    const existing = await db
      .select({ codigoReferido: usuarios.codigoReferido })
      .from(usuarios)
      .where(eq(usuarios.codigoReferido, code))
      .limit(1);

    if (existing.length === 0) {
      isUnique = true;
    } else {
      attempts++;
    }
  }

  if (!isUnique) {
    throw new Error('No se pudo generar un código de referido único después de múltiples intentos');
  }

  return code!;
}


