import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options/authOptions";

export async function getUserEmailFromSession() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return null;
  }

  return session.user.email;
}