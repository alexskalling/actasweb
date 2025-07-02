import { db } from "@/lib/db/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUserIdByEmail(email: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.mail, email));

  if (!user) {
    throw new Error(`No se encontró un usuario con el correo: ${email}`);
  }

  return user.id;
}
