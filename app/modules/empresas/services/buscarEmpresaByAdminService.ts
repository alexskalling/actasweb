// buscarEmpresaByAdmin.ts
"use server";

import { db } from "@/lib/db/db";
import { empresas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserIdByEmail } from "@/app/modules/session/getIdOfEmail";

export async function buscarEmpresaByAdmin(email: string) {
  try {
    const userId = await getUserIdByEmail(email);

    if (!userId) {
      return { success: false, error: "Usuario no encontrado" };
    }

    const result = await db
      .select()
      .from(empresas)
      .where(eq(empresas.adminEmpresa, userId))
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: "No es admin de ninguna empresa" };
    }

    return { success: true, empresas: result, role: "admin" }; // 👈 devolvemos role
  } catch (err) {
    console.error(err);
    return { success: false, error: "No se encontraron empresas", empresas: [] };
  }
}
