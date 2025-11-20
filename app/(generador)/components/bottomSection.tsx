"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCodigoReferido } from "../services/referidos/getCodigoReferido";
import { contarReferidos } from "../services/referidos/contarReferidos";

const tips = [
  {
    id: 1,
    title: "Identifícate al hablar",
    content:
      "Al inicio de la grabación y cada vez que alguien tome la palabra, es útil decir su nombre. Ejemplo: 'Habla Juan Pérez...'. Esto ayuda a la IA a asignar correctamente quién dijo qué.",
  },
  {
    id: 2,
    title: "Contexto inicial",
    content:
      "Menciona el lugar, la fecha y la hora de inicio al comenzar la grabación. 'Siendo las 10 AM del 20 de octubre, iniciamos la reunión en la sala de juntas...'.",
  },
  {
    id: 3,
    title: "Micrófono externo",
    content:
      "Si es posible, usa un micrófono externo o de solapa. Los micrófonos integrados de laptops a veces captan mucho ruido ambiental.",
  },
  {
    id: 4,
    title: "Evita el ruido de fondo",
    content:
      "Cierra ventanas y puertas. El ruido de tráfico, aire acondicionado o conversaciones paralelas puede afectar la precisión de la transcripción.",
  },
  {
    id: 5,
    title: "Una persona a la vez",
    content:
      "Traten de no hablar todos al mismo tiempo. Las superposiciones de voz son difíciles de procesar incluso para un humano.",
  },
  {
    id: 6,
    title: "Acércate al micrófono",
    content:
      "Si están en una mesa grande, asegúrense de que el dispositivo de grabación esté en el centro o cerca de quien habla.",
  },
  {
    id: 7,
    title: "Formatos de alta calidad",
    content:
      "Prefiere formatos como MP3 de alta calidad, WAV o M4A. Evita audios muy comprimidos como los de WhatsApp reenviados muchas veces.",
  },
  {
    id: 8,
    title: "Pausas claras",
    content:
      "Haz pausas breves entre frases y temas. Esto ayuda a la IA a puntuar correctamente y separar las ideas en el acta.",
  },
  {
    id: 9,
    title: "Evita ruidos en la mesa",
    content:
      "Evita golpear la mesa, teclear fuerte o mover papeles cerca del micrófono, ya que estos ruidos pueden tapar las voces.",
  },
  {
    id: 10,
    title: "Prueba de audio",
    content:
      "Haz una grabación de prueba de 10 segundos antes de la reunión real para verificar que todos se escuchen bien.",
  },
];

function TipsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tips.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const nextTip = () => setCurrentIndex((prev) => (prev + 1) % tips.length);
  const prevTip = () =>
    setCurrentIndex((prev) => (prev - 1 + tips.length) % tips.length);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 text-purple-600">
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
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h3 className="font-bold text-lg">Tips para mejores actas</h3>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h4 className="font-semibold text-gray-900 text-lg mb-2 transition-all duration-300">
          {tips[currentIndex].title}
        </h4>
        <p className="text-gray-600 text-sm transition-all duration-300">
          {tips[currentIndex].content}
        </p>
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={prevTip}
          className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex gap-1">
          {tips.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? "w-4 bg-purple-600" : "w-1.5 bg-gray-300"}`}
            />
          ))}
        </div>
        <button
          onClick={nextTip}
          className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function GoogleReviewCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm h-full flex flex-col items-center text-center justify-center relative overflow-hidden">
      <div className="mb-4 p-3 bg-yellow-50 rounded-full">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="#FABB05"
          className="text-yellow-500"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      </div>

      <h3 className="font-bold text-lg text-gray-900 mb-2">
        ¿Te gusta nuestro servicio?
      </h3>
      <p className="text-gray-600 text-sm mb-6">
        Ayúdanos a crecer dejándonos una reseña. ¡Tu opinión es muy valiosa para
        nosotros!
      </p>

      <a
        href="https://actasdereuniones.ai/resenas/"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors text-center"
      >
        Deja tu reseña
      </a>
    </div>
  );
}

function ReferralProgramCard() {
  const { data: session } = useSession();
  const [referralCode, setReferralCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contadorReferidos, setContadorReferidos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const datosCargadosRef = useRef(false);

  useEffect(() => {
    const cargarDatos = async () => {
      if (session?.user?.email && !datosCargadosRef.current) {
        setCargando(true);
        try {
          const codigo = await getCodigoReferido();
          if (codigo) {
            setReferralCode(codigo);
          }
          const contador = await contarReferidos();
          setContadorReferidos(contador);
          datosCargadosRef.current = true;
        } catch (error) {
          console.error("Error al cargar datos de referidos:", error);
        } finally {
          setCargando(false);
        }
      } else if (!session?.user?.email) {
        datosCargadosRef.current = false;
        setReferralCode("");
        setContadorReferidos(0);
        setCargando(true);
      } else if (datosCargadosRef.current) {
        setCargando(false);
      }
    };
    cargarDatos();
  }, [session?.user?.email]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Código copiado al portapapeles");
  };

  const handleRedeemCode = () => {
    if (!inputCode.trim()) return;

    toast.info("El código de referido se ingresa al generar tu primera acta");
    setInputCode("");
  };

  const handleCanjear = () => {
    const numeroWhatsApp = "573122995191";
    const mensaje = encodeURIComponent(
      "Hola, he alcanzado 3 referidos y quiero solicitar mi acta de cortesía de máximo una hora.",
    );
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensaje}`;
    window.open(urlWhatsApp, "_blank");
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 text-purple-600">
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
            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
          />
        </svg>
        <h3 className="font-bold text-lg">Programa de Referidos</h3>
      </div>

      <div className="flex-1">
        <p className="text-sm text-gray-600 mb-4">
          Comparte tu código y gana. Por cada 3 amigos que usen tu código, ¡te
          regalamos un acta de 1 hora!
        </p>

        {}
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-6 flex items-center justify-between">
          <div>
            <span className="text-xs text-purple-600 font-semibold block uppercase tracking-wider">
              Tu código único
            </span>
            {cargando ? (
              <span className="text-lg font-bold text-gray-400 tracking-widest">
                Cargando...
              </span>
            ) : referralCode ? (
              <span className="text-lg font-bold text-gray-900 tracking-widest">
                {referralCode}
              </span>
            ) : (
              <span className="text-lg font-bold text-gray-400 tracking-widest">
                No disponible
              </span>
            )}
          </div>
          {referralCode && (
            <button
              onClick={copyToClipboard}
              className="p-2 text-purple-600 hover:bg-purple-100 rounded-md transition-colors"
              title="Copiar código"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}
        </div>

        {}
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-700">Tu progreso</span>
            <span className="text-purple-600 font-bold">
              {cargando
                ? "..."
                : (() => {
                    const progresoActual =
                      contadorReferidos % 3 === 0 && contadorReferidos > 0
                        ? 3
                        : contadorReferidos % 3;
                    const totalRedenciones = Math.floor(contadorReferidos / 3);
                    return (
                      <>
                        {progresoActual}/3 referidos
                        {contadorReferidos > 0 && (
                          <span className="text-gray-600 ml-2">
                            - {contadorReferidos}{" "}
                            {contadorReferidos === 1
                              ? "referido total"
                              : "referidos totales"}
                          </span>
                        )}
                      </>
                    );
                  })()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${(() => {
                  const progresoActual =
                    contadorReferidos % 3 === 0 && contadorReferidos > 0
                      ? 3
                      : contadorReferidos % 3;
                  return Math.min((progresoActual / 3) * 100, 100);
                })()}%`,
              }}
            ></div>
          </div>
        </div>

        {}
        <div className="mb-4">
          <Button
            onClick={handleCanjear}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2"
          >
            Canjear
          </Button>
        </div>

         {}
         <div className="border-t border-gray-100 pt-4">
           <p className="text-xs text-gray-600">
             <strong>Nota:</strong> El código de referido solo es válido para
             usuarios nuevos y se redime al momento de pagar su primera acta.
             No se acumula con códigos de atención.
           </p>
         </div>
      </div>
    </div>
  );
}

export default function BottomSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mt-8">
      <div className="h-full">
        <TipsCarousel />
      </div>
      <div className="h-full">
        <GoogleReviewCard />
      </div>
      <div className="h-full">
        <ReferralProgramCard />
      </div>
    </div>
  );
}
