"use server";

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
  const industria = formData.get("industria")?.toString();
  const tipoUsuario = formData.get("tipoUsuario")?.toString() || "natural";
  const tipoDocumento = formData.get("tipoDocumento")?.toString();
  const numeroDocumento = formData.get("numeroDocumento")?.toString();

  if (phone) {
    const phoneRegex = /^[0-9]{10}$/;
    const cleanPhone = phone.replace(/\s/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      throw new Error("El teléfono debe tener 10 dígitos.");
    }
  }

  if (emailFacturacion) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailFacturacion)) {
      throw new Error("El email no es válido.");
    }
  }

  if (numeroDocumento) {
    const cleanNumeroDoc = numeroDocumento.replace(/\s/g, "");
    if (cleanNumeroDoc.length < 8) {
      throw new Error(
        "El número de documento debe tener al menos 8 caracteres.",
      );
    }
  }

  const updateFields: any = {};
  if (phone) updateFields.telefono = phone.replace(/\s/g, "");
  if (nombre) updateFields.nombre = nombre;
  if (apellido) updateFields.apellido = apellido;
  if (emailFacturacion) updateFields.email = emailFacturacion;
  if (departamento) updateFields.departamento = departamento;
  if (municipio) updateFields.municipio = municipio;
  if (direccion) updateFields.direccion = direccion;
  updateFields.pais = "Colombia";
  updateFields.tipoUsuario = tipoUsuario;
  if (tipoDocumento) updateFields.tipoDocumento = tipoDocumento;
  if (numeroDocumento)
    updateFields.numeroDocumento = numeroDocumento.replace(/\s/g, "");

  const hasAllBillingFields =
    nombre &&
    apellido &&
    phone &&
    emailFacturacion &&
    departamento &&
    municipio &&
    direccion;
  if (hasAllBillingFields) {
    updateFields.tieneDatosFacturacion = 1;
  }

  if (industria && industria.trim() !== "") {
    updateFields.idIndustria = parseInt(industria);
  }

  try {
    await db
      .update(usuarios)
      .set(updateFields)
      .where(eq(usuarios.email, email));
  } catch (error: any) {
    if (error?.code === "42703" || error?.message?.includes("does not exist")) {
      delete updateFields.idIndustria;
      await db
        .update(usuarios)
        .set(updateFields)
        .where(eq(usuarios.email, email));
    } else {
      throw error;
    }
  }
}
