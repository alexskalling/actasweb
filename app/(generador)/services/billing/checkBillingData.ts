'use server';

import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options/authOptions";

export interface BillingDataCheck {
  hasCompleteData: boolean;
  missingFields: string[];
  userId?: string;
}

/**
 * Verifica si el usuario tiene datos completos de facturación
 * @returns Objeto con información sobre la completitud de los datos
 */
export async function checkBillingData(): Promise<BillingDataCheck> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return {
      hasCompleteData: false,
      missingFields: ['sesión'],
    };
  }

  // Por ahora, no usar idIndustria para evitar errores
  const user = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      telefono: usuarios.telefono,
      email: usuarios.email,
      departamento: usuarios.departamento,
      municipio: usuarios.municipio,
      direccion: usuarios.direccion,
    })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .then((res) => res[0]);

  if (!user) {
    return {
      hasCompleteData: false,
      missingFields: ['usuario'],
    };
  }

  const missingFields: string[] = [];
  
  if (!user.nombre || user.nombre.trim() === '') missingFields.push('nombre');
  if (!user.apellido || user.apellido?.trim() === '') missingFields.push('apellido');
  if (!user.telefono || user.telefono.trim() === '') missingFields.push('teléfono');
  if (!user.email || user.email.trim() === '') missingFields.push('correo');
  if (!user.departamento || user.departamento?.trim() === '') missingFields.push('departamento');
  if (!user.municipio || user.municipio?.trim() === '') missingFields.push('municipio');
  if (!user.direccion || user.direccion?.trim() === '') missingFields.push('dirección');
  // No verificar industria por ahora

  return {
    hasCompleteData: missingFields.length === 0,
    missingFields,
    userId: user.id,
  };
}

