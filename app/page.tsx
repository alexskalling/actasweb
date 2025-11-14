'use client'
import NavComponent from "./(generador)/components/navComponent";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { CheckCheckIcon, MinusIcon, PlusIcon, Sparkles, Clock, Shield, Zap, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const faqs = [
  {
    question: "¿Cómo funciona el servicio?",
    answer:
      "Sube un archivo de audio, procesamos la transcripción con herramientas de IA avanzadas y generamos una pre-acta editable lista para usar",
  },
  {
    question: "¿Qué formatos de archivo son compatibles?",
    answer:
      "Aceptamos grabaciones de plataformas como Teams, Zoom, Google Meet, entre otros, en formatos MP3, M4A, MP4, MOV",
  },
  {
    question:
      "¿Puede la herramienta entender anglicismos o expresiones en otros idiomas?",
    answer:
      "Sí, nuestra herramienta de inteligencia artificial reconoce hasta 102 idiomas, ofreciendo transcripciones claras y precisas de reuniones en múltiples idiomas",
  },
  {
    question:
      "¿Es necesario suscribirse al servicio para generar actas de reunión?",
    answer: "No, ofrecemos un modelo de pago por uso para mayor flexibilidad",
  },
  {
    question: "¿Qué información incluye la pre-acta generada?",
    answer:
      "Título, orden del día, temas tratados, decisiones, puntos clave, elementos de acción y espacios para firmas. Entregamos la pre-acta en un formato editable para que la personalices según tus necesidades",
  },
  {
    question: "¿Las actas generadas cumplen con la normativa legal?",
    answer:
      "Sí, nuestras actas de las reuniones cumplen con la Ley 675 de Propiedad Horizontal en Colombia",
  },
  {
    question: "¿Es posible usar el servicio desde cualquier dispositivo?",
    answer: "Sí, funciona perfectamente desde computadora, celular o tableta",
  },
];

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  // Interceptar redirecciones de ePayco y procesar el pago
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const epaycoResponse = params.get('epayco_response');
    const refPayco = params.get('ref_payco') || params.get('x_ref_payco');
    
    // Si no hay parámetros de ePayco, no hacer nada
    if (!epaycoResponse && !refPayco) {
      return;
    }

    console.log("🔍 Redirección de ePayco detectada");
    
    // Extraer parámetros del archivo de la URL ANTES de limpiarla
    const file = params.get('file');
    const folder = params.get('folder');
    const fileid = params.get('fileid');
    const duration = params.get('duration');
    
    console.log("🔍 Parámetros:", { refPayco, file, folder, fileid, duration });

    // Limpiar la URL INMEDIATAMENTE para evitar recargas
    window.history.replaceState({}, '', '/');
    
    // Procesar el pago
    const processEpaycoRedirect = async () => {
      try {
        if (!refPayco || !file) {
          console.error("❌ Faltan parámetros necesarios");
          window.location.href = '/plataforma';
          return;
        }

        // Verificar el pago usando la API de ePayco
        const verifyUrl = `https://api.secure.epayco.co/v1/transaction/response.json?ref_payco=${refPayco}&public_key=${process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}`;
        
        console.log("🔍 Verificando pago...");
        const response = await fetch(verifyUrl);
        const data = await response.json();
        
        if (data.success && data.data) {
          const transaction = data.data;
          
          if (transaction.x_response === "Aceptada" || transaction.x_cod_response === 1) {
            console.log("✅ Pago aprobado, procesando...");
            
            // Procesar pago
            try {
              const processResponse = await fetch('/api/epayco/process-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  file,
                  folder,
                  fileid,
                  transactionId: transaction.x_transaction_id || transaction.transaction_id,
                  amount: transaction.x_amount || transaction.amount,
                  invoice: transaction.x_id_invoice || transaction.invoice,
                  email: session?.user?.email || '',
                  name: session?.user?.name || '',
                }),
              });
              
              await processResponse.json();
              console.log("✅ Pago procesado, redirigiendo a /plataforma");
            } catch (error) {
              console.error("❌ Error al procesar:", error);
            }
          }
        }
      } catch (error) {
        console.error("❌ Error:", error);
      } finally {
        // SIEMPRE redirigir a /plataforma al final
        window.location.href = '/plataforma';
      }
    };

    processEpaycoRedirect();
  }, [session]);

  const handleGetStarted = () => {
    if (session) {
      router.push('/plataforma');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="relative isolate z-0 bg-white">
      {process.env.NEXT_PUBLIC_PAGO !== "soporte" && (
        <>
          <NavComponent />
          
          {/* Hero Section */}
          <div className="relative isolate overflow-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-900">
            <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Transforma tus reuniones en
                  <span className="text-purple-300"> actas profesionales</span>
                  <span className="block mt-2">en minutos</span>
                </h1>
                <p className="mt-4 text-lg text-purple-100 sm:text-xl">
                  Inteligencia artificial que convierte tus grabaciones en actas formales y editables
                </p>
                <div className="mt-8 flex items-center justify-center gap-x-4">
                  <button
                    onClick={handleGetStarted}
                    className="group rounded-lg bg-white px-8 py-4 text-lg font-bold text-purple-900 shadow-lg hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200 flex items-center gap-2 hover:scale-105"
                  >
                    Comenzar
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <p className="mt-4 text-sm text-purple-200">
                  Registro en segundos
                </p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-purple-600">
                Potente y confiable
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Todo lo que necesitas en un solo lugar
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Una solución completa para generar actas profesionales de manera rápida, 
                segura y eficiente.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-purple-600">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    Rápido y eficiente
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">
                      Procesa tus grabaciones en 3-10 minutos. Sube, paga y descarga tu acta 
                      lista para usar sin complicaciones.
                    </p>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-purple-600">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    Actas profesionales
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">
                      Documentos editables que incluyen orden del día, decisiones, puntos clave 
                      y espacios para firmas. Cumplen con la normativa legal colombiana.
                    </p>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-purple-600">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    Seguro y privado
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">
                      Protocolos avanzados de seguridad y cumplimiento con la Ley 1581 de 2012 
                      para la protección de datos en Colombia.
                    </p>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* How it works */}
          <div id="como-funciona" className="bg-gray-50 py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl lg:text-center">
                <h2 className="text-base font-semibold leading-7 text-purple-600">
                  Proceso simple
                </h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Cómo funciona tu reunión con IA
                </p>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Con tan solo 4 pasos, tendrás lista tu acta formal, ideal
                  para reuniones realizadas por plataformas como Teams, Zoom
                  y Google Meet.
                </p>
              </div>
              <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
                <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                  <div className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
                        <span className="text-white font-bold">1</span>
                      </div>
                      Sube tu archivo de audio
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-600">
                      Carga fácilmente grabaciones en formatos compatibles
                      como MP3, M4A, MP4, MOV, entre otros. Compatible con 
                      grabaciones de Zoom, Teams y Google Meet.
                    </dd>
                  </div>
                  <div className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
                        <span className="text-white font-bold">2</span>
                      </div>
                      Paga de forma sencilla
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-600">
                      Utiliza la pasarela de pagos ePayco para transacciones
                      seguras con tarjetas, transferencias bancarias o pagos
                      en efectivo. Modelo de pago por uso, sin suscripciones.
                    </dd>
                  </div>
                  <div className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
                        <span className="text-white font-bold">3</span>
                      </div>
                      Procesamiento con IA
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-600">
                      Nuestra inteligencia artificial transforma tu grabación 
                      en una transcripción completa y una pre-acta editable que 
                      incluye los puntos clave y elementos de acción más importantes.
                    </dd>
                  </div>
                  <div className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
                        <span className="text-white font-bold">4</span>
                      </div>
                      Descarga tu acta
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-600">
                      Obtén tu transcripción completa y la pre-acta en un documento 
                      profesional editable. Ajusta los detalles necesarios y cumple 
                      con la normativa legal de Colombia.
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-2xl lg:max-w-none">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="flex flex-col rounded-2xl bg-purple-600 p-8">
                  <Clock className="h-8 w-8 text-white mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Tiempo estimado
                  </h3>
                  <p className="text-purple-100">
                    El proceso puede tardar entre 3 y 10 minutos,
                    dependiendo de la duración y la calidad del audio
                  </p>
                </div>
                <div className="flex flex-col rounded-2xl bg-gray-900 p-8">
                  <Shield className="h-8 w-8 text-white mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Seguridad garantizada
                  </h3>
                  <p className="text-gray-300">
                    Protocolos avanzados de seguridad y cumplimiento con la 
                    Ley 1581 de 2012 para la protección de datos en Colombia
                  </p>
                </div>
                <div className="flex flex-col rounded-2xl bg-purple-600 p-8">
                  <Zap className="h-8 w-8 text-white mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Recomendaciones
                  </h3>
                  <p className="text-purple-100">
                    Usa grabaciones claras, asegura una conexión estable y 
                    ten lista tu información de pago para una experiencia óptima
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-purple-950">
            <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  ¿Listo para simplificar tus actas?
                </h2>
                <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-purple-200">
                  Únete a cientos de profesionales que ya están ahorrando tiempo 
                  y generando actas profesionales con inteligencia artificial.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <button
                    onClick={handleGetStarted}
                    className="rounded-lg bg-white px-6 py-3 text-base font-semibold text-purple-900 shadow-sm hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200 flex items-center gap-2"
                  >
                    Comenzar ahora
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white">
            <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
              <div className="mx-auto max-w-4xl divide-y divide-gray-900/10">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl text-center mb-12">
                  Preguntas Frecuentes
                </h2>
                <dl className="mt-10 space-y-6 divide-y divide-gray-900/10">
                  {faqs.map((faq) => (
                    <Disclosure as="div" key={faq.question} className="pt-6">
                      <dt>
                        <DisclosureButton className="flex w-full items-start justify-between text-left text-gray-900">
                          <span className="text-base font-semibold leading-7">
                            {faq.question}
                          </span>
                          <span className="ml-6 flex h-7 items-center">
                            <PlusIcon
                              className="h-6 w-6 group-data-[open]:hidden"
                              aria-hidden="true"
                            />
                            <MinusIcon
                              className="h-6 w-6 group-[&:not([data-open])]:hidden"
                              aria-hidden="true"
                            />
                          </span>
                        </DisclosureButton>
                      </dt>
                      <DisclosurePanel as="dd" className="mt-2 pr-12">
                        <p className="text-base leading-7 text-gray-600">
                          {faq.answer}
                        </p>
                      </DisclosurePanel>
                    </Disclosure>
                  ))}
                </dl>
                <div className="mt-12 text-center">
                  <Link
                    href="https://actasdereuniones.ai/contacto/"
                    target="_blank"
                    className="text-lg font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    Resuelve más dudas aquí <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="relative isolate overflow-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-900">
            <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  ¡Crea tu acta fácilmente y olvídate de tomar notas!
                </h2>
                <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-purple-200">
                  Optimiza tu tiempo y olvida las notas de reunión. Gracias a
                  la inteligencia artificial, obtén actas rápidas, seguras y
                  editables, listas para ser el soporte perfecto de tus
                  decisiones.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <button
                    onClick={handleGetStarted}
                    className="rounded-lg bg-white px-6 py-3 text-base font-semibold text-purple-900 shadow-sm hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200 flex items-center gap-2"
                  >
                    Genera tu acta ahora
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
