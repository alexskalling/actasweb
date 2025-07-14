import { db } from "@/lib/db/db";
import { eq } from "drizzle-orm";
import { usuarios } from "@/lib/db/schema";
import { newUser } from "@/lib/Users/registerUser";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import type { NextAuthOptions } from "next-auth";

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
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      const name = user.name ?? "Sin nombre";
      const mail = user.email;

      if (!mail) {
        console.log("❌ Usuario sin correo, no se puede registrar");
        return false;
      }

      try {
        const existing = await db
          .select()
          .from(usuarios)
          .where(eq(usuarios.email, mail))
          .then((res) => res[0]);

        const now = new Date();

        if (existing) {
          await db
            .update(usuarios)
            .set({ ultimoAcceso: now })
            .where(eq(usuarios.email, mail));
        } else {
          await newUser({ name, mail, last_login: now });
        }

        return true;
      } catch (err) {
        console.error("❌ Error durante signIn:", err);
        return false;
      }
    },
  },
};
