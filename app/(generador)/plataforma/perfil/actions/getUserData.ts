'use server';

import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options/authOptions";

export interface UserData {
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  departamento: string | null;
  municipio: string | null;
  pais: string | null;
}

/**
 * Obtiene todos los datos del usuario actual
 * @returns Datos del usuario o null si no hay sesión
 */
export async function getUserData(): Promise<UserData | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return null;
  }

  const user = await db
    .select({
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      telefono: usuarios.telefono,
      email: usuarios.email,
      direccion: usuarios.direccion,
      departamento: usuarios.departamento,
      municipio: usuarios.municipio,
      pais: usuarios.pais,
    })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .then((res) => res[0]);

  if (!user) {
    return null;
  }

  return {
    nombre: user.nombre,
    apellido: user.apellido,
    telefono: user.telefono,
    email: user.email,
    direccion: user.direccion,
    departamento: user.departamento,
    municipio: user.municipio,
    pais: user.pais || "Colombia",
  };
}

