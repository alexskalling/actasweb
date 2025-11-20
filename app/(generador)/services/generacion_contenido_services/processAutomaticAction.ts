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
        file, // 1. nombre
        6, // 2. idEstadoProceso
        undefined, // 3. duracion
        undefined, // 4. costo
        undefined, // 5. tx
        undefined, // 6. urlAssembly
        undefined, // 7. referencia
        formato.transcripcion as string, // 8. urlTranscripcion
        formato.acta as string, // 9. urlborrador
        formato.contenido as string | null, // 10. urlContenido
        automation, // 11. automation
        undefined, // 12. codigoAtencion
        undefined, // 13. automation_mail
        undefined, // 14. codigoReferido
        undefined, // 15. soporte
        undefined, // 16. idUsuarioActa
      );
    } catch (err) {
      console.error("❌ Error al actualizar acta con URLs:", err);
      throw err;
    }
    if (email) {
      await ActualizarProceso(
        file, // 1. nombre
        7, // 2. idEstadoProceso
        undefined, // 3. duracion
        undefined, // 4. costo
        undefined, // 5. tx
        undefined, // 6. urlAssembly
        undefined, // 7. referencia
        undefined, // 8. urlTranscripcion
        undefined, // 9. urlborrador
        undefined, // 10. urlContenido
        automation, // 11. automation
        undefined, // 12. codigoAtencion
        email, // 13. automation_mail
        undefined, // 14. codigoReferido
        undefined, // 15. soporte
        undefined, // 16. idUsuarioActa
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
