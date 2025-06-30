"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, X, User, LogIn } from "lucide-react";

export default function EmailSignupBannerComponent() {
  const [isVisible, setIsVisible] = useState(true);

  const handleLogin = () => {
    // Redirigir al login con callback a la plataforma
    window.location.href = "/api/auth/signin?callbackUrl=/generador/plataforma";
  };

  const handleRegister = () => {
    // Redirigir al registro con callback a la plataforma
    window.location.href = "/api/auth/signin?callbackUrl=/generador/plataforma";
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 rounded-lg shadow-lg mb-6 relative">
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-3">
          <Mail className="h-8 w-8 text-yellow-300" />
          <div>
            <h3 className="font-bold text-lg">
              ¿Quieres recibir tu acta directamente en tu correo?
            </h3>
            <p className="text-purple-100 text-sm">
              Inicia sesión o regístrate para recibir tus actas automáticamente
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button
            onClick={handleLogin}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 px-6 py-2 rounded-md transition-colors"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Iniciar Sesión
          </Button>
          <Button
            onClick={handleRegister}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-6 py-2 rounded-md transition-colors"
          >
            <User className="h-4 w-4 mr-2" />
            Registrarse
          </Button>
        </div>
      </div>
    </div>
  );
} 