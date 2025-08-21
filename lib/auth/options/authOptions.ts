import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { db } from "@/lib/db/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validarInvitacion } from "@/app/modules/invitaciones/services/validarInvitacionService";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
    } & DefaultSession["user"];
  }
}
export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: "common",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      
      // 1. Buscar usuario existente
      let existingUser = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.email, user.email!))
        .then((res) => res[0]);

      // 2. Crear si no existe
      if (!existingUser) {
        existingUser = await db
          .insert(usuarios)
          .values({ email: user.email!, nombre: user.name ?? "", rol: 4 })
          .returning()
          .then((res) => res[0]);
      }

      if (account?.callbackUrl) {
        const url = new URL(String(account.callbackUrl), process.env.NEXTAUTH_URL);
        const token = url.searchParams.get("token");
        console.log("token: "+ token);

        console.log("existingUser: "+ existingUser);

        if (token && existingUser.email) {
          await validarInvitacion(existingUser.id, existingUser.email, token);
        }
      }

      return true;
    },

    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};


