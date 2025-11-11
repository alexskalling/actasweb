'use client';

import Image from "next/image";
import logo from "../assets/logo-actas-ai-blanco.svg";
import { getSession, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export default function NavComponent() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setMobileMenuOpen(false);
  };

  return (
    <nav className="w-full h-16 bg-[#5A2D8E]">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <a href="https://actasdereuniones.ai/" rel="noopener noreferrer" className="flex items-center">
          <Image
            src={logo}
            className="text-white font-bold text-2xl w-28 sm:w-36 rounded"
            alt="Actas de Reuniones AI Logo"
            priority
          />
        </a>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-x-4">
          <a href="https://actasdereuniones.ai/" rel="noopener noreferrer" className="text-white font-bold px-2 py-1 rounded hover:bg-purple-700 transition-colors">Inicio</a>
          <a href="https://actasdereuniones.ai/blog/" rel="noopener noreferrer" className="text-white font-bold px-2 py-1 rounded hover:bg-purple-700 transition-colors">Blog</a>
          <a href="https://actasdereuniones.ai/contacto/" rel="noopener noreferrer" className="text-white font-bold px-2 py-1 rounded hover:bg-purple-700 transition-colors">Contacto</a>

          {session?.user ? (
            pathname === "/" && (
              <Link
                href="/plataforma"
                className="rounded-sm bg-purple-600 hover:bg-purple-700 px-3 py-2 text-white text-sm font-semibold transition-colors"
              >
                Mi Plataforma
              </Link>
            )
          ) : (
            <button
              onClick={handleLoginNewTab}
              className="rounded-sm bg-purple-600 hover:bg-purple-700 px-3 py-2 text-white text-sm font-semibold transition-colors"
            >
              Iniciar sesión
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden text-white p-2 rounded-md hover:bg-purple-700 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#5A2D8E] border-t border-purple-700">
          <div className="px-4 pt-2 pb-4 space-y-2">
            <a
              href="https://actasdereuniones.ai/"
              rel="noopener noreferrer"
              className="block text-white font-bold px-3 py-2 rounded hover:bg-purple-700 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Inicio
            </a>
            <a
              href="https://actasdereuniones.ai/blog/"
              rel="noopener noreferrer"
              className="block text-white font-bold px-3 py-2 rounded hover:bg-purple-700 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </a>
            <a
              href="https://actasdereuniones.ai/contacto/"
              rel="noopener noreferrer"
              className="block text-white font-bold px-3 py-2 rounded hover:bg-purple-700 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contacto
            </a>
            {session?.user ? (
              pathname === "/" && (
                <Link
                  href="/plataforma"
                  className="block rounded-sm bg-purple-600 hover:bg-purple-700 px-3 py-2 text-white text-sm font-semibold text-center transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mi Plataforma
                </Link>
              )
            ) : (
              <button
                onClick={handleLoginNewTab}
                className="w-full rounded-sm bg-purple-600 hover:bg-purple-700 px-3 py-2 text-white text-sm font-semibold transition-colors"
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
