"use server";

import { db } from "@/lib/db/db";
import { agentesEmpresa } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Agregar un agente a una empresa
export async function agregarAgenteEmpresaService(empresaId: string, agenteId: string) {
  try {
    // Revisar si ya existe la relación
    const existe = await db
      .select()
      .from(agentesEmpresa)
      .where(and(eq(agentesEmpresa.empresaId, empresaId), eq(agentesEmpresa.agenteId, agenteId)))
      .limit(1);

    if (existe.length > 0) {
      return { success: false, error: "El agente ya pertenece a la empresa" };
    }

    await db.insert(agentesEmpresa).values({ empresaId, agenteId });
    return { success: true };
  } catch (error) {
    console.error("Error agregando agente:", error);
    return { success: false, error: "No se pudo agregar el agente" };
  }
}
