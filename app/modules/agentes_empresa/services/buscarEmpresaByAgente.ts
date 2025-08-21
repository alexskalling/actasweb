// buscarEmpresasByAgente.ts
"use server";

import { getUserIdByEmail } from "@/app/modules/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { empresas, agentesEmpresa } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function buscarEmpresaByAgente(agenteMail: string) {
  try {
    const agenteId = await getUserIdByEmail(agenteMail);

    if (!agenteId) {
      return { success: false, error: "No se encontró usuario con este correo" };
    }

    const results = await db
      .select({
        empresa: empresas,
      })
      .from(agentesEmpresa)
      .innerJoin(empresas, eq(empresas.idEmpresa, agentesEmpresa.empresaId))
      .where(eq(agentesEmpresa.agenteId, agenteId))
      .limit(1);

    if (results.length === 0) {
      return { success: false, error: "No se encontraron empresas para este agente", empresas: [] };
    }

    return { success: true, empresas: results.map((r) => r.empresa), role: "agente" }; // 👈 devolvemos role
  } catch (error) {
    console.error("Error buscando empresas por agente:", error);
    return { success: false, error: "No se encontraron empresas", empresas: [] };
  }
}
