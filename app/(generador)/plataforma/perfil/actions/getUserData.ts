"use server";

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
  idIndustria: number | null;
  tipoUsuario: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
}

export async function getUserData(): Promise<UserData | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return null;
  }

  try {
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
        idIndustria: usuarios.idIndustria,
        tipoUsuario: usuarios.tipoUsuario,
        tipoDocumento: usuarios.tipoDocumento,
        numeroDocumento: usuarios.numeroDocumento,
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
      idIndustria: user.idIndustria || null,
      tipoUsuario: user.tipoUsuario || "natural",
      tipoDocumento: user.tipoDocumento || null,
      numeroDocumento: user.numeroDocumento || null,
    };
  } catch (error: any) {
    if (
      error?.code === "42703" ||
      error?.message?.includes("does not exist") ||
      error?.message?.includes("tipo_usuario")
    ) {
      try {
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
            idIndustria: usuarios.idIndustria,
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
          idIndustria: user.idIndustria || null,
          tipoUsuario: "natural",
          tipoDocumento: null,
          numeroDocumento: null,
        };
      } catch (fallbackError: any) {
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
          idIndustria: null,
          tipoUsuario: "natural",
          tipoDocumento: null,
          numeroDocumento: null,
        };
      }
    }
    throw error;
  }
}
