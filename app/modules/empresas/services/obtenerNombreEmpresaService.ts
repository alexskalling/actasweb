"use server";

import { db } from "@/lib/db/db";
import { empresas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function obtenerNombreEmpresaService(empresaId: string) {
  try {
    const empresa = await db
      .select({ nombreEmpresa: empresas.nombreEmpresa }) // solo seleccionamos el nombre
      .from(empresas)
      .where(eq(empresas.idEmpresa, empresaId))
      .limit(1)
      .then((res) => res[0] ?? null);

    if (!empresa) {
      return { success: false, error: "No se encontró empresa para este empresaID", nombreEmpresa: null };
    }

    return { success: true, nombreEmpresa: empresa.nombreEmpresa };

  } catch (error) {
    console.error("Error buscando empresa:", error);
    return { success: false, error: "No se pudo buscar la empresa", nombreEmpresa: null };
  }
}
