"use server";

import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { sql, or } from "drizzle-orm";

export interface UsuarioEncontrado {
  id: string;
  nombre: string | null;
  email: string | null;
}

export async function buscarUsuarioPorEmail(emailBusqueda: string): Promise<{
  status: "success" | "error";
  usuarios?: UsuarioEncontrado[];
  message?: string;
}> {
  try {
    if (!emailBusqueda || emailBusqueda.trim().length < 3) {
      return {
        status: "error",
        message: "Ingresa al menos 3 caracteres para buscar",
      };
    }

    const emailBusquedaTrim = emailBusqueda.trim().toLowerCase();

    const usuariosEncontrados = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
      })
      .from(usuarios)
      .where(
        or(
          sql`LOWER(${usuarios.email}) LIKE ${`%${emailBusquedaTrim}%`}`,
          sql`LOWER(${usuarios.nombre}) LIKE ${`%${emailBusquedaTrim}%`}`,
        ),
      )
      .limit(10);

    return {
      status: "success",
      usuarios: usuariosEncontrados.map((u: any) => ({
        id: u.id,
        nombre: u.nombre || "Sin nombre",
        email: u.email || null,
      })),
    };
  } catch (error) {
    console.error("Error al buscar usuario por email:", error);
    return {
      status: "error",
      message: "Error al buscar usuarios. Por favor, intenta nuevamente.",
    };
  }
}
