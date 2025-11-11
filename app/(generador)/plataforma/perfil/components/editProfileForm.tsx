'use client';

import { useSession } from "next-auth/react";
import { updateProfile } from "../actions/update";
import { useState, useEffect } from "react";
import { getUserData } from "../actions/getUserData";
import { getDepartamentos, getMunicipiosPorDepartamento } from "@/lib/services/getColombiaData";

export default function EditProfileForm({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [municipios, setMunicipios] = useState<string[]>([]);

  useEffect(() => {
    const loadUserData = async () => {
      const data = await getUserData();
      setUserData(data);
      if (data?.departamento) {
        setMunicipios(getMunicipiosPorDepartamento(data.departamento));
      }
    };
    loadUserData();
    setDepartamentos(getDepartamentos());
  }, []);

  const handleDepartamentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dept = e.target.value;
    setMunicipios(getMunicipiosPorDepartamento(dept));
    // Resetear municipio cuando cambia el departamento
    if (userData) {
      setUserData({ ...userData, departamento: dept, municipio: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      await updateProfile(formData);


      setModalMessage("Gracias por actualizar tus datos.");
      setShowModal(true);
    } catch (err) {
      console.error(err);
      setModalMessage("Ocurrió un error al actualizar tus datos.");
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    onClose(); // cerrar el formulario después de cerrar el modal
  };

  return (
    <>
      <div className="relative max-w-md w-full bg-white/90 rounded-lg p-8 space-y-6 text-gray-900">
        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-lg"
        >
          ✖
        </button>

        <div className="flex flex-col items-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-800">Información de contacto y facturación</h1>
          <p className="text-sm text-gray-600">
            Actualiza tu información de contacto y facturación
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Usuario: {session?.user?.name ?? ""}
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                name="nombre"
                type="text"
                defaultValue={userData?.nombre || ""}
                className="mt-1 p-2 w-full bg-white text-gray-900 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido
              </label>
              <input
                name="apellido"
                type="text"
                defaultValue={userData?.apellido || ""}
                className="mt-1 p-2 w-full bg-white text-gray-900 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                name="phone"
                type="text"
                placeholder="Ej: 3001234567"
                defaultValue={userData?.telefono || ""}
                className="mt-1 p-2 w-full bg-white text-gray-900 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <input
                name="email"
                type="email"
                defaultValue={userData?.email || session?.user?.email || ""}
                className="mt-1 p-2 w-full bg-white text-gray-900 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              País
            </label>
            <input
              type="text"
              value="Colombia"
              disabled
              className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento
              </label>
              <select
                name="departamento"
                defaultValue={userData?.departamento || ""}
                onChange={handleDepartamentoChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="">Seleccione un departamento</option>
                {departamentos.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Municipio
              </label>
              <select
                name="municipio"
                defaultValue={userData?.municipio || ""}
                disabled={!userData?.departamento && municipios.length === 0}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-100"
              >
                <option value="">
                  {userData?.departamento ? "Seleccione un municipio" : "Primero seleccione un departamento"}
                </option>
                {municipios.map((mun) => (
                  <option key={mun} value={mun}>
                    {mun}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              name="direccion"
              type="text"
              placeholder="Calle, número, barrio, etc."
              defaultValue={userData?.direccion || ""}
              className="mt-1 p-2 w-full bg-white text-gray-900 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-purple-600 text-white border border-purple-700 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500 pt-2">
          <p>Tu información se mantiene segura con nosotros.</p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
              Perfil Actualizado
            </h2>
            <p className="text-gray-600 mb-4 text-center">
              {modalMessage}
            </p>
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 mx-auto block"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
