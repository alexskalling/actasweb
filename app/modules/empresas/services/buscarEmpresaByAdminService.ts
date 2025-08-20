"use server";

import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { empresas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { InferSelectModel } from "drizzle-orm";

// Tipo de una fila de la tabla empresas
type Empresa = InferSelectModel<typeof empresas>;

export async function buscarEmpresaByAdmin(adminMail: string) {
  try {
    const adminId = await getUserIdByEmail(adminMail);

    // Si no existe usuario, devolvemos error antes de hacer la query
    if (!adminId) {
      return { success: false, error: "No se encontró usuario con este correo" };
    }

    const empresa: Empresa | undefined = await db
      .select()
      .from(empresas)
      .where(eq(empresas.adminEmpresa, adminId))
      .limit(1)
      .then((res) => res[0]);

    if (!empresa) {
      return { success: false, error: "No se encontró empresa para este administrador" };
    }

    return { success: true, empresa };
  } catch (error) {
    console.error("Error buscando empresa:", error);
    return { success: false, error: "No se pudo buscar la empresa" };
  }
}
