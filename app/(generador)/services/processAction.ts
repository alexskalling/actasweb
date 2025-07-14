"use server";
import { formatContent } from "./formatContent";
import { generateContenta } from "./generateContenta";
import { transcripAction } from "./transcriptAction";
import { ActualizarProceso } from "./actualizarProceso";
import { sendActaEmail } from "@/app/Emails/actions/sendEmails";

export async function processAction(
  folder: string,
  file: string,
  urlAssembly: string,
  email: string,
  name: string
) {
  try {
    console.log("Inicio de proceso de acción");
    console.log("Proceso de  trasncripcion" + urlAssembly);
    const transcribe = await transcripAction(folder, file, urlAssembly);
    if (transcribe?.status !== "success") {
      console.log("Error en la generación de trasncripcion");
      return {
        status: "error",
        message: "Error en la generación de trasncripcion",
      };
    }
    console.log("Transcripcion  lista");

    const contenido = await generateContenta(
      folder,
      file,
      urlAssembly,
      //@ts-expect-error revisar despues
      transcribe.content
    );
    if (contenido?.status !== "success") {
      console.log("Error en la generación de contenidos");
      return {
        status: "error",
        message: "Error en la generación de contenidos",
      };
    }
    console.log("Contenido listo");

    // Formateo de contenido
    const formato = await formatContent(
      folder,
      file,
      //@ts-expect-error revisar despues

      contenido.content
    );
    if (formato?.status !== "success") {
      console.log("Error formateando el acta");
      return {
        status: "error",
        message: "Error formateando el acta",
      };
    }
    console.log("Acta lista");
    console.log("Fin de proceso de acción");
    console.log("transcipcion: ", formato.transcripcion);
    console.log("acta: ", formato.acta);
    await ActualizarProceso(
      file,
      6,
      undefined,
      undefined,
      undefined,
      undefined,
      process.env.NEXT_PUBLIC_PAGO,
      formato.transcripcion,
      formato.acta
    );
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
      undefined
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
