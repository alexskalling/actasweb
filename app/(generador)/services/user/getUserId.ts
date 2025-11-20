"use server";

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";

export async function getUserId(): Promise<string | null> {
  try {
    const email = await getUserEmailFromSession();
    if (!email) {
      return null;
    }
    const userId = await getUserIdByEmail(email);
    return userId || null;
  } catch (error) {
    console.error("Error al obtener user ID:", error);
    return null;
  }
}
