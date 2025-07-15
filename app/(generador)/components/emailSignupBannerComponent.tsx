"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { getSession } from "next-auth/react";

export default function EmailSignupBannerComponent() {
  useEffect(() => {
    const listener = async (event: MessageEvent) => {
      if (event.data?.type === "auth-completed" && event.data?.source === "banner") {
        const session = await getSession();
        console.log("✅ Sesión actualizada desde BANNER:", session);
        // Aquí puedes actualizar estado global si lo necesitas
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const handleRegister = () => {
    if (process.env.NEXT_PUBLIC_PAGO !== "soporte") {
      window.gtag?.("event", "inicio_registro", {
        event_category: "autenticacion",
        event_label: "registro_desde_banner",
        ubicacion_pagina: "banner_email",
      });
    }

    // Abre en una pestaña nueva
    window.open(`/login?source=banner`, "_blank");
  };

  return (
    <div className="bg-purple-600 text-white p-6 rounded-lg shadow-lg mb-6 relative">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="flex items-center gap-4 flex-1 justify-center md:justify-start">
          <Mail className="h-10 w-10 text-yellow-300" />
          <div>
            <h3 className="font-bold text-xl">
              ¿Quieres recibir tu acta directamente en tu correo?
            </h3>
            <p className="text-purple-100 text-sm">
              Inicia sesión o regístrate para recibir tus actas automáticamente
            </p>
          </div>
        </div>

        <div className="flex justify-center md:justify-end w-full md:w-auto px-20">
          <Button
            onClick={handleRegister}
            className="bg-white hover:bg-purple-500 text-gray-900 px-6 py-2 rounded-md transition-colors"
          >
            Registrarse
          </Button>
        </div>
      </div>
    </div>
  );
}
