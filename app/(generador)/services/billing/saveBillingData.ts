"use server";

import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options/authOptions";

export interface BillingDataInput {
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  departamento: string;
  municipio: string;
  direccion: string;
}

export async function saveBillingData(data: BillingDataInput) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    throw new Error("No se pudo identificar al usuario.");
  }

  if (
    !data.nombre ||
    !data.apellido ||
    !data.telefono ||
    !data.email ||
    !data.departamento ||
    !data.municipio ||
    !data.direccion
  ) {
    throw new Error("Todos los campos son requeridos.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error("El email no es válido.");
  }

  const phoneRegex = /^[0-9]{10}$/;
  const cleanPhone = data.telefono.replace(/\s/g, "");
  if (!phoneRegex.test(cleanPhone)) {
    throw new Error("El teléfono debe tener 10 dígitos.");
  }

  await db
    .update(usuarios)
    .set({
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: cleanPhone,
      email: data.email,
      departamento: data.departamento,
      municipio: data.municipio,
      direccion: data.direccion,
      pais: "Colombia",
      tieneDatosFacturacion: 1,
    })
    .where(eq(usuarios.email, email));

  return { success: true };
}
