"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { buscarEmpresaByAdmin } from "../services/buscarEmpresaByAdminService";
import { buscarEmpresaByAgente } from "../../agentes_empresa/services/buscarEmpresaByAgente";

interface Empresa {
  idEmpresa: string;
  nombreEmpresa: string;
  adminEmpresa: string;
  createdAt: Date;
}

export default function AdministradorEmpresaCardComponent() {
  const { data: session } = useSession();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [role, setRole] = useState<"admin" | "agente" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkEmpresa = async () => {
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      try {
        // primero buscar como admin
        const resAdmin = await buscarEmpresaByAdmin(session.user.email);
        if (resAdmin.success && resAdmin.empresas && resAdmin.empresas.length > 0) {
          setEmpresa(resAdmin.empresas[0]);
          setRole("admin");
          return;
        }

        // si no es admin, buscar como agente
        const resAgente = await buscarEmpresaByAgente(session.user.email);
        if (resAgente.success && resAgente.empresas && resAgente.empresas.length > 0) {
          setEmpresa(resAgente.empresas[0]);
          setRole("agente");
        }
      } finally {
        setLoading(false);
      }
    };

    checkEmpresa();
  }, [session]);

  if (loading) return <p>Cargando...</p>;
  if (!empresa) return null; // no muestra nada

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-xl font-bold">{empresa.nombreEmpresa}</h2>
      {role === "admin" && (
        <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">
          Invitar usuarios
        </button>
      )}
      {role === "agente" && (
        <p className="text-sm text-gray-600">Eres agente de esta empresa</p>
      )}
    </div>
  );
}
