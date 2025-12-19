"use server";

import { db } from "@/lib/db/db";
import { actas, usuarios } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export type ActaParaProcesar = {
  urlAssembly: string | null;
  nombre: string | null;
  idUsuario: string | null;
  emailUsuario: string | null;
  nombreUsuario: string | null;
  codigoReferido: string | null;
};

export async function getActaParaProcesarService(
  fileName: string,
  userId: string
): Promise<ActaParaProcesar | null> {
  try {
    const results = await db
      .select({
        urlAssembly: actas.urlAssembly,
        nombre: actas.nombre,
        idUsuario: actas.idUsuario,
        codigoReferido: actas.codigoReferido,
        emailUsuario: usuarios.email,
        nombreUsuario: usuarios.nombre,
      })
      .from(actas)
      .leftJoin(usuarios, eq(actas.idUsuario, usuarios.id))
      .where(and(eq(actas.nombre, fileName), eq(actas.idUsuario, userId)))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return results[0];
  } catch (error) {
    console.error("[getActaParaProcesarService] Error al buscar el acta para procesar:", error);
    return null;
  }
}