"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function EmailSignupBannerComponent() {

  const handleRegister = () => {
    // Track inicio registro desde banner
    if (process.env.NEXT_PUBLIC_PAGO !== "soporte") {
      window.gtag('event', 'inicio_registro', {
        'event_category': 'autenticacion',
        'event_label': 'registro_desde_banner',
        'ubicacion_pagina': 'banner_email'
      });
    }
    window.location.href = "/api/auth/signin?callbackUrl=/plataforma";
  };

  

  return (
    <div className="bg-purple-600  text-white p-6 rounded-lg shadow-lg mb-6 relative">


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
