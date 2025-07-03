'use server';

import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";

interface NewUserInput {
  name: string;
  mail: string;
  last_login?: Date;
}

export async function newUser({
  name,
  mail,
  last_login = new Date(),
}: NewUserInput) {
  try {
    await db.insert(usuarios).values({
      nombre: name,
      email: mail,
      ultimoAcceso: last_login,
    });
    console.log(`✅ Usuario registrado: ${mail}`);
  } catch (error) {
    console.error("❌ Error al registrar usuario:", error);
    throw error;
  }
}
