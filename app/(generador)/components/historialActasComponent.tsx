import { ChevronRightIcon } from '@heroicons/react/20/solid'

const actas = [
  {
    name: 'Reunión Consejo Directivo',
    tx: '23424SDFS32432',
    costo: 85000,
    duracion: '01:23:45',
    href: '#',
  },
  {
    name: 'Reunión General de Accionistas',
    tx: '98765ABCDE12345',
    costo: 95000,
    duracion: '02:15:30',
    href: '#',
  },
  {
    name: 'Reunión Comité Ejecutivo',
    tx: '54321FGHIJ67890',
    costo: 75000,
    duracion: '00:45:20',
    href: '#',
  },
  {
    name: 'Reunión Junta Directiva',
    tx: '11111KLMNO22222',
    costo: 88000,
    duracion: '01:55:10',
    href: '#',
  },
  {
    name: 'Reunión Comité de Auditoría',
    tx: '33333PQRST44444',
    costo: 72000,
    duracion: '00:38:45',
    href: '#',
  },
]

export default function HistorialActasComponent() {
  return (
    <ul role="list" className="divide-y divide-gray-100">
      {actas.map((acta) => (
        <li key={acta.tx} className="relative flex justify-between gap-x-6 py-5">
          <div className="flex min-w-0 gap-x-4">
            <div className="min-w-0 flex-auto">
              <p className="text-sm/6 font-semibold text-gray-900">
                {acta.name}
              </p>
              <p className="mt-1 flex text-xs/5 text-gray-500">
                TX: {acta.tx}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-x-4">
            <div className="hidden sm:flex sm:flex-col sm:items-end">
              <p className="text-sm/6 text-gray-900">${acta.costo.toLocaleString('es-CO')} COP</p>
              <p className="mt-1 text-xs/5 text-gray-500">
                Duración: {acta.duracion}
              </p>
            </div>
            <a href={acta.href}>
              <svg xmlns="http://www.w3.org/2000/svg" className="size-12 flex-none p-2 text-white rounded-lg bg-purple-800 hover:bg-purple-700 cursor-pointer" width={24} height={24} viewBox="0 0 24 24"><path fill="currentColor" d="m17.435 19.723l-2.37-2.37q-.14-.133-.14-.34t.14-.348t.335-.15t.335.131l1.765 1.765v-4.386q0-.213.144-.356t.357-.144t.356.144t.143.356v4.387l1.766-1.766q.133-.14.34-.14t.348.14t.14.348t-.14.34l-2.389 2.389q-.242.243-.565.243t-.565-.243M15 23.5q-.213 0-.356-.144t-.144-.357t.144-.356T15 22.5h6q.213 0 .356.144t.144.357t-.144.356T21 23.5zm-8.884-4q-.652 0-1.134-.482T4.5 17.884V4.116q0-.652.482-1.134T6.116 2.5h6.213q.332 0 .632.13t.518.349L18.02 7.52q.218.217.348.518t.131.632v1.662q0 .343-.232.575t-.576.233H13.73q-.666 0-1.141.474t-.475 1.14v5.937q0 .344-.232.576t-.575.232zm7.596-11H17.5l-5-5l5 5l-5-5v3.789q0 .504.353.858q.354.353.859.353"></path></svg>
            </a>
          </div>
        </li>
      ))}
    </ul>
  )
}
