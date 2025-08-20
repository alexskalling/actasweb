/* ---------------------------------------------
   GuardarNuevaEmpresaComponent.tsx
--------------------------------------------- */
"use client";

import { useState } from "react";

import { track } from "@/app/(generador)/utils/analytics";
import { guardarNuevaEmpresaService } from "../services/guardarNuevaEmpresaService";
import Modal from "@/components/ui/modal";

export default function GuardarNuevaEmpresaComponent() {
  /* ---------- Estados ---------- */
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* ---------- Handlers ---------- */
  const handleGuardar = async () => {
    if (!nombreEmpresa.trim()) {
      setMensaje("Debes ingresar el nombre de la empresa");
      return;
    }

    setLoading(true);
    track("company_create_attempt", { event_category: "engagement" });

    try {
      const res = await guardarNuevaEmpresaService(nombreEmpresa);

      if (res.success) {
        setMensaje(`✅ Empresa creada: ${res.empresa?.nombreEmpresa}`);
        setNombreEmpresa("");
        track("company_created_success", {
          event_category: "engagement",
          nombre_empresa: res.empresa?.nombreEmpresa,
        });
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Error desconocido";
      setMensaje(`❌ ${errMsg}`);
      track("company_created_error", { event_category: "error", error: errMsg });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="mt-6 border rounded p-4  bg-white">
      <h2 className="font-bold mb-2">Registrar una Nueva Empresa</h2>

      {/* Mensaje persuasivo */}
      <p className="mb-3 text-sm text-gray-700">
        Al registrar tu empresa tendrás acceso a planes de descuento en la
        generación de actas y podrás asociar “Agentes” para que las actas
        generadas por ellos sean accesibles desde el panel de control.
      </p>

      <input
        type="text"
        placeholder="Nombre de la empresa"
        value={nombreEmpresa}
        onChange={(e) => setNombreEmpresa(e.target.value)}
        className="border p-2 mb-3 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        disabled={loading}
      />

      <div className="flex gap-3">
        {/* Botón de confirmación */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
        >
          {loading ? "Guardando…" : "Guardar Empresa"}
        </button>

        {/* Enlace a planes 
        <a
          href="/planes"
          className="px-4 py-2 rounded text-gray-800 bg-gray-200 hover:bg-gray-300 transition-colors"
        >
          Descubrir Planes
        </a>*/}
      </div>

      {mensaje && (
        <p
          className={`mt-3 text-sm ${mensaje.startsWith("✅") ? "text-green-600" : "text-red-600"
            }`}
        >
          {mensaje}
        </p>
      )}

      {/* Modal de confirmación */}
      {showConfirm && (
        <Modal onClose={() => setShowConfirm(false)}>
          <h3 className="font-semibold mb-2 text-purple-900">¿Estás seguro?</h3>
          <p className="text-gray-700 mb-4">Esta acción creará una nueva empresa y te dará acceso a planes de descuento.</p>

          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                setShowConfirm(false);
                await handleGuardar();
              }}
              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              Sí, crear
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
