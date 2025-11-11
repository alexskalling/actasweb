"use server";
import { formatContent } from "./formatContent";
import { generateContenta } from "./generateContenta";
import { transcripAction } from "./transcriptAction";
import { ActualizarProceso } from "../actas_querys_services/actualizarProceso";
import { sendActaEmail } from "@/app/Emails/actions/sendEmails";

export async function processAction(
  folder: string,
  file: string,
  urlAssembly: string,
  email: string,
  name: string,
  automation?: boolean
) {
  try {
    console.log("Inicio de generación de acta");
    const transcribe = await transcripAction(folder, file, urlAssembly);
    if (transcribe?.status !== "success") {
      return {
        status: "error",
        message: "Error en la generación de trasncripcion",
      };
    }

    const contenido = await generateContenta(
      folder,
      file,
      urlAssembly,
      transcribe.content as string
    );
    if (contenido?.status !== "success") {
      return {
        status: "error",
        message: "Error en la generación de contenidos",
      };
    }

    const formato = await formatContent(
      folder,
      file,
      contenido.content as string
    );
    if (formato?.status !== "success") {
      return {
        status: "error",
        message: "Error formateando el acta",
      };
    }
    console.log("Generación de acta finalizada");
    try {
      await ActualizarProceso(
        file,
        6,
        undefined,
        undefined,
        undefined,
        undefined,
        process.env.NEXT_PUBLIC_PAGO,
        formato.transcripcion,
        formato.acta,
        automation
      );
    } catch (err) {
      console.error("❌ Error al actualizar:", err);
    }
    if (email) {

      await sendActaEmail(email, name, formato.acta as string, formato.transcripcion as string, file as string);
      await ActualizarProceso(
        file,
        7,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        automation,
      );
    }

    return {
      status: "success",
      message: "Acta lista",
      transcripcion: formato.transcripcion,
      acta: formato.acta,
    };
  } catch (error) {
    console.error("Error en la acción del proceso:", error);
    return {
      status: "error",
      message: "Error en el proceso de acción",
    };
  }
}
