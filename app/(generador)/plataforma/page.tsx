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





export default function Example() {
  const { data: session } = useSession();

  return (
    <>
   
      <main>
        <header className="relative isolate ">
          <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-full left-16 -mt-16 transform-gpu opacity-50 blur-3xl xl:left-1/2 xl:-ml-80">
              <div
                style={{
                  clipPath:
                    'polygon(100% 38.5%, 82.6% 100%, 60.2% 37.7%, 52.4% 32.1%, 47.5% 41.8%, 45.2% 65.6%, 27.5% 23.4%, 0.1% 35.3%, 17.9% 0%, 27.7% 23.4%, 76.2% 2.5%, 74.2% 56%, 100% 38.5%)',
                }}
                className="aspect-1154/678 w-288.5 bg-linear-to-br from-[#FF80B5] to-[#9089FC]"
              />
            </div>
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
                  <div className="mt-1 text-base font-semibold text-gray-900"> {session?.user?.name}</div>
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
            {/* Invoice summary */}
            <div className="lg:col-start-3 lg:row-end-1">
            <MediaFileUploaderComponent />
            </div>

            {/* Invoice */}
            <div className=" sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2">
             <HistorialActasComponent />
            </div>

        
          </div>
        </div>
      </main>
    </>
  )
}
