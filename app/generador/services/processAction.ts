"use server";
import { formatContent } from "./formatContent";
import { generateContenta } from "./generateContenta";
import { transcripAction } from "./transcriptAction";

export async function processAction(
  folder: string,
  file: string,
  fileid: string
) {
  try {
    console.log("Inicio de proceso de acción");
    console.log("Proceso de  trasncripcion");
    const transcribe = await transcripAction(folder, file, fileid);
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
      fileid,
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
      fileid,
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
