"use server";

import { db } from "@/lib/db/db";
import { agentesEmpresa } from "@/lib/db/schema";
// Agregar un agente a una empresa
export async function agregarAgenteEmpresaService(empresaId: string, agenteId: string) {
  try {
    await db.insert(agentesEmpresa).values({ empresaId, agenteId });
    return { success: true };
  } catch (error) {
    console.error("Error agregando agente:", error);
    return { success: false, error: "No se pudo agregar el agente" };
  }
}