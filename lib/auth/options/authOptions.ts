import { db } from "@/lib/db/db";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import { newUser } from "@/lib/Users/registerUser";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
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
          .from(users)
          .where(eq(users.mail, mail))
          .then((res) => res[0]);

        const now = new Date();

        if (existing) {
          await db
            .update(users)
            .set({ last_login: now })
            .where(eq(users.mail, mail));
        } else {
          await newUser({ name, mail, last_login: now });
        }

        return true;
      } catch (err) {
        console.error("❌ Error durante signIn:", err);
        return false;
      }
    }
    ,
  },
};
