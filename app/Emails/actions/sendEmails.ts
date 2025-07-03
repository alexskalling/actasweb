"use server";

import { resend } from "@/lib/resend/resend";
import React from "react";
import ActaEmail from "../mailStruct/actaEmail";

export async function sendActaEmail(
  email: string,
  name: string,
  url: string,
  transcription: string
) {
  try {
    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Tu acta está lista ✅",
      react: React.createElement(ActaEmail, {
        name,
        url,
        transcription,
      }),
    });

    return { success: true, data };
  } catch (error) {
    console.error("❌ Error al enviar correo:", error);
    return { success: false, error };
  }
}
