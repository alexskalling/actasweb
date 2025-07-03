'use client'

import { useState } from 'react'
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react'
import {
  EllipsisVerticalIcon,
  XMarkIcon as XMarkIconMini,
} from '@heroicons/react/20/solid'

import MediaFileUploaderComponent from '../components/mediaFileUploaderComponent'
import { useSession, signOut } from 'next-auth/react'
import HistorialActasComponent from '../components/historialActasComponent'

export default function PlataformaPage() {
  const { data: session } = useSession();

  return (
    <>
      <main>
        <header className="relative isolate">
          <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gray-900/5" />
          </div>

          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-x-8 lg:mx-0 lg:max-w-none">
              <div className="flex items-center gap-x-6">
                <img
                  src={session?.user?.image ?? ""}
                  alt={`Foto de perfil de ${session?.user?.name}`}
                  className="w-20 h-20 rounded-lg"
                />
                <h1>
                  <div className="text-sm/6 text-gray-500">
                    Bienvenido
                  </div>
                  <div className="mt-1 text-base font-semibold text-gray-900">
                    {session?.user?.name}
                  </div>
                </h1>
              </div>
              <div className="flex items-center gap-x-4 sm:gap-x-6">
                <a href="#" className="hidden text-sm/6 font-semibold text-gray-900 sm:block">
                  Editar perfil
                </a>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Salir
                </button>

                <Menu as="div" className="relative sm:hidden">
                  <MenuButton className="relative block">
                    <span className="absolute -inset-3" />
                    <span className="sr-only">More</span>
                    <EllipsisVerticalIcon aria-hidden="true" className="size-5 text-gray-500" />
                  </MenuButton>

                  <MenuItems
                    transition
                    className="absolute right-0 z-10 mt-0.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                  >
                    <MenuItem>
                      <button
                        type="button"
                        className="block w-full px-3 py-1 text-left text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden"
                      >
                        Copy URL
                      </button>
                    </MenuItem>
                    <MenuItem>
                      <a
                        href="#"
                        className="block px-3 py-1 text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden"
                      >
                        Edit
                      </a>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {/* Uploader Component */}
            <div className="lg:col-start-3 lg:row-end-1">
              <MediaFileUploaderComponent />
            </div>
            <div className="bg-purple-500 text-white p-6 rounded-lg shadow-lg">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                <div className="flex items-center gap-4 flex-1 justify-center md:justify-start">
                  <div>
                    <h3 className="font-bold text-xl">
                      ⚠️ Recuerda
                    </h3>
                    <p className="text-white mt-2 text-sm">
                      En el proceso de pago recuerda dar click en "Volver al comercio" o "Finalizar proceso" en caso de que no se haga de manera automática
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Historial Component */}
            <div className="sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2">
              <HistorialActasComponent />
            </div>
          </div>
          



           {/* Sección de Soporte */}
           <div className="mt-12 pt-8 border-t border-gray-200">
             <div className="text-center md:text-left">
               <h3 className="font-bold text-xl text-purple-600 mb-4">
                 📞 Soporte
               </h3>
               <div className="  items-center justify-between gap-6 text-center md:text-left">
               <p className="text-gray-700 mb-2">
                 Nuestro horario de atención es de lunes a viernes de 8:00 AM a 6:00 PM
               </p>
               <p className="text-gray-700 mb-3">
                 En caso de que necesites soporte, puedes contactarte por WhatsApp con:
               </p>
               </div>
          
               <div className="space-y-1">
                 <p className="text-gray-900">
                   • <strong className="text-purple-600">Leonardo:</strong> +57 301 242 2098
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
