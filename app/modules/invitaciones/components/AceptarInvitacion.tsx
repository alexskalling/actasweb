'use client'
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { obtenerNombreEmpresaService } from "@/app/modules/empresas/services/obtenerNombreEmpresaService";

interface AceptarInvitacionProps {
  email: string;
  empresaId: string;
  token: string;
}

export default function AceptarInvitacion({
  email,
  empresaId,
  token,
}: AceptarInvitacionProps) {
  const [empresaNombre, setEmpresaNombre] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNombreEmpresa() {
      const res = await obtenerNombreEmpresaService(empresaId);
      if (res.success) {
        setEmpresaNombre(res.nombreEmpresa);
      } else {
        setEmpresaNombre("Nombre no disponible");
      }
    }

    fetchNombreEmpresa();
  }, [empresaId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Invitación válida 🎉</h1>
      <p className="mb-2">Has sido invitado con el correo: {email}</p>
      <p className="mb-6">Perteneces a la empresa: {empresaNombre ?? "Cargando..."}</p>

      <div className="flex flex-col gap-4 w-64">
        <button
          onClick={() =>
            signIn("google", {
              callbackUrl: `/invitacion/${token}/aceptar?token=${token}`,
            })
          }
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-800 rounded-lg border shadow hover:bg-gray-50 transition"
        >
          <Image
            src="/google-logo.svg"
            alt="Google"
            width={20}
            height={20}
          />
          Continuar con Google
        </button>

        <button
          onClick={() =>
            signIn("azure-ad", {
              callbackUrl: `/invitacion/${token}/aceptar?token=${token}`,
            })
          }
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          <Image
            src="/microsoft-logo.svg"
            alt="Microsoft"
            width={20}
            height={20}
          />
          Continuar con Microsoft
        </button>
      </div>
    </div>
  );
}
