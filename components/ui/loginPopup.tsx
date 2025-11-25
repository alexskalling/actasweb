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
    <div className="max-w-md w-full bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-8 border border-white/20">
      <div className="flex flex-col items-center mb-6">
        <Image
          src={logo}
          className="text-white font-bold text-2xl px-2 py-4 rounded"
          alt="Actas de Reuniones AI Logo"
          priority
        />
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <p className="text-white text-sm mb-1">
            <strong>¿Ya tienes cuenta?</strong>
          </p>
          <p className="text-white/80 text-sm">
            Inicia sesión con tu cuenta de Google o Microsoft
          </p>
        </div>
        <div>
          <p className="text-white/90 text-sm mb-1">
            <strong>¿Es tu primera vez?</strong>
          </p>
          <p className="text-white/70 text-sm">
            Tu cuenta se creará automáticamente al iniciar sesión
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <button
          onClick={() => handleSignIn("google")}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#5A2D8E] text-white border border-[#4A2575] rounded-lg hover:bg-[#4A2575] transition-colors font-medium"
        >
          <Image src="/google-logo.svg" alt="Google" width={20} height={20} />
          <span>Continuar con Google</span>
        </button>

        <button
          onClick={() => handleSignIn("azure-ad")}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#5A2D8E] text-white border border-[#4A2575] rounded-lg hover:bg-[#4A2575] transition-colors font-medium"
        >
          <Image src="/microsoft-logo.svg" alt="Microsoft" width={20} height={20} />
          <span>Continuar con Microsoft</span>
        </button>
      </div>

      {session && (
        <p className="text-green-300 text-sm text-center mb-4">
          Sesión iniciada como: {session.user?.email}
        </p>
      )}

      <p className="text-center text-white/60 text-xs">
        Al continuar, aceptas nuestros{" "}
        <a
          href="https://actasdereuniones.ai/politica-de-privacidad/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/80 hover:text-white underline"
        >
          términos de servicio y política de privacidad
        </a>
      </p>
    </div>
  );
}
