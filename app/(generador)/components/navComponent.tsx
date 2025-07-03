'use client'

import Image from "next/image";
import logo from "../assets/logo-actas-ai-blanco.svg";
import { signIn, useSession } from "next-auth/react"
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function NavComponent() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <nav className="w-full h-16 bg-[#5A2D8E]">
      <div className="h-full  max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <a
          href="https://actasdereuniones.ai/"
          rel="noopener noreferrer"
          className="flex items-center "
        >
          <Image
            src={logo}
            className="text-white font-bold text-2xl w-36  rounded"
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
            <>
              {/* Foto de perfil */}
              <Image
                src={session.user.image || "/default-profile.png"}
                alt="Foto de perfil"
                width={32}
                height={32}
                className="rounded-full border-2 border-white"
              />
              {pathname === "/" && (
                <Link
                  href="/plataforma"
                  className="rounded-sm bg-purple-600 hover:bg-purple-700 px-3 py-2 text-white"
                >
                  Ingresar
                </Link>
              )}

            </>
          ) : (
            // Usuario sin sesión, mostrar botón "Iniciar sesión"
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
