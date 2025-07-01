import Link from "next/link";
import GeneradorContainerContainer from "../components/generadorContainerComponent";

export default function PlataformaPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Bienvenido a la Plataforma
        </h1>
        <p className="text-gray-600 mb-6">
          Esta es tu área personal donde puedes gestionar tus actas y configuraciones.
        </p>

        {/* Primera fila: Mis Actas y Configuración */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-2">Mis Actas</h3>
            <p className="text-sm text-purple-700">
              Accede a todas las actas que has generado
            </p>
          </div>

          <Link href="/plataforma/perfil" className="block">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 hover:bg-blue-100 transition">
              <h3 className="font-semibold text-blue-900 mb-2">Configuración</h3>
              <p className="text-sm text-blue-700">
                Personaliza tu experiencia y preferencias
              </p>
            </div>
          </Link>
        </div>

        {/* Segunda fila: Generador */}
        <div className="mt-6">
          <GeneradorContainerContainer />
        </div>
      </div>
    </div>
  );
}
