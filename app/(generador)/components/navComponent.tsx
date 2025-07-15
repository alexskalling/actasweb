'use client';

import Image from "next/image";
import logo from "../assets/logo-actas-ai-blanco.svg";
import { getSession, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

export default function NavComponent() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const listener = async (event: MessageEvent) => {
      if (event.data?.type === "auth-completed" && event.data?.source === "navbar") {
        const session = await getSession();
        console.log("Sesión actualizada desde NAVBAR:", session);

        if (session) {
          console.log("Redirigiendo a /plataforma");
          router.push("/plataforma");
        }
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [router]);

  const handleLoginNewTab = () => {
    window.open(
      `/login?source=navbar`,
      "_blank"
    );
  };

  return (
    <nav className="w-full h-16 bg-[#5A2D8E]">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <a href="https://actasdereuniones.ai/" rel="noopener noreferrer" className="flex items-center">
          <Image
            src={logo}
            className="text-white font-bold text-2xl w-36 rounded"
            alt="Actas de Reuniones AI Logo"
            priority
          />
        </a>

        <div className="flex items-center gap-x-4">
          <a href="https://actasdereuniones.ai/" rel="noopener noreferrer" className="text-white font-bold px-2 py-1 rounded hover:bg-purple-700">Inicio</a>
          <a href="https://actasdereuniones.ai/blog/" rel="noopener noreferrer" className="text-white font-bold px-2 py-1 rounded hover:bg-purple-700">Blog</a>
          <a href="https://actasdereuniones.ai/contacto/" rel="noopener noreferrer" className="text-white font-bold px-2 py-1 rounded hover:bg-purple-700">Contacto</a>

          {session?.user ? (
            pathname === "/" && (
              <Link
                href="/plataforma"
                className="rounded-sm bg-purple-600 hover:bg-purple-700 px-3 py-2 text-white"
              >
                Mi Plataforma
              </Link>
            )
          ) : (
            <button
              onClick={handleLoginNewTab}
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
