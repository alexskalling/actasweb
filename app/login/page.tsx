'use client';
import logo from "../(generador)/assets/logo-actas-ai-blanco.svg";
import { signIn } from 'next-auth/react';
import { useSearchParams } from "next/navigation";
import Image from 'next/image';

export default function LoginPage() {

  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <main className="min-h-screen bg-purple-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-8 space-y-6 border border-white/20">
        {/* Logo y título */}
        <div className="flex flex-col items-center">
          <Image
            src={logo}
            className="text-white font-bold text-2xl px-2 py-4 rounded"
            alt="Actas de Reuniones AI Logo" // Added alt attribute for accessibility
            priority // Optional: Add priority if this is a LCP image
          />
    
          <p className=" font-bold mt-4 text-white">
            ¡Nos Emociona mucho tenerte con nosotros!
          </p>

        </div>

        {/* Botones sociales */}
        <div className="space-y-3">
          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full flex items-center gap-3 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition"
          >
            <Image
              src="/google-logo.svg"
              alt="Google"
              width={20}
              height={20}
            />
            <span>Continuar con Google</span>
          </button>

          <button
            onClick={() => signIn("azure-ad", { callbackUrl })}
            className="w-full flex items-center gap-3 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition"
          >
            <Image
              src="/microsoft-logo.svg"
              alt="Microsoft"
              width={20}
              height={20}
            />
            <span>Continuar con Microsoft</span>
          </button>
        </div>

        {/* Divider 
        <div className="flex items-center gap-3 text-white/70 text-sm">
          <div className="flex-1 h-px bg-white/30" />
          o
          <div className="flex-1 h-px bg-white/30" />
        </div>

       
        <div className="text-center text-xs text-white/60">
          <p>
            Al continuar, aceptas nuestros{' '}
            <a href="#" className="underline hover:text-white">
              Términos de uso
            </a>{' '}
            y{' '}
            <a href="#" className="underline hover:text-white">
              Política de privacidad
            </a>.
          </p>
        </div>
        */}
      </div>
    </main>
  );
}
