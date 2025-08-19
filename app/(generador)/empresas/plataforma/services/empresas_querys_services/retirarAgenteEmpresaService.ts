"use server";

import { db } from "@/lib/db/db";
import { empresas, agentesEmpresa } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Eliminar un agente de una empresa
export async function retirarAgenteEmpresaService(empresaId: string, agenteId: string) {
  try {
    await db
      .delete(agentesEmpresa)
      .where(
        eq(agentesEmpresa.empresaId, empresaId) &&
        eq(agentesEmpresa.agenteId, agenteId)
      );
    return { success: true };
  } catch (error) {
    console.error("Error eliminando agente:", error);
    return { success: false, error: "No se pudo eliminar el agente" };
  }
}