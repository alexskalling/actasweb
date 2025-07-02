"use server";

import { resend } from "@/lib/resend/resend";
import WelcomeEmail from "@/app/Emails/mailStruct/welcomeEmail";
import React from "react";

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: "¡Bienvenido!",
      react: React.createElement(WelcomeEmail, { name }),
    });

    return { success: true, data };
  } catch (error) {
    console.error(error);
    return { success: false, error };
  }
}
