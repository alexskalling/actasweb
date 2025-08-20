"use server";

import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const rol_administrador_empresa = 1

export async function NuevoAministradorEmpresaService(email: string): Promise<string> {
  const [user] = await db
    .select({ id: usuarios.id, rol: usuarios.rol })
    .from(usuarios)
    .where(eq(usuarios.email, email));

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

    await db
    .update(usuarios)
    .set({ rol: rol_administrador_empresa})
    .where(eq(usuarios.id, user.id));
  

  return user.id;
}