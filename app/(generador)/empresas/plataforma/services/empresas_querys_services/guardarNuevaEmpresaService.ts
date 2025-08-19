"use server";

import { db } from "@/lib/db/db";
import { empresas } from "@/lib/db/schema";
import { NuevoAministradorEmpresaService } from "./nuevoAdministadorEmpresaService";

// Crear una nueva empresa
export async function guardarNuevaEmpresaService(nombreEmpresa: string, correoAdminEmpresa: string) {
  try {
    const adminEmpresa = await NuevoAministradorEmpresaService(correoAdminEmpresa);
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





