// app/invitacion/[token]/aceptar/page.tsx
import { aceptarInvitacionServer } from "@/app/modules/invitaciones/services/aceptarInvitacionService";
import { redirect } from "next/navigation";
import InvitacionNoSesionComponent from "./components/invitacionNoSesionComponent";
import InvitacionExpiradaComponent from "./components/invitacionExpiradaComponent";
import InvitacionAceptadaComponent from "./components/invitacionAceptadaComponent";

interface Props {
  params: { token: string };
}

export default async function InvitacionAceptarPage({ params }: Props) {

  const token = params.token;
  const result = await aceptarInvitacionServer(token);

  if (result.status === "aceptada") {
    redirect("/plataforma");
  }
  if (result.status === "no-session") return <InvitacionNoSesionComponent/>;
  if (result.status === "error") return <InvitacionExpiradaComponent/>;

  return <InvitacionAceptadaComponent/>;
}
