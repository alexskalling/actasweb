'use client'

import { useState, useEffect } from 'react'
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react'
import {
  EllipsisVerticalIcon,
} from '@heroicons/react/20/solid'
import Image from 'next/image'

import MediaFileUploaderComponent from '../components/mediaFileUploaderComponent'
import HistorialActasComponent from '../components/historialActasComponent'

import { useSession, signOut } from 'next-auth/react'
import EditProfileForm from './perfil/components/editProfileForm'
import { track } from '../utils/analytics'
import { checkBillingData } from '../services/billing/checkBillingData'

export default function PlataformaPage() {
  const { data: session } = useSession()
  const [reloadTrigger, setReloadTrigger] = useState(false);
  const [silentReload, setSilentReload] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false)
  const [hasCheckedBilling, setHasCheckedBilling] = useState(false)

  // Verificar datos de facturación y abrir formulario si faltan datos (solo una vez al cargar)
  useEffect(() => {
    const verifyBillingData = async () => {
      if (session?.user?.email && !hasCheckedBilling) {
        try {
          const check = await checkBillingData();
          console.log("Verificación de datos de facturación:", check);
          // Si no tiene datos completos, abrir el formulario automáticamente
          if (!check.hasCompleteData) {
            console.log("Abriendo formulario automáticamente - faltan datos");
            setShowEditForm(true);
          } else {
            console.log("Usuario tiene todos los datos de facturación");
          }
          setHasCheckedBilling(true);
        } catch (error) {
          console.error("Error al verificar datos de facturación:", error);
          setHasCheckedBilling(true);
        }
      }
    };

    // Esperar un poco para que la sesión esté completamente cargada
    const timer = setTimeout(() => {
      verifyBillingData();
    }, 500);

    return () => clearTimeout(timer);
  }, [session, hasCheckedBilling]);

  // Abrir formulario automáticamente si viene con query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openProfile') === 'true') {
      setShowEditForm(true);
      // Limpiar el query param de la URL
      window.history.replaceState({}, '', '/plataforma');
    }
  }, []);

  // Track acceso a plataforma
  useEffect(() => {
    if (session) {
      track('acceso_plataforma', {
        'event_category': 'plataforma',
        'event_label': 'usuario_accede_plataforma',
        'user_name': session.user?.name,
        'user_email': session.user?.email
      });
    }
  }, [session]);

  return (
    <>
      <main>
        <header className="relative border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-5">
            <div className="flex flex-row items-start justify-between gap-3 sm:gap-4">
              {/* Info Usuario */}
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg text-purple-900 flex-shrink-0" width={24} height={24} viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19 2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4l3 3l3-3h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2m-7 3c1.727 0 3 1.272 3 3s-1.273 3-3 3c-1.726 0-3-1.272-3-3s1.274-3 3-3M7.177 16c.558-1.723 2.496-3 4.823-3s4.266 1.277 4.823 3z" />
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

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                  <button
                    onClick={() => {
                      // Track edición perfil
                      track('edicion_perfil', {
                        'event_category': 'plataforma',
                        'event_label': 'usuario_edita_perfil'
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
                    {/* Tooltip */}
                    <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      Actualizar información
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      // Track cerrar sesión
                      track('cerrar_sesion', {
                        'event_category': 'autenticacion',
                        'event_label': 'usuario_cierra_sesion',
                        'user_name': session?.user?.name
                      });

                      // Redirección usando la variable de entorno
                      const callbackUrl = process.env.NEXT_PUBLIC_AMBIENTE_URL || 'https://generador.actas.com';

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
                    {/* Tooltip */}
                    <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      Cerrar sesión
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                    </span>
                  </button>
                </div>
              </div>

              {/* 👉 Formulario Editar Perfil */}
              {showEditForm && (
                <div className="mt-3 sm:mt-4 flex justify-center">
                  <EditProfileForm onClose={() => setShowEditForm(false)} />
                </div>
              )}
            </div>
        </header>

        <div className="mx-auto max-w-7xl px-1 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Generador - Primero en mobile, sidebar derecha en desktop */}
            <div className="order-1 lg:order-2 lg:col-start-3 space-y-4 sm:space-y-6">
              {/* Generador */}
              <div>
                <MediaFileUploaderComponent onCheckActa={() => {
                  setSilentReload(true);
                  setReloadTrigger(prev => !prev);
                  // Resetear silentReload después de un momento
                  setTimeout(() => setSilentReload(false), 100);
                }} />
              </div>

              {/* Alerta Recuerda - Abajo del generador */}
              <div className="bg-purple-500 text-white p-3 sm:p-4 rounded-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-6 flex-shrink-0 mt-0.5"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <div>
                    <h3 className="font-bold text-lg sm:text-xl mb-1">
                      Recuerda
                    </h3>
                    <p className="text-white text-sm sm:text-base">
                      En el proceso de pago recuerda dar click en &quot;Volver al comercio&quot; o &quot;Finalizar proceso&quot; en caso de que no se haga de manera automática
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Historial Component - Segundo en mobile, lado izquierdo en desktop */}
            <div className="order-2 lg:order-1 lg:col-span-2">
              <HistorialActasComponent reloadTrigger={reloadTrigger} silentReload={silentReload} />
            </div>
          </div>

          {/* Sección de Soporte */}
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200">
            <div className="text-center md:text-left">
              <h3 className="font-bold text-lg sm:text-xl text-purple-600 mb-3 sm:mb-4">
                📞 Soporte
              </h3>
              <div className="space-y-2 text-sm sm:text-base text-gray-700">
                <p>
                  Nuestro horario de atención es de lunes a viernes de 8:00 AM a 6:00 PM
                </p>
                <p>
                  En caso de que necesites soporte, puedes contactarte por WhatsApp con:
                </p>
              </div>

              <div className="mt-3 space-y-1 text-sm sm:text-base">
                <p className="text-gray-900">
                  • <strong className="text-purple-600">Sebastian:</strong> +57 312 299 5191
                </p>
                <p className="text-gray-900">
                  • <strong className="text-purple-600">Guillermo:</strong> +56 9 4587 1929
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
