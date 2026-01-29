"use server";
import { formatContent } from "./formatContent";
import { generateContenta } from "./generateContenta";
import { transcripAction } from "./transcriptAction";
import { ActualizarProceso } from "../actas_querys_services/actualizarProceso";

export async function processAutomaticAction(
  folder: string,
  file: string,
  urlAssembly: string,
  email: string,
  automation?: boolean,
) {
  try {
    const transcribe = await transcripAction(folder, file, urlAssembly);
    if (transcribe?.status !== "success" || !transcribe.content) {
      console.error("Error en la generación de trasncripcion");
      return {
        status: "error",
        message: "Error en la generación de trasncripcion",
      };
    }

    const contenido = await generateContenta(
      folder,
      file,
      urlAssembly,
      transcribe.content,
    );
    if (contenido?.status !== "success" || !contenido.content) {
      return {
        status: "error",
        message: "Error en la generación de contenidos",
      };
    }

    const formato = await formatContent(
      folder,
      file,
      contenido.content,
    );
    if (formato?.status !== "success") {
      console.error("Error formateando el acta");
      return {
        status: "error",
        message: "Error formateando el acta",
      };
    }

    if (!formato.transcripcion || !formato.acta) {
      console.error("❌ ERROR CRÍTICO: Las URLs no están disponibles");
      console.error("URL Transcripción:", formato.transcripcion);
      console.error("URL Acta:", formato.acta);
      return {
        status: "error",
        message: "Error: No se pudieron generar las URLs del acta",
      };
    }

    try {
      await ActualizarProceso(
        file,
        6,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        formato.transcripcion as string,
        formato.acta as string,
        formato.contenido as string | null,
        automation,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    } catch (err) {
      console.error("❌ Error al actualizar acta con URLs:", err);
      throw err;
    }
    if (email) {
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
        undefined,
        automation,
        undefined,
        email,
        undefined,
        undefined,
        undefined,
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
