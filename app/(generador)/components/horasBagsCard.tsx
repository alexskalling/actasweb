"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

export default function HorasBagsCard() {
  const { data: session } = useSession();

  const handleContactarWhatsApp = () => {
    const nombreUsuario = session?.user?.name || "Usuario";
    const numeroWhatsApp = "56945871929"; // Guillermo
    const mensaje = `Hola Guillermo, soy ${nombreUsuario}. Estoy interesado en comprar una bolsa de horas para mis actas. ¿Me puedes ayudar con el proceso de compra?`;
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, "_blank");
  };

  return (
    <div className="bg-purple-600 border border-purple-700 rounded-lg p-6 shadow-sm h-full flex flex-col w-full max-w-md">
      <div className="flex items-center gap-2 mb-4 text-white">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="font-bold text-lg">Bolsas de Horas</h3>
      </div>

      <div className="flex-1">
        <p className="text-sm text-purple-50 mb-4 leading-relaxed">
          <strong className="text-white">Olvídate de pagar cada vez.</strong>{" "}
          Compra una bolsa de horas y genera tus actas cuando las necesites.
        </p>

        <div className="bg-purple-700/50 border border-purple-500 rounded-lg p-4 mb-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="h-5 w-5 text-green-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Paga una vez, úsalo muchas veces
                </p>
                <p className="text-xs text-purple-100">
                  Usa tus horas cuando quieras, sin límites de tiempo
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="h-5 w-5 text-green-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Proceso más rápido
                </p>
                <p className="text-xs text-purple-100">
                  Genera tus actas directamente, sin esperar confirmaciones
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="h-5 w-5 text-green-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Ideal para equipos
                </p>
                <p className="text-xs text-purple-100">
                  Comparte con tu equipo y optimiza tus costos
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <Button
            onClick={handleContactarWhatsApp}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Quiero una bolsa de horas
          </Button>
        </div>

        <div className="border-t border-purple-500 pt-4">
          <p className="text-xs text-purple-100">
            <strong className="text-white">Nota:</strong> Las bolsas de horas no expiran y pueden ser
            utilizadas en cualquier momento. Contáctanos para conocer los planes
            disponibles y precios especiales.
          </p>
        </div>
      </div>
    </div>
  );
}

