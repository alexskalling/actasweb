'use client';

import { useState } from "react";
import { guardarNuevaEmpresaService } from "../services/empresas_querys_services/guardarNuevaEmpresaService";

export default function GuardarNuevaEmpresaComponent({ onClose, adminId }: { onClose: () => void, adminId: string }) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const nombreEmpresa = formData.get("nombreEmpresa")?.toString();

    try {
      if (!nombreEmpresa) throw new Error("El nombre de la empresa es obligatorio");

      await guardarNuevaEmpresaService(nombreEmpresa, adminId);

      setModalMessage("La empresa se ha creado exitosamente 🚀");
      setShowModal(true);
    } catch (err) {
      console.error(err);
      setModalMessage("Ocurrió un error al crear la empresa.");
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    onClose();
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
          <h1 className="text-2xl font-bold text-gray-800">Crear Empresa</h1>
          <p className="text-sm text-gray-600">
            Ingresa los datos de la nueva empresa
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre de la empresa
            </label>
            <input
              name="nombreEmpresa"
              type="text"
              placeholder="Ej: Mi Empresa S.A.S."
              required
              className="mt-1 p-2 w-full bg-white text-gray-900 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-purple-600 text-white border border-purple-700 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Crear Empresa'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500 pt-2">
          <p>Los datos de la empresa estarán seguros.</p>
        </div>
      </div>

      {/* Modal de confirmación */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
              Empresa Creada
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
