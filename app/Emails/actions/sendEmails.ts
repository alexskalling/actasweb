"use server";

import { resend } from "@/lib/resend/resend";
import React from "react";
import ActaEmail from "../mailStruct/actaEmail";

export async function sendActaEmail(
  email: string,
  name: string,
  borrador: string,
  transcription: string,
  file: string
) {
  try {
    console.log("Enviando correo a: ", email);
    console.log("Nombre: ", name);
    console.log("URL borrador: ", borrador);
    console.log("URL transcripción: ", transcription);
    console.log("Archivo: ", file);

    const data = await resend.emails.send({
      from: "gestion@actasdereuniones.ai",
      to: email,
      subject: "Tu acta está lista" + file,
      react: React.createElement(ActaEmail, {
        name,
        url: borrador,
        transcription: transcription,
        file,
      }),
    });
    console.log("Correo enviado correctamente");
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error al enviar correo:", error);
    return { success: false, error };
  }
}
