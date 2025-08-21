// app/invitacion/[token]/aceptar/page.tsx
import { aceptarInvitacionServer } from "@/app/modules/invitaciones/services/aceptarInvitacionService";
import { redirect } from "next/navigation";

interface Props {
  params: { token: string };
}

export default async function InvitacionAceptarPage({ params }: Props) {

  const token = params.token;
  const result = await aceptarInvitacionServer(token);

  if (result.status === "aceptada") {
    redirect("/plataforma");
  }
  if (result.status === "no-session") return <p>Debes iniciar sesión para aceptar la invitación</p>;
  if (result.status === "error") return <p>Invitación Expirada ❌</p>;

  return <p>Aceptando invitación...</p>;
}
