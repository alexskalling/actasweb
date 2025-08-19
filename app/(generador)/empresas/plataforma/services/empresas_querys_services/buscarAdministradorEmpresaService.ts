import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function BuscarIdAministradorEmpresaService(email: string): Promise<string> {
  const [user] = await db
    .select({ id: usuarios.id, rol: usuarios.rol })
    .from(usuarios)
    .where(eq(usuarios.email, email));

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  if (user.rol !== 1) {
    throw new Error("Acceso denegado: no eres administrador de Empresa");
  }

  return user.id;
}