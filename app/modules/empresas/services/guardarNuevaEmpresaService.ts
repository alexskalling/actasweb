"use server";

import { db } from "@/lib/db/db";
import { empresas } from "@/lib/db/schema";
import { NuevoAministradorEmpresaService } from "./nuevoAdministadorEmpresaService";
import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { InferSelectModel } from "drizzle-orm";

type Empresa = InferSelectModel<typeof empresas>;

export async function guardarNuevaEmpresaService(nombreEmpresa: string) {
  try {
    const mail = await getUserEmailFromSession();
    const user_id = mail ? await getUserIdByEmail(mail) : null;

    let newEmpresa: Empresa | null = null;

    if (mail && user_id) {
      const adminEmpresa = await NuevoAministradorEmpresaService(mail);
      [newEmpresa] = await db
        .insert(empresas)
        .values({
          nombreEmpresa,
          adminEmpresa,
        })
        .returning();
    }

    return { success: true, empresa: newEmpresa };
  } catch (error) {
    console.error("Error creando empresa:", error);
    return { success: false, error: "No se pudo crear la empresa" };
  }
}
