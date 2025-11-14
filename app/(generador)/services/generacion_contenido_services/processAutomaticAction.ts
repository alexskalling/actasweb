"use server";
import { formatContent } from "./formatContent";
import { generateContenta } from "./generateContenta";
import { transcripAction } from "./transcriptAction";
import { ActualizarProceso } from "../actas_querys_services/actualizarProceso";

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

    // Validar que las URLs estén disponibles antes de actualizar
    if (!formato.transcripcion || !formato.acta) {
      console.error("❌ ERROR CRÍTICO: Las URLs no están disponibles");
      console.error("URL Transcripción:", formato.transcripcion);
      console.error("URL Acta:", formato.acta);
      return {
        status: "error",
        message: "Error: No se pudieron generar las URLs del acta",
      };
    }
    
    console.log("📝 Guardando URLs en base de datos (automático):");
    console.log("URL Transcripción:", formato.transcripcion);
    console.log("URL Acta:", formato.acta);
    
    try {
      await ActualizarProceso(
        file,
        6, // Estado: Completado
        undefined,
        undefined,
        undefined,
        undefined,
        undefined, // urlAssembly - no actualizar
        undefined, // referencia - no actualizar
        formato.transcripcion as string, // urlTranscripcion
        formato.acta as string, // urlborrador
        automation
      );
      console.log("✅ URLs guardadas correctamente y estado actualizado a 6");
    } catch (err) {
      console.error("❌ Error al actualizar acta con URLs:", err);
      throw err; // Lanzar error para que no continúe si falla
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
