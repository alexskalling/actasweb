'use server';

import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { generateReferralCode } from "./generateReferralCode";

interface NewUserInput {
  name: string;
  mail: string;
  last_login?: Date;
  rol: number;
}

export async function newUser({
  name,
  mail,
  last_login = new Date(),
  rol,
}: NewUserInput) {
  try {
    // Generar código de referido único
    const codigoReferido = await generateReferralCode();
    
    await db.insert(usuarios).values({
      nombre: name,
      email: mail,
      ultimoAcceso: last_login,
      rol: rol,
      codigoReferido: codigoReferido
    });
    console.log(`Usuario registrado: ${mail} con código de referido: ${codigoReferido}`);
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    throw error;
  }
}
