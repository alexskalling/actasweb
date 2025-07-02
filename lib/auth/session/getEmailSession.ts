import { useSession } from "next-auth/react";

export async function getUserEmailFromSession() {
  const { data: session } = useSession();

  if (!session || !session.user?.email) {
    throw new Error("No se encontró sesión activa");
  }

  return session.user.email;
}
