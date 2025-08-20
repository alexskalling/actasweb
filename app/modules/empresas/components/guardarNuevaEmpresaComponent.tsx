"use client";

import { useState } from "react";
import { guardarNuevaEmpresaService } from "../services/guardarNuevaEmpresaService";
import React from "react";



export default function GuardarNuevaEmpresaComponent() {
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleGuardar = async () => {
    if (!nombreEmpresa) {
      setMensaje("Debes ingresar todos los campos");
      return;
    }

    const res = await guardarNuevaEmpresaService(nombreEmpresa);

    if (res.success) {
      setMensaje(`Empresa creada: ${res.empresa?.nombreEmpresa}`);
      setNombreEmpresa("");
    } else {
      setMensaje(`❌ Error: ${res.error}`);
    }
  };
  

  return (
    <div className="mt-6 border rounded p-4 shadow bg-white">
      <h2 className="font-bold mb-2">Nueva Empresa</h2>

      <input
        type="text"
        placeholder="Nombre de la empresa"
        value={nombreEmpresa}
        onChange={(e) => setNombreEmpresa(e.target.value)}
        className="border p-2 mb-2 w-full rounded"
      />


      <button
        onClick={handleGuardar}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Guardar Empresa
      </button>

      {mensaje && <p className="mt-2 text-sm">{mensaje}</p>}
    </div>
  );
}
