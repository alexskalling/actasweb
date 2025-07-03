"use server";

import { resend } from "@/lib/resend/resend";
import WelcomeEmail from "@/app/Emails/mailStruct/welcomeEmail";
import React from "react";

export async function sendWelcomeEmail(
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
      react: React.createElement(WelcomeEmail, {
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
