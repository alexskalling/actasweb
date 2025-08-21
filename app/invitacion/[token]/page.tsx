
import { buscarInvitacionByTokenService } from "@/app/modules/invitaciones/services/buscarInvitacionByTokenService";
import AceptarInvitacion from "@/app/modules/invitaciones/components/AceptarInvitacion";

interface InvitacionPageProps {
  params: { token: string };
}

export default async function InvitacionAceptarPage({ params }: InvitacionPageProps) {
  const token = params.token;

  const res = await buscarInvitacionByTokenService(token);
  const invitacion = res.success ? res.invitacion : null;

  if (!invitacion) return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold text-red-500">
        Invitación no encontrada o expirada
      </h1>
    </div>
  );

  return (
    <AceptarInvitacion
      email={invitacion.email}
      empresaId={invitacion.empresaId}
      token={token}
    />
  );
}
