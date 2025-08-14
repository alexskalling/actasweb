"use server";
import { formatContent } from "./formatContent";
import { generateContenta } from "./generateContenta";
import { transcripAction } from "./transcriptAction";
import { ActualizarProceso } from "./actualizarProceso";

export async function processAutomaticAction(
  folder: string ,
  file: string,
  urlAssembly: string,
  email: string,
  automation?: boolean
) {
  
  try {
    const transcribe = await transcripAction(folder, file, urlAssembly);
    if (transcribe?.status !== "success") {
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

    // Formateo de contenido
    const formato = await formatContent(
      folder,
      file,
      //@ts-expect-error revisar despues

      contenido.content
    );
    if (formato?.status !== "success") {
      console.error("Error formateando el acta");
      return {
        status: "error",
        message: "Error formateando el acta",
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
        process.env.NEXT_PUBLIC_PAGO,
        formato.transcripcion,
        formato.acta,
        automation
      );
    } catch (err) {
      console.error("Error al actualizar:", err);
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
