"use server";

import { db } from "@/lib/db/db";
import { empresas } from "@/lib/db/schema";

// Crear una nueva empresa
export async function guardarNuevaEmpresaService(nombreEmpresa: string, adminEmpresa: string) {
  try {
    const [newEmpresa] = await db
      .insert(empresas)
      .values({
        nombreEmpresa,
        adminEmpresa,
      })
      .returning();
    return { success: true, empresa: newEmpresa };
  } catch (error) {
    console.error("Error creando empresa:", error);
    return { success: false, error: "No se pudo crear la empresa" };
  }
}





