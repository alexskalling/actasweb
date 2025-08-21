"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import logo from "@/app/(generador)/assets/logo-actas-ai-blanco.svg";

export default function LoginPopup({ callbackUrl = "/plataforma" }: { callbackUrl?: string }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      const params = new URLSearchParams(window.location.search);
      const source = params.get("source") || "unknown";

      if (window.opener) {
        window.opener.postMessage(
          { type: "auth-completed", source },
          "*"
        );
        window.close();
      } else {
        // Si no es un popup, solo redirige normalmente
        window.location.href = callbackUrl;
      }
    }
  }, [session, callbackUrl]);

  const handleSignIn = (provider: string) => {
    if (process.env.NEXT_PUBLIC_PAGO !== "soporte") {
      window.gtag?.("event", "inicio_login", {
        event_category: "autenticacion",
        event_label: `login_${provider}`,
        metodo_login: provider,
      });
    }

    signIn(provider, { callbackUrl });
  };

  return (
    <div className="max-w-md w-full bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-8 space-y-6 border border-white/20">
      <div className="flex flex-col items-center">
        <Image
          src={logo}
          className="text-white font-bold text-2xl px-2 py-4 rounded"
          alt="Actas de Reuniones AI Logo"
          priority
        />

        <p className="font-bold mt-4 text-white">
          ¡Nos emociona mucho tenerte con nosotros!
        </p>

        {session && (
          <p className="text-green-300 mt-2 text-sm">
            Sesión iniciada como: {session.user?.email}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={() => handleSignIn("google")}
          className="w-full flex items-center gap-3 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition"
        >
          <Image src="/google-logo.svg" alt="Google" width={20} height={20} />
          <span>Continuar con Google</span>
        </button>

        <button
          onClick={() => handleSignIn("azure-ad")}
          className="w-full flex items-center gap-3 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition"
        >
          <Image src="/microsoft-logo.svg" alt="Microsoft" width={20} height={20} />
          <span>Continuar con Microsoft</span>
        </button>
      </div>
    </div>
  );
}
