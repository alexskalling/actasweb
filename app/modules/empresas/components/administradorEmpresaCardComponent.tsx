"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { buscarEmpresaByAdmin } from "../services/buscarEmpresaByAdminService";
import { InvitarAgenteModal } from "../../invitaciones/components/modalInvitacion";


export default function AdministradorEmpresaCardComponent({ adminMail }: { adminMail: string }) {
  const [empresa, setEmpresa] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function fetchEmpresa() {
      try {
        const res = await buscarEmpresaByAdmin(adminMail);
        if (res.success && res.empresa) {
          setEmpresa(res.empresa.nombreEmpresa);
          setEmpresaId(res.empresa.idEmpresa);
        } else {
          setError(res.error || "No se pudo cargar la empresa");
        }
      } catch (err) {
        setError("Error al obtener la empresa: " + err);
      } finally {
        setLoading(false);
      }
    }

    fetchEmpresa();
  }, [adminMail]);



  if (loading) {
    return <p className="text-gray-500">Cargando empresa...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="p-6 max-w-md mx-auto rounded-2xl dark:bg-gray-900">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
        {empresa}
      </h2>
      <Button variant="outline" onClick={() => setModalOpen(true)}>
        Invitar agentes
      </Button>
      {empresaId && empresa &&(
        <InvitarAgenteModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          empresaId={empresaId}
          empresaNombre={empresa} />
      )}

    </div>
  );
}
