"use server";

import { resend } from "@/lib/resend/resend";
import React from "react";
import InvitacionEmail from "../mailStruct/invitacionEmail";

interface SendInvitacionEmailProps {
  email: string;
  empresa: string;
  link: string;
}

export async function sendInvitacionEmailService({
  email,
  empresa,
  link,
}: SendInvitacionEmailProps) {
  try {

    const data = await resend.emails.send({
      from: "guillermoalvarado@skalling.com",
      to: email,
      subject: `¡Has sido invitado a unirte a ${empresa}!`,
      react: React.createElement(InvitacionEmail, {
        empresa,
        link,
      }),
    });

    console.log("Correo de invitación enviado correctamente");
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error al enviar invitación:", error);
    return { success: false, error };
  }
}
