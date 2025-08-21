// app/invitacion/[token]/aceptar/page.tsx
import { aceptarInvitacionServer } from "@/app/modules/invitaciones/services/aceptarInvitacionService";

interface Props {
  params: { token: string };
}

export default async function InvitacionAceptarPage({ params }: Props) {

  const token = params.token;


  const result = await aceptarInvitacionServer(token);


  if (result.status === "aceptada") return <p>Invitación aceptada ✅</p>;
  if (result.status === "no-session") return <p>Debes iniciar sesión para aceptar la invitación</p>;
  if (result.status === "error") return <p>Error al aceptar la invitación ❌</p>;

  return <p>Aceptando invitación...</p>;
}
