'use client'
import GeneradorContainerContainer from "./(generador)/components/generadorContainerComponent";
import NavComponent from "./(generador)/components/navComponent";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { CardContent } from "@/components/ui/card";
import { CheckCheckIcon, MinusIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import EmailSignupBannerComponent from "./(generador)/components/emailSignupBannerComponent";
import { useSession } from "next-auth/react";
const faqs = [
  {
    question: "¿Cómo funciona el servicio?",
    answer:
      "Sube un archivo, procesamos la transcripción con herramientas de IA y generamos una pre-acta editable",
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
  // More questions...
];


export default function Home() {
  const { data: session } = useSession();
  return (
    <div className="relative isolate z-0 ">
      {process.env.NEXT_PUBLIC_PAGO != "soporte" && (
        <>
          <NavComponent />
          <div className=" mx-auto max-w-7xl">
            {" "}
            <div className="w-full rounded-sm bg-white">
              <div className="flex h-full">
                <div className="m-auto">
                  <CardContent className=" items-center justify-center ">
                    <h1 className="text-5xl  mt-5 font-bold text-purple-900 text-center mb-8">
                      Genera tu acta de reunión en minutos
                    </h1>
                    <h2 className="text-3xl   mt-5 font-bold text-center mb-8">
                      Transforma tu audio en un acta formal de manera rápida y
                      segura
                    </h2>
                    <p className="text-lg  text-gray-600">
                      ¿Eres administrador de propiedad horizontal y pierdes
                      tiempo redactando actas? Con nuestro{" "}
                      <span className=" font-bold">generador de actas</span>,{" "}
                      <span className=" font-bold">
                        simplifica la gestión de reuniones
                      </span>{" "}
                      y obtén un documento profesional en minutos. Nuestra
                      herramienta{" "}
                      <span className=" font-bold">
                        te ayuda a crear actas de reunión
                      </span>{" "}
                      de forma segura y precisa.
                    </p>
                  </CardContent>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div id="generador" className=" mx-auto max-w-5xl rounded-sm">

        {!session?(<>
          <EmailSignupBannerComponent />
          <GeneradorContainerContainer />
        </>):(
           <div className="bg-purple-600 max-w-2xl mx-auto  text-white p-6 rounded-lg shadow-lg mb-6 relative">


           <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
             <div className="flex items-center gap-4 flex-1 justify-center md:justify-start">
               <div>
                 <h3 className="font-bold text-xl">
                   Ingresar a mi plataforma de actas
                 </h3>
            
               </div>
             </div>
     
             <div className="flex justify-center md:justify-end w-full md:w-auto px-20">
               <Link
                 href="/plataforma"
                 className="bg-white hover:bg-purple-500 text-gray-900 px-6 py-2 rounded-md transition-colors"
               >
                 Ingresar
               </Link>
             </div>
           </div>
         </div>
        )}
        



       
      </div>

      {process.env.NEXT_PUBLIC_PAGO != "soporte" && (
        <>
          <div className=" mx-auto p-4 max-w-7xl">
            <div className="w-full rounded-sm bg-white">
              <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:max-w-none">
                  <div className="text-center">
                    <h3 className="text-3xl  mt-14 font-bold text-center mb-8">
                      Cómo funciona tu reunión con IA
                    </h3>
                    <p className="mt-4 text-lg/8 text-gray-600">
                      Con tan solo 4 pasos, tendrás lista tu acta formal, ideal
                      para reuniones realizadas por plataformas como Teams, Zoom
                      y Google Meet.
                    </p>
                  </div>
                  <dl className="mt-5 grid grid-cols-1 gap-0.5 overflow-hidden rounded-md  sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex flex-col bg-[#5A2D8E] p-8">
                      <dt className="text-sm  text-gray-300">
                        <span className="font-bold text-md text-white">
                          Sube tu archivo de audio{" "}
                        </span>
                        Carga fácilmente grabaciones en formatos compatibles
                        como MP3, M4A, MP4, MOV, entre otros
                      </dt>
                      <dd className="order-first text-3xl font-semibold tracking-tight text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={60}
                          height={60}
                          viewBox="0 0 24 24"
                          className="mx-auto"
                        >
                          <path
                            fill="currentColor"
                            d="M15 18h-2V6a2 2 0 0 0-2-2H9v2h2v12H9v2h6z"
                          ></path>
                        </svg>
                      </dd>
                    </div>
                    <div className="flex flex-col bg-[#5A2D8E] p-8">
                      <dt className="text-sm  text-gray-300">
                        <span className="font-bold text-md text-white">
                          Paga tu pre-acta de forma sencilla{" "}
                        </span>
                        Utiliza la pasarela de pagos Wompi para transacciones
                        seguras con tarjetas, transferencias bancarias o pagos
                        en efectivo
                      </dt>
                      <dd className="order-first text-3xl font-semibold tracking-tight text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={60}
                          height={60}
                          viewBox="0 0 24 24"
                          className="mx-auto"
                        >
                          <path
                            fill="currentColor"
                            d="M7 4h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9v5h8v2H7v-7a2 2 0 0 1 2-2h6V6H7z"
                          ></path>
                        </svg>
                      </dd>
                    </div>
                    <div className="flex flex-col bg-[#5A2D8E] p-8">
                      <dt className="text-sm  text-gray-300">
                        <span className="font-bold text-md text-white">
                          Nuestro sistema procesa la transcripción{" "}
                        </span>
                        Gracias a la avanzada inteligencia artificial,
                        transformamos tu grabación en una transcripción completa
                        y en una pre-acta editable que incluye los puntos clave
                        y los elementos de acción más importantes.
                      </dt>
                      <dd className="order-first text-3xl font-semibold tracking-tight text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={60}
                          height={60}
                          viewBox="0 0 24 24"
                          className="mx-auto"
                        >
                          <path
                            fill="currentColor"
                            d="M7 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7v-2h8v-5H8v-2h7V6H7z"
                          ></path>
                        </svg>
                      </dd>
                    </div>
                    <div className="flex flex-col bg-[#5A2D8E] p-8">
                      <dt className="text-sm  text-gray-300">
                        <span className="font-bold text-md text-white">
                          Descarga tu transcripción y tu pre-acta editable{" "}
                        </span>
                        Obtendrás todo el audio pasado a texto en la
                        transcripción y la pre-acta en un documento profesional
                        que te permitirá ajustar los detalles necesarios y
                        cumplir con la normativa legal de Colombia.
                      </dt>
                      <dd className="order-first text-3xl font-semibold tracking-tight text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={60}
                          height={60}
                          viewBox="0 0 24 24"
                          className="mx-auto"
                        >
                          <path
                            fill="currentColor"
                            d="M8.5 4v8h7V4h2v16h-2v-6h-7a2 2 0 0 1-2-2V4z"
                          ></path>
                        </svg>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>{" "}
            <section className="isolate overflow-hidden bg-white px-6 lg:px-8">
              <div className="relative mx-auto max-w-2xl py-24 sm:py-32 lg:max-w-4xl">
                <figure className="grid grid-cols-1 items-center gap-x-6 gap-y-8 lg:gap-x-10">
                  <div className="relative col-span-2 lg:col-start-1 lg:row-start-2">
                    <figcaption className="text-base lg:col-start-1 lg:row-start-3">
                      <h3 className="font-semibold text-3xl text-gray-900">
                        Tiempo estimado de entrega
                      </h3>
                    </figcaption>
                    <blockquote className="text-xl/8 mt-5  text-gray-600 ">
                      <p>
                        El proceso puede tardar entre 3 y 10 minutos,
                        dependiendo de la duración y la calidad del audio
                      </p>
                    </blockquote>
                  </div>
                  <div className="col-end-1 w-16 lg:row-span-4 lg:w-72">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={250}
                      height={250}
                      viewBox="0 0 24 24"
                      className="mx-auto text-purple-900"
                    >
                      <g fill="none" fillRule="evenodd">
                        <path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"></path>
                        <path
                          fill="currentColor"
                          d="M10.975 3.002a1 1 0 0 1-.754 1.196a8 8 0 0 0-.583.156a1 1 0 0 1-.59-1.911q.36-.112.73-.195a1 1 0 0 1 1.197.754m2.05 0a1 1 0 0 1 1.196-.754c4.454 1.01 7.78 4.992 7.78 9.752c0 5.523-4.478 10-10 10c-4.761 0-8.743-3.325-9.753-7.779a1 1 0 0 1 1.95-.442a8 8 0 1 0 9.58-9.58a1 1 0 0 1-.753-1.197M6.614 4.72a1 1 0 0 1-.053 1.414q-.222.205-.427.426A1 1 0 0 1 4.668 5.2q.255-.276.532-.533a1 1 0 0 1 1.414.053M12 6a1 1 0 0 1 1 1v4.586l2.707 2.707a1 1 0 0 1-1.414 1.414l-3-3A1 1 0 0 1 11 12V7a1 1 0 0 1 1-1M3.693 8.388a1 1 0 0 1 .661 1.25a8 8 0 0 0-.156.583a1 1 0 0 1-1.95-.442q.084-.37.195-.73a1 1 0 0 1 1.25-.661"
                        ></path>
                      </g>
                    </svg>
                  </div>
                </figure>
              </div>
            </section>
            <div className="overflow-hidden bg-white ">
              <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
                  <div className="lg:pr-8 lg:pt-4">
                    <div className="lg:max-w-lg">
                      <h3 className="mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 ">
                        Recomendaciones para una mejor experiencia
                      </h3>
                      <p className="mt-6 text-lg/8 text-gray-600">
                        Tips para facilitar el proceso
                      </p>
                      <dl className="mt-10 max-w-xl space-y-8 text-base/7 text-gray-600 lg:max-w-none">
                        <div className="relative pl-9">
                          <dt className="inline font-semibold text-gray-900">
                            <CheckCheckIcon
                              aria-hidden="true"
                              className="absolute left-1 top-1 size-5 text-indigo-600"
                            />
                          </dt>{" "}
                          <dd className="inline">
                            Usa grabaciones claras, incluso de reuniones en
                            tiempo real realizadas en Zoom, Microsoft Teams o
                            similares
                          </dd>
                        </div>
                      </dl>
                      <dl className="mt-10 max-w-xl space-y-8 text-base/7 text-gray-600 lg:max-w-none">
                        <div className="relative pl-9">
                          <dt className="inline font-semibold text-gray-900">
                            <CheckCheckIcon
                              aria-hidden="true"
                              className="absolute left-1 top-1 size-5 text-indigo-600"
                            />
                          </dt>{" "}
                          <dd className="inline">
                            Asegura una conexión estable
                          </dd>
                        </div>
                      </dl>
                      <dl className="mt-10 max-w-xl space-y-8 text-base/7 text-gray-600 lg:max-w-none">
                        <div className="relative pl-9">
                          <dt className="inline font-semibold text-gray-900">
                            <CheckCheckIcon
                              aria-hidden="true"
                              className="absolute left-1 top-1 size-5 text-indigo-600"
                            />
                          </dt>{" "}
                          <dd className="inline">
                            Ten lista la información de pago
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  <div className=" bg-purple-950/90 max-w-none rounded-sm ring-gray-400/10 ">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={250}
                      height={250}
                      viewBox="0 0 24 24"
                      className="mx-auto text-white mt-16"
                    >
                      <path
                        fill="currentColor"
                        d="M14.5 9.5C14.5 6.47 12.03 4 9 4S3.5 6.47 3.5 9.5c0 2.47 1.49 3.89 2.35 4.5h6.3c.86-.61 2.35-2.03 2.35-4.5"
                        opacity={0.3}
                      ></path>
                      <path
                        fill="currentColor"
                        d="M7 20h4c0 1.1-.9 2-2 2s-2-.9-2-2m-2-1h8v-2H5zm11.5-9.5c0 3.82-2.66 5.86-3.77 6.5H5.27c-1.11-.64-3.77-2.68-3.77-6.5C1.5 5.36 4.86 2 9 2s7.5 3.36 7.5 7.5m-2 0C14.5 6.47 12.03 4 9 4S3.5 6.47 3.5 9.5c0 2.47 1.49 3.89 2.35 4.5h6.3c.86-.61 2.35-2.03 2.35-4.5m6.87-2.13L20 8l1.37.63L22 10l.63-1.37L24 8l-1.37-.63L22 6zM19 6l.94-2.06L22 3l-2.06-.94L19 0l-.94 2.06L16 3l2.06.94z"
                      ></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-hidden bg-white mt-20">
              <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
                  <div className=" bg-purple-950/90 max-w-none rounded-sm ring-gray-400/10 ">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={250}
                      height={250}
                      viewBox="0 0 24 24"
                      className="mx-auto text-white mt-8"
                    >
                      <defs>
                        <path
                          id="solarWalletMoneyOutline0"
                          fill="currentColor"
                          d="M19 14a1 1 0 1 1-2 0a1 1 0 0 1 2 0"
                        ></path>
                      </defs>
                      <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="M20.924 11.75H18.23c-1.424 0-2.481 1.059-2.481 2.25s1.057 2.25 2.48 2.25h2.718c.206-.013.295-.152.302-.236v-4.028c-.007-.084-.096-.223-.302-.235zm-.074-1.5q.1-.001.19.004c.87.053 1.641.71 1.706 1.628c.004.06.004.125.004.185v3.866c0 .06 0 .125-.004.185c-.065.918-.836 1.575-1.707 1.629q-.089.004-.19.003h-2.618c-2.145 0-3.981-1.628-3.981-3.75s1.836-3.75 3.98-3.75z"
                        clipRule="evenodd"
                      ></path>
                      <use href="#solarWalletMoneyOutline0"></use>
                      <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="M20.85 10.25q.1-.001.19.004c.225.013.443.067.645.156c-.107-1.606-.402-2.844-1.326-3.769c-.749-.748-1.698-1.08-2.87-1.238l-.042-.005l-.032-.023l-3.736-2.477a3.99 3.99 0 0 0-4.358 0L5.586 5.375l-.033.023l-.042.005c-1.172.158-2.121.49-2.87 1.238c-.748.749-1.08 1.698-1.238 2.87c-.153 1.14-.153 2.595-.153 4.433v.112c0 1.838 0 3.294.153 4.433c.158 1.172.49 2.121 1.238 2.87c.749.748 1.698 1.08 2.87 1.238c1.14.153 2.595.153 4.433.153h3.112c1.838 0 3.294 0 4.433-.153c1.172-.158 2.121-.49 2.87-1.238c.924-.925 1.219-2.163 1.326-3.77q-.305.136-.646.158q-.089.004-.19.003h-.681c-.114 1.342-.371 2.05-.87 2.548c-.423.423-1.003.677-2.009.812c-1.027.138-2.382.14-4.289.14h-3c-1.907 0-3.261-.002-4.29-.14c-1.005-.135-1.585-.389-2.008-.812s-.677-1.003-.812-2.009c-.138-1.027-.14-2.382-.14-4.289s.002-3.261.14-4.29c.135-1.005.389-1.585.812-2.008s1.003-.677 2.009-.812c1.028-.138 2.382-.14 4.289-.14h3c1.907 0 3.262.002 4.29.14c1.005.135 1.585.389 2.008.812c.499.498.756 1.207.87 2.548zm-10.906-5h3.112q.775 0 1.46.003L12.85 4.148c-.8-.53-1.9-.53-2.7 0L8.483 5.253q.686-.004 1.46-.003"
                        clipRule="evenodd"
                      ></path>
                      <path
                        fill="currentColor"
                        d="M6 9.25a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5z"
                      ></path>
                      <use
                        href="#solarWalletMoneyOutline0"
                        fillRule="evenodd"
                        clipRule="evenodd"
                      ></use>
                    </svg>
                  </div>
                  <div className="lg:pr-8 lg:pt-4">
                    <div className="lg:max-w-lg">
                      <h3 className=" text-pretty text-3xl font-semibold tracking-tight text-gray-900 ">
                        Opciones de pago seguras y flexibles
                      </h3>
                      <p className="mt-6 text-lg/8 text-gray-600">
                        Paga como prefieras y de forma confiable
                      </p>
                      <dl className="mt-10 max-w-xl space-y-8 text-base/7 text-gray-600 lg:max-w-none">
                        <div className="relative pl-9">
                          <dt className="inline font-semibold text-gray-900">
                            <CheckCheckIcon
                              aria-hidden="true"
                              className="absolute left-1 top-1 size-5 text-indigo-600"
                            />
                          </dt>{" "}
                          <dd className="inline">
                            Métodos de pago variados: Aceptamos tarjetas,
                            transferencias y pagos en efectivo
                          </dd>
                        </div>
                      </dl>
                      <dl className="mt-10 max-w-xl space-y-8 text-base/7 text-gray-600 lg:max-w-none">
                        <div className="relative pl-9">
                          <dt className="inline font-semibold text-gray-900">
                            <CheckCheckIcon
                              aria-hidden="true"
                              className="absolute left-1 top-1 size-5 text-indigo-600"
                            />
                          </dt>{" "}
                          <dd className="inline">
                            Seguridad garantizada: Utilizamos plataformas como
                            Wompi y Bancolombia
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-hidden bg-white mt-20">
              <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
                  <div className="lg:pr-8 lg:pt-4">
                    <div className="lg:max-w-lg">
                      <h3 className="mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 ">
                        Seguridad y privacidad
                      </h3>
                      <p className="mt-6 text-lg/8 text-gray-600">
                        Tu información está protegida
                      </p>
                      <dl className="mt-10 max-w-xl space-y-8 text-base/7 text-gray-600 lg:max-w-none">
                        <div className="relative pl-9">
                          <dt className="inline font-semibold text-gray-900">
                            <CheckCheckIcon
                              aria-hidden="true"
                              className="absolute left-1 top-1 size-5 text-indigo-600"
                            />
                          </dt>{" "}
                          <dd className="inline">
                            Contamos con protocolos avanzados de seguridad
                          </dd>
                        </div>
                      </dl>
                      <dl className="mt-10 max-w-xl space-y-8 text-base/7 text-gray-600 lg:max-w-none">
                        <div className="relative pl-9">
                          <dt className="inline font-semibold text-gray-900">
                            <CheckCheckIcon
                              aria-hidden="true"
                              className="absolute left-1 top-1 size-5 text-indigo-600"
                            />
                          </dt>{" "}
                          <dd className="inline">
                            Cumplimos con la Ley 1581 de 2012 para la protección
                            de datos y privacidad en Colombia
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  <div className=" bg-purple-950/90 max-w-none rounded-sm ring-gray-400/10 ">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={250}
                      height={250}
                      viewBox="0 0 24 24"
                      className="mx-auto text-white mt-3"
                    >
                      <g fill="none" fillRule="evenodd">
                        <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"></path>
                        <path
                          fill="currentColor"
                          d="M11.298 2.195a2 2 0 0 1 1.232-.055l.172.055l7 2.625a2 2 0 0 1 1.291 1.708l.007.165v5.363a9 9 0 0 1-4.709 7.911l-.266.139l-3.354 1.677a1.5 1.5 0 0 1-1.198.062l-.144-.062l-3.354-1.677a9 9 0 0 1-4.97-7.75l-.005-.3V6.693a2 2 0 0 1 1.145-1.808l.153-.065zM12 4.068L5 6.693v5.363a7 7 0 0 0 3.635 6.138l.235.123L12 19.882l3.13-1.565a7 7 0 0 0 3.865-5.997l.005-.264V6.693zm-.492 3.448a1.4 1.4 0 0 1 .846-.043l.138.043l2.8 1.05a1.4 1.4 0 0 1 .902 1.178l.006.133v2.145a4.2 4.2 0 0 1-2.131 3.655l-.19.102l-1.342.67a1.2 1.2 0 0 1-.944.056l-.13-.055l-1.341-.671a4.2 4.2 0 0 1-2.316-3.54l-.006-.217V9.877a1.4 1.4 0 0 1 .786-1.258l.122-.053zM12 9.468l-2.2.825v1.73a2.2 2.2 0 0 0 1.07 1.887l.146.08l.984.492l.984-.492a2.2 2.2 0 0 0 1.21-1.802l.006-.166v-1.729z"
                        ></path>
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white">
            <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 ">
              <div className="mx-auto max-w-4xl">
                <h3 className="text-3xl  mt-14 font-bold text-center mb-8">
                  Preguntas Frecuentes
                </h3>
                <dl className="mt-16 divide-y divide-gray-900/10">
                  {faqs.map((faq) => (
                    <Disclosure
                      key={faq.question}
                      as="div"
                      className="py-6 first:pt-0 last:pb-0"
                    >
                      <dt>
                        <DisclosureButton className="group flex w-full items-start justify-between text-left text-gray-900">
                          <span className="text-base/7 font-semibold">
                            {faq.question}
                          </span>
                          <span className="ml-6 flex h-7 items-center">
                            <PlusIcon
                              aria-hidden="true"
                              className="size-6 group-data-[open]:hidden"
                            />
                            <MinusIcon
                              aria-hidden="true"
                              className="size-6 group-[&:not([data-open])]:hidden"
                            />
                          </span>
                        </DisclosureButton>
                      </dt>
                      <DisclosurePanel as="dd" className="mt-2 pr-12">
                        <p className="text-base/7 text-gray-600">
                          {faq.answer}
                        </p>
                      </DisclosurePanel>
                    </Disclosure>
                  ))}
                </dl>
                <div className=" w-full flex">
                  {" "}
                  <Link
                    href="https://actasdereuniones.ai/contacto/"
                    target="_blank"
                    className="text-xl mx-auto text-purple-800  mt-14 font-bold text-center mb-8"
                  >
                    Resuelve más dudas aquí
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="relative isolate overflow-hidden bg-purple-950">
            <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  ¡Crea tu acta fácilmente y olvídate de tomar notas!
                </h2>
                <p className="mx-auto mt-6 max-w-7xl text-pretty text-lg/8 text-gray-300">
                  Optimiza tu tiempo y olvida las notas de reunión. Gracias a
                  la inteligencia artificial, obtén actas rápidas, seguras y
                  editables, listas para ser el soporte perfecto de tus
                  decisiones.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <a
                    href="#generador"
                    className="rounded-sm bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Genera tu acta ahora
                  </a>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
