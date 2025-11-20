import { db } from "@/lib/db/db";
import { eq } from "drizzle-orm";
import { usuarios } from "@/lib/db/schema";
import { newUser } from "@/lib/Users/registerUser";
import { generateReferralCode } from "@/lib/Users/generateReferralCode";
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
    signIn: "/",
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
        // Seleccionar campos necesarios incluyendo codigo_referido
        const existing = await db
          .select({
            id: usuarios.id,
            email: usuarios.email,
            codigoReferido: usuarios.codigoReferido,
          })
          .from(usuarios)
          .where(eq(usuarios.email, mail))
          .then((res) => res[0]);

        const now = new Date();

        if (existing) {
          // Si el usuario existe pero no tiene código de referido (null o vacío), generarlo
          if (!existing.codigoReferido || existing.codigoReferido.trim() === '') {
            try {
              const codigoReferido = await generateReferralCode();
              await db
                .update(usuarios)
                .set({ 
                  ultimoAcceso: now,
                  codigoReferido: codigoReferido
                })
                .where(eq(usuarios.email, mail));
              console.log(`✅ Código de referido generado para usuario existente: ${mail} - ${codigoReferido}`);
            } catch (error) {
              console.error("❌ Error al generar código de referido para usuario existente:", error);
              // Continuar con la actualización de ultimoAcceso aunque falle la generación del código
              await db
                .update(usuarios)
                .set({ ultimoAcceso: now })
                .where(eq(usuarios.email, mail));
            }
          } else {
            // Actualizar solo ultimoAcceso si ya tiene código
            await db
              .update(usuarios)
              .set({ ultimoAcceso: now })
              .where(eq(usuarios.email, mail));
          }
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
