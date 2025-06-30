import { db } from "@/lib/db/db";
import { users } from "@/lib/db/schema";

interface NewUserInput {
  name: string;
  mail: string;
  last_login?: Date;
}

export async function newUser({ name, mail, last_login = new Date() }: NewUserInput) {
  try {
    await db.insert(users).values({
      name,
      mail,
      last_login,
    });
    console.log(`✅ Usuario registrado: ${mail}`);
  } catch (error) {
    console.error("❌ Error al registrar usuario:", error);
    throw error;
  }
}
