"use server";
import { db } from "@/lib/db/db";
import { empresas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export async function actualizarEmpresaService(idEmpresa: string, nombreEmpresa: string) {
  try {
    await db
      .update(empresas)
      .set({ nombreEmpresa })
      .where(eq(empresas.idEmpresa, idEmpresa));

    return { success: true };
  } catch (error) {
    console.error("Error actualizando empresa:", error);
    return { success: false, error: "No se pudo actualizar la empresa" };
  }
}
