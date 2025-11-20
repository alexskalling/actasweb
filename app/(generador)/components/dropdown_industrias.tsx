"use client";

import { useEffect, useState } from "react";
import { Select } from "../../../components/ui/select";
import { getIndustrias } from "@/app/(generador)/services/industria_querys_services/getIndustriaAction";

interface Industria {
  id: number;
  nombre: string;
}
export default function DropdownIndustrias({
  onSelect,
  value,
}: {
  onSelect: (id: number | null) => void;
  value: number | null;
}) {
  const [industrias, setIndustrias] = useState<Industria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarIndustrias = async () => {
      try {
        setLoading(true);
        const result = await getIndustrias();

        if (result.status === "success") {
          setIndustrias(result.data);
        } else {
          setError(result.message || "Error al cargar las industrias");
        }
      } catch (error) {
        console.error("Error al cargar industrias:", error);
        setError("Error al cargar las industrias");
      } finally {
        setLoading(false);
      }
    };

    cargarIndustrias();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
        <span className="ml-2 text-gray-600">Cargando industrias...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === "" ? null : Number(e.target.value);
    onSelect(value);
  };
  return (
    <div className="w-full">
      <Select
        value={value ?? ""}
        onChange={handleChange}
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      >
        <option value="" disabled hidden>
          ¿Para qué área es tu acta?
        </option>
        {industrias.map((industria) => (
          <option key={industria.id} value={industria.id}>
            {industria.nombre}
          </option>
        ))}
      </Select>
    </div>
  );
}
