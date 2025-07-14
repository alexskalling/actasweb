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

  await db
    .update(usuarios)
    .set({
      ...(phone && { telefono: phone }),
    })
    .where(eq(usuarios.email, email));
}
