'use server';

import { db } from "@/lib/db/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options/authOptions";

export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    throw new Error("No se pudo identificar al usuario.");
  }

  const name = formData.get("name")?.toString();
  const phone = formData.get("phone")?.toString();

  await db
    .update(users)
    .set({
      ...(name && { name }),
      ...(phone && { phone }),
    })
    .where(eq(users.mail, email));
}
