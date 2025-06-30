'use client'

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import NavComponent from "../components/navComponent";

export default function PlataformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Si no hay sesión y ya terminó de cargar, redirigir a login
    if (status === "unauthenticated") {
      window.location.href = "/api/auth/signin";
    }
  }, [session, status, router]);

  // Mostrar loading mientras verifica la sesión
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no hay sesión, no mostrar nada (se redirigirá)
  if (!session) {
    return null;
  }

  // Si hay sesión, mostrar el layout completo
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <NavComponent />
      
      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
