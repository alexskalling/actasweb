import { db } from "@/lib/db/db";
import { eq } from "drizzle-orm";
import { usuarios } from "@/lib/db/schema";
import { newUser } from "@/lib/Users/registerUser";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  // Asegurar que NextAuth use la URL correcta
  url: process.env.NEXTAUTH_URL,
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
        // Seleccionar solo campos básicos que siempre existen para evitar errores si la migración no se ha ejecutado
        const existing = await db
          .select({
            id: usuarios.id,
            email: usuarios.email,
          })
          .from(usuarios)
          .where(eq(usuarios.email, mail))
          .then((res) => res[0]);

        const now = new Date();

        if (existing) {
          // Actualizar solo ultimoAcceso que siempre existe
          await db
            .update(usuarios)
            .set({ ultimoAcceso: now })
            .where(eq(usuarios.email, mail));
        } else {
          await newUser({ name, mail, last_login: now, rol: 4});
        }

        return true;
      } catch (err) {
        console.error("❌ Error durante signIn:", err);
        console.error("Detalles del error:", JSON.stringify(err, null, 2));
        // Retornar false causa AccessDenied
        return false;
      }
    },
  },
};
