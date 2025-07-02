import { getServerSession } from "next-auth";
import { authOptions } from "../options/authOptions";

export async function getUserEmailFromSession() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    throw new Error("No se encontró sesión activa");
  }

  return session.user.email;
}
