'use client'

import Image from "next/image";
import logo from "../assets/logo-actas-ai-blanco.svg";
import { signIn, useSession, signOut } from "next-auth/react"

export default function NavComponent() {
  const { data: session } = useSession();

  return (
    <nav className="w-full h-16 bg-[#5A2D8E]">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <a
          href="https://actasdereuniones.ai/"
          rel="noopener noreferrer"
          className="flex items-center"
        >
          <Image
            src={logo}
            className="text-white font-bold text-2xl p-10 rounded"
            alt="Actas de Reuniones AI Logo"
            priority
          />
        </a>

        {/* Navegación + Auth */}
        <div className="flex items-center gap-x-4">
          {/* Links */}
          <a
            href="https://actasdereuniones.ai/"
            rel="noopener noreferrer"
            className="text-white font-bold px-2 py-1 rounded hover:bg-purple-700"
          >
            Inicio
          </a>
          <a
            href="https://actasdereuniones.ai/blog/"
            rel="noopener noreferrer"
            className="text-white font-bold px-2 py-1 rounded hover:bg-purple-700"
          >
            Blog
          </a>
          <a
            href="https://actasdereuniones.ai/contacto/"
            rel="noopener noreferrer"
            className="text-white font-bold px-2 py-1 rounded hover:bg-purple-700"
          >
            Contacto
          </a>

          {/* Auth Section */}
          {session?.user ? (
            <div className="flex items-center gap-x-2">
              <p className="text-white">{session.user.name}</p>
              <img
                src={session.user.image ?? ""}
                alt={`Foto de perfil de ${session.user.name}`}
                className="w-10 h-10 rounded-full"
              />
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-sm bg-purple-600 hover:bg-purple-700 px-3 py-2 text-white"
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn(undefined, { callbackUrl: "/plataforma" })}
              className="rounded-sm bg-purple-600 hover:bg-purple-700 px-3 py-2 text-white"
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
