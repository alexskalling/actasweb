'use server';

import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options/authOptions";

export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    throw new Error("No se pudo identificar al usuario.");
  }

  const phone = formData.get("phone")?.toString();
  const nombre = formData.get("nombre")?.toString();
  const apellido = formData.get("apellido")?.toString();
  const emailFacturacion = formData.get("email")?.toString();
  const departamento = formData.get("departamento")?.toString();
  const municipio = formData.get("municipio")?.toString();
  const direccion = formData.get("direccion")?.toString();

  // Validar teléfono si se proporciona
  if (phone) {
    const phoneRegex = /^[0-9]{10}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      throw new Error("El teléfono debe tener 10 dígitos.");
    }
  }

  // Validar email si se proporciona
  if (emailFacturacion) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailFacturacion)) {
      throw new Error("El email no es válido.");
    }
  }

  // Construir objeto de actualización
  const updateFields: any = {};
  if (phone) updateFields.telefono = phone.replace(/\s/g, '');
  if (nombre) updateFields.nombre = nombre;
  if (apellido) updateFields.apellido = apellido;
  if (emailFacturacion) updateFields.email = emailFacturacion;
  if (departamento) updateFields.departamento = departamento;
  if (municipio) updateFields.municipio = municipio;
  if (direccion) updateFields.direccion = direccion;
  updateFields.pais = "Colombia";

  // Verificar si todos los campos de facturación están completos
  const hasAllBillingFields = nombre && apellido && phone && emailFacturacion && 
                               departamento && municipio && direccion;
  if (hasAllBillingFields) {
    updateFields.tieneDatosFacturacion = 1;
  }

  await db
    .update(usuarios)
    .set(updateFields)
    .where(eq(usuarios.email, email));
}
