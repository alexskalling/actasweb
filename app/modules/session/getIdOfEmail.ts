import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUserIdByEmail(email: string): Promise<string> {
  const [user] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email));

  if (!user) {
    throw new Error(`No se encontró un usuario con el correo: ${email}`);
  }

  return user.id;
}
