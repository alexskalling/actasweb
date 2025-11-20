"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { saveBillingData } from "../services/billing/saveBillingData";
import {
  getDepartamentos,
  getMunicipiosPorDepartamento,
} from "@/lib/services/getColombiaData";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BillingDataFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BillingDataForm({
  isOpen,
  onClose,
  onSuccess,
}: BillingDataFormProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    departamento: "",
    municipio: "",
    direccion: "",
  });

  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [municipios, setMunicipios] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDepartamentos(getDepartamentos());

      if (session?.user?.email) {
        setFormData((prev) => ({ ...prev, email: session?.user?.email || "" }));
      }
      if (session?.user?.name) {
        const nameParts = session?.user?.name.split(" ") || [];
        setFormData((prev) => ({
          ...prev,
          nombre: nameParts[0] || "",
          apellido: nameParts.slice(1).join(" ") || "",
        }));
      }
    }
  }, [isOpen, session]);

  useEffect(() => {
    if (formData.departamento) {
      setMunicipios(getMunicipiosPorDepartamento(formData.departamento));

      setFormData((prev) => ({ ...prev, municipio: "" }));
    } else {
      setMunicipios([]);
    }
  }, [formData.departamento]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await saveBillingData(formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar los datos",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Datos de Facturación
          </h2>
          <p className="text-sm text-gray-600">
            {session
              ? "Estos datos se guardarán en tu perfil y solo necesitarás llenarlos una vez."
              : "Si te registras, solo llenarás estos datos una sola vez."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                required
                placeholder="3001234567"
                pattern="[0-9]{10}"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                10 dígitos sin espacios
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                Departamento <span className="text-red-500">*</span>
              </label>
              <select
                name="departamento"
                value={formData.departamento}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                Municipio <span className="text-red-500">*</span>
              </label>
              <select
                name="municipio"
                value={formData.municipio}
                onChange={handleChange}
                required
                disabled={!formData.departamento}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              >
                <option value="">
                  {formData.departamento
                    ? "Seleccione un municipio"
                    : "Primero seleccione un departamento"}
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
              Dirección <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              required
              placeholder="Calle, número, barrio, etc."
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar y Continuar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
