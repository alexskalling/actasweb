'use server';

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";

interface NewActaInput {
  user_id: string;
  urlAssembly: string | null | undefined;
  file_name: string;
}

export async function newActa({
  user_id,
  urlAssembly,
  file_name,
}: NewActaInput) {
  try {
    await db.insert(actas).values({
      idUsuario: user_id,
      idEstadoProceso: 1, // Estado inicial "pendiente de pago"
      urlAssembly: urlAssembly,
      nombre: file_name,
    });

    console.log(`Acta creada correctamente.`);
  }  catch (error: any) {
    if (error?.cause?.code === "23505") {
      throw new Error("DUPLICATE_ACTA");
    }
    console.error("Error al crear el acta:", error);
    throw error;
  }
}
