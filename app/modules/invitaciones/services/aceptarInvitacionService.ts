"use server";

import { db } from "@/lib/db/db";
import { invitaciones, agentesEmpresa, usuarios } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options/authOptions";

export async function aceptarInvitacionServer(token: string) {
  if (!token) {
    return { status: "error", message: "Token no proporcionado" };
  }

  try {
    // 1️⃣ Buscar invitación
    const invitacion = await db
      .select()
      .from(invitaciones)
      .where(eq(invitaciones.token, token))
      .then((res) => res[0]);

    if (!invitacion) {
      return { status: "error", message: "Invitación no encontrada o inválida" };
    }

    // 2️⃣ Obtener sesión
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { status: "no-session" };
    }

    const email = session.user.email;

    // 3️⃣ Buscar usuario en DB
    let user = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .then((res) => res[0]);

    // 4️⃣ Crear usuario si no existe
    if (!user) {
      user = await db
        .insert(usuarios)
        .values({ email, nombre: session.user.name ?? "", rol: 4 })
        .returning()
        .then((res) => res[0]);
    }

    // 5️⃣ Validar que el email coincida con la invitación
    if (user.email !== invitacion.email) {
      return { status: "error", message: "El correo no coincide con la invitación" };
    }

    // 6️⃣ Verificar si ya existe la asociación
    const existingAssociation = await db
      .select()
      .from(agentesEmpresa)
      .where(
        and(eq(agentesEmpresa.empresaId, invitacion.empresaId),
      eq(agentesEmpresa.agenteId, user.id)))
        
      .then((res) => res[0]);

    if (!existingAssociation) {
      await db.insert(agentesEmpresa).values({
        empresaId: invitacion.empresaId,
        agenteId: user.id,
      });
    }

    // 7️⃣ Marcar invitación como aceptada
    await db
      .update(invitaciones)
      .set({ accepted: true })
      .where(eq(invitaciones.token, token));

    // 8️⃣ Actualizar rol del usuario
    await db
      .update(usuarios)
      .set({ rol: 2 })
      .where(eq(usuarios.id, user.id));

    return { status: "aceptada" };
  } catch (err) {
    console.error("❌ Error al aceptar invitación:", err);
    return { status: "error", message: "No se pudo aceptar la invitación" };
  }
}
