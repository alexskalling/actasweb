"use client";

import { useState, useEffect } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";
import Image from "next/image";

import MediaFileUploaderComponent from "../components/mediaFileUploaderComponent";
import HistorialActasComponent from "../components/historialActasComponent";
import BottomSection from "../components/bottomSection";
import SoporteSelectorComponent from "../components/soporteSelectorComponent";

import { useSession, signOut } from "next-auth/react";
import EditProfileForm from "./perfil/components/editProfileForm";
import { track } from "../utils/analytics";
import { checkBillingData } from "../services/billing/checkBillingData";
import { getUserType } from "../services/user/getUserType";
import { getUserId } from "../services/user/getUserId";
import { UsuarioEncontrado } from "../services/user/buscarUsuarioPorEmail";

export default function PlataformaPage() {
  const { data: session } = useSession();
  const [reloadTrigger, setReloadTrigger] = useState(false);
  const [silentReload, setSilentReload] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [hasCheckedBilling, setHasCheckedBilling] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [loadingUserType, setLoadingUserType] = useState(true);

  const [usuarioSoporteSeleccionado, setUsuarioSoporteSeleccionado] =
    useState<UsuarioEncontrado | null>(null);
  const [tipoAtencionSoporte, setTipoAtencionSoporte] = useState<
    "acta_nueva" | "regeneracion_total" | null
  >(null);
  const [idTransaccionSoporte, setIdTransaccionSoporte] = useState<string>("");
  const [idUsuarioSoporte, setIdUsuarioSoporte] = useState<string | null>(null);
  const [precioActa, setPrecioActa] = useState<number | null>(null);

  useEffect(() => {
    const verifyBillingData = async () => {
      if (session?.user?.email && !hasCheckedBilling) {
        try {
          const check = await checkBillingData();

          if (!check.hasCompleteData) {
            setShowEditForm(true);
          } else {
          }
          setHasCheckedBilling(true);
        } catch (error) {
          console.error("Error al verificar datos de facturación:", error);
          setHasCheckedBilling(true);
        }
      }
    };

    const timer = setTimeout(() => {
      verifyBillingData();
    }, 500);

    return () => clearTimeout(timer);
  }, [session, hasCheckedBilling]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("openProfile") === "true") {
      setShowEditForm(true);

      window.history.replaceState({}, "", "/plataforma");
    }
  }, []);

  useEffect(() => {
    const fetchUserType = async () => {
      if (session?.user?.email) {
        try {
          const type = await getUserType();
          setUserType(type);

          if (type === "soporte") {
            const userId = await getUserId();
            setIdUsuarioSoporte(userId);
          }
        } catch (error) {
          console.error("Error al obtener tipo de usuario:", error);
          setUserType("cliente");
        } finally {
          setLoadingUserType(false);
        }
      } else {
        setLoadingUserType(false);
      }
    };

    fetchUserType();
  }, [session]);

  useEffect(() => {
    if (session) {
      track("acceso_plataforma", {
        event_category: "plataforma",
        event_label: "usuario_accede_plataforma",
        user_name: session.user?.name,
        user_email: session.user?.email,
      });
    }
  }, [session]);

  if (loadingUserType || !session) {
    return (
      <main className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          </div>
        </div>
      </main>
    );
  }

  const isSupportUser = userType === "soporte";

  return (
    <>
      <main className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          {}
          <div className="flex flex-col lg:grid lg:grid-cols-12 lg:items-stretch gap-4 sm:gap-6 lg:gap-8">
            {}
            <div className="order-1 lg:col-span-12 bg-white border border-gray-200 p-4 sm:p-5 rounded-lg shadow-sm">
              <div className="flex flex-row items-start justify-between gap-3 sm:gap-4">
                {}
                <div className="flex items-center gap-3 sm:gap-4">
                  {session?.user?.image ? (
                    <Image
                      src={session?.user?.image ?? ""}
                      alt={`Foto de perfil de ${session?.user?.name}`}
                      width={64}
                      height={64}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg text-purple-900 flex-shrink-0"
                      width={24}
                      height={24}
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="currentColor"
                        d="M19 2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4l3 3l3-3h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2m-7 3c1.727 0 3 1.272 3 3s-1.273 3-3 3c-1.726 0-3-1.272-3-3s1.274-3 3-3M7.177 16c.558-1.723 2.496-3 4.823-3s4.266 1.277 4.823 3z"
                      />
                    </svg>
                  )}

                  <div>
                    <div className="text-xs sm:text-sm text-gray-500">
                      Bienvenido
                    </div>
                    <div className="text-sm sm:text-base font-semibold text-gray-900">
                      {session?.user?.name}
                    </div>
                  </div>
                </div>

                {}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                  <button
                    onClick={() => {
                      track("edicion_perfil", {
                        event_category: "plataforma",
                        event_label: "usuario_edita_perfil",
                      });
                      setShowEditForm(!showEditForm);
                    }}
                    className="group relative flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Actualizar información de contacto"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-5 text-gray-600"
                      width={24}
                      height={24}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span className="hidden sm:inline">Actualizar</span>
                    {}
                    <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      Actualizar información
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      track("cerrar_sesion", {
                        event_category: "autenticacion",
                        event_label: "usuario_cierra_sesion",
                        user_name: session?.user?.name,
                      });

                      const callbackUrl =
                        process.env.NEXT_PUBLIC_AMBIENTE_URL ||
                        "https://generador.actas.com";

                      signOut({ callbackUrl });
                    }}
                    className="group relative flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors"
                    title="Cerrar sesión"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-5"
                      width={24}
                      height={24}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span className="hidden sm:inline">Salir</span>
                    {}
                    <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      Cerrar sesión
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                    </span>
                  </button>
                </div>
              </div>

              {}
              {showEditForm && (
                <div className="mt-3 sm:mt-4 flex justify-center border-t border-gray-100 pt-4">
                  <EditProfileForm onClose={() => setShowEditForm(false)} />
                </div>
              )}
            </div>

            {}
            <div className="order-2 lg:order-1 lg:col-span-8 bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <HistorialActasComponent
                reloadTrigger={reloadTrigger}
                silentReload={silentReload}
                isSupportUser={isSupportUser}
              />
            </div>

            {}
            <div className="order-2 lg:order-2 lg:col-span-4 lg:col-start-9 flex flex-col gap-4 sm:gap-6">
              {}
              {isSupportUser && (
                <SoporteSelectorComponent
                  onUsuarioSeleccionado={(usuario) => {
                    setUsuarioSoporteSeleccionado(usuario);
                  }}
                  onTipoAtencionSeleccionado={(tipo) => {
                    setTipoAtencionSoporte(tipo);

                    if (tipo !== "acta_nueva") {
                      setPrecioActa(null);
                    }
                  }}
                  onIdTransaccionCambiado={(idTransaccion) => {
                    setIdTransaccionSoporte(idTransaccion);
                  }}
                  precioActa={
                    tipoAtencionSoporte === "acta_nueva" ? precioActa : null
                  }
                />
              )}

              {}
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                <MediaFileUploaderComponent
                  onCheckActa={() => {
                    setSilentReload(true);
                    setReloadTrigger((prev) => !prev);
                    setTimeout(() => setSilentReload(false), 100);
                  }}
                  isSupportUser={isSupportUser}
                  usuarioSoporteSeleccionado={usuarioSoporteSeleccionado}
                  tipoAtencionSoporte={tipoAtencionSoporte}
                  idTransaccionSoporte={idTransaccionSoporte}
                  idUsuarioSoporte={idUsuarioSoporte}
                  onPrecioCalculado={(precio) => {
                    setPrecioActa(precio);
                  }}
                  disabled={
                    isSupportUser &&
                    (!usuarioSoporteSeleccionado || !tipoAtencionSoporte)
                  }
                  disabledMessage="Por favor, selecciona un tipo de atención y un usuario para continuar."
                />
              </div>

              {}
              {!isSupportUser && (
                <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                  <h3 className="font-bold text-lg text-purple-600 mb-3 flex items-center gap-2">
                    <span>📞</span> Soporte
                  </h3>
                  <div className="space-y-3 text-sm text-gray-700">
                    <p>
                      Nuestro horario de atención es de lunes a viernes de 8:00
                      AM a 6:00 PM
                    </p>
                    <p>
                      En caso de que necesites soporte, puedes contactarte por
                      WhatsApp con:
                    </p>

                    <div className="space-y-2 pt-1">
                      <a
                        href={`https://wa.me/573122995191?text=${encodeURIComponent(`Hola, soy ${session?.user?.name || "Usuario"}. Necesito ayuda con mi cuenta.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-green-500">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214l-3.741.982l.998-3.648l-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                        </span>
                        <span className="text-gray-900 group-hover:text-purple-700 transition-colors">
                          <strong className="text-purple-600">
                            Sebastian:
                          </strong>{" "}
                          +57 312 299 5191
                        </span>
                      </a>

                      <a
                        href={`https://wa.me/56945871929?text=${encodeURIComponent(`Hola, soy ${session?.user?.name || "Usuario"}. Necesito ayuda con mi cuenta.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-green-500">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214l-3.741.982l.998-3.648l-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                        </span>
                        <span className="text-gray-900 group-hover:text-purple-700 transition-colors">
                          <strong className="text-purple-600">
                            Guillermo:
                          </strong>{" "}
                          +56 9 4587 1929
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {}
          {!isSupportUser && (
            <div className="mt-8">
              <BottomSection />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
