"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { buscarEmpresaByAdmin } from "../services/buscarEmpresaByAdminService";
import { buscarEmpresaByAgente } from "../../agentes_empresa/services/buscarEmpresaByAgente";
import { InvitarAgenteModal } from "../../invitaciones/components/modalInvitacion";

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
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const checkEmpresa = async () => {
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      try {
        // 🔹 primero buscar como admin
        const resAdmin = await buscarEmpresaByAdmin(session.user.email);
        if (resAdmin.success && resAdmin.empresas && resAdmin.empresas.length > 0) {
          setEmpresa(resAdmin.empresas[0]);
          setRole("admin");
          return;
        }

        // 🔹 si no es admin, buscar como agente
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

  if (loading) return <p className="text-gray-500">Cargando empresa...</p>;
  if (!empresa) return null; // no muestra nada si no pertenece a ninguna empresa

  return (
    <div className="p-6 max-w-md mx-auto rounded-2xl dark:bg-gray-900">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
        {empresa.nombreEmpresa}
      </h2>

      {role === "admin" && (
        <>
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Invitar agentes
          </Button>
          <InvitarAgenteModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            empresaId={empresa.idEmpresa}
            empresaNombre={empresa.nombreEmpresa}
          />
        </>
      )}

      {role === "agente" && (
        <p className="text-sm text-gray-600">Eres agente de esta empresa</p>
      )}
    </div>
  );
}
