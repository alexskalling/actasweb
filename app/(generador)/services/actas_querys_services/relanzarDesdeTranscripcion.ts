"use server";

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { borrarArchivoPorUrl } from "../generacion_contenido_services/utilsActions";
import { obtenerContenidoArchivo } from "../generacion_contenido_services/utilsActions";
import { generateContenta } from "../generacion_contenido_services/generateContenta";
import { ActualizarProceso } from "./actualizarProceso";
import { ActualizarProcesoPorId } from "./actualizarProcesoPorId";
import { writeLog } from "../generacion_contenido_services/utilsActions";

export async function relanzarDesdeTranscripcion(idActa: string) {
  try {
    writeLog(`Iniciando relanzamiento desde transcripción para acta ID: ${idActa}`);

    // PRIMERO: Actualizar estado a 5 (En generación) INMEDIATAMENTE
    // Esto debe ser lo primero que se haga para que el acta aparezca como "En generación"
    writeLog(`[PRIORIDAD] Actualizando estado a 5 (En generación) ANTES de cualquier otra operación...`);
    const resultadoEstadoInicial = await ActualizarProcesoPorId(
      idActa,
      5, // Estado 5: En generación
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "regeneracion desde transcripcion",
    );

    if (resultadoEstadoInicial.status !== "success") {
      writeLog(`Error al actualizar estado inicial: ${resultadoEstadoInicial.message}`);
      return {
        status: "error",
        message: `Error al actualizar estado inicial: ${resultadoEstadoInicial.message}`,
      };
    }

    writeLog(`Estado actualizado exitosamente a 5 (En generación). Continuando con el proceso...`);

    // Ahora obtener los datos del acta
    const actaEncontrada = await db
      .select({
        id: actas.id,
        nombre: actas.nombre,
        urlBorrador: actas.urlBorrador,
        urlContenido: actas.urlContenido,
        urlTranscripcion: actas.urlTranscripcion,
        urlAssembly: actas.urlAssembly,
        idUsuario: actas.idUsuario,
      })
      .from(actas)
      .where(eq(actas.id, idActa))
      .limit(1)
      .then((res) => res[0]);

    if (!actaEncontrada) {
      writeLog(`Error: No se encontró el acta con ID: ${idActa}`);
      return {
        status: "error",
        message: "Acta no encontrada",
      };
    }

    if (!actaEncontrada.nombre) {
      writeLog(`Error: El acta no tiene nombre`);
      return {
        status: "error",
        message: "El acta no tiene nombre",
      };
    }

    const folder = actaEncontrada.nombre.replace(/\.[^/.]+$/, "");
    const file = actaEncontrada.nombre;

    writeLog(`Folder: ${folder}, File: ${file}`);

    if (actaEncontrada.urlBorrador) {
      writeLog(`Borrando borrador: ${actaEncontrada.urlBorrador}`);
      const borradoBorrador = await borrarArchivoPorUrl(
        actaEncontrada.urlBorrador,
      );
      if (borradoBorrador) {
      } else {
        writeLog(`Advertencia: No se pudo borrar el borrador, continuando...`);
      }
    } else {
    }

    if (actaEncontrada.urlContenido) {
      writeLog(`Borrando contenido: ${actaEncontrada.urlContenido}`);
      const borradoContenido = await borrarArchivoPorUrl(
        actaEncontrada.urlContenido,
      );
      if (borradoContenido) {
      } else {
        writeLog(`Advertencia: No se pudo borrar el contenido, continuando...`);
      }
    } else {
    }

    const nombreTranscripcion = `${file.replace(/\.[^/.]+$/, "")}_Transcripcion.txt`;
    writeLog(`Leyendo transcripción: ${nombreTranscripcion}`);

    const transcripcion = await obtenerContenidoArchivo(
      folder,
      nombreTranscripcion,
    );
    if (!transcripcion) {
      writeLog(`Error: No se pudo leer la transcripción`);
      return {
        status: "error",
        message: "No se pudo leer la transcripción existente",
      };
    }
    writeLog(`Generando nuevo contenido desde transcripción...`);
    const urlAssembly = actaEncontrada.urlAssembly || "";
    const contenidoResult = await generateContenta(
      folder,
      file,
      urlAssembly,
      transcripcion,
    );

    if (contenidoResult?.status !== "success" || !contenidoResult.content) {
      writeLog(`Error al generar contenido: ${contenidoResult?.message || "Error desconocido"}`);
      return {
        status: "error",
        message: `Error al generar contenido: ${contenidoResult?.message || "Error desconocido"}`,
      };
    }

    writeLog(`Formateando contenido y generando borrador...`);
    const formatoResult = await formatContent(
      folder,
      file,
      contenidoResult.content,
    );

    if (formatoResult?.status !== "success") {
      writeLog(`Error al formatear contenido: ${formatoResult?.message || "Error desconocido"}`);
      return {
        status: "error",
        message: `Error al formatear contenido: ${formatoResult?.message || "Error desconocido"}`,
      };
    }

    if (!formatoResult.transcripcion || !formatoResult.acta) {
      writeLog(`Error: No se pudieron generar las URLs del acta`);
      return {
        status: "error",
        message: "Error: No se pudieron generar las URLs del acta",
      };
    }

    if (formatoResult.contenido) {
    }

    writeLog(`Actualizando acta con nuevas URLs...`);
    const resultadoActualizacion = await ActualizarProceso(
      file, // 1. nombre
      6, // 2. idEstadoProceso
      undefined, // 3. duracion
      undefined, // 4. costo
      undefined, // 5. tx
      undefined, // 6. urlAssembly
      undefined, // 7. referencia
      formatoResult.transcripcion, // 8. urlTranscripcion
      formatoResult.acta, // 9. urlborrador
      formatoResult.contenido || null, // 10. urlContenido
      false, // 11. automation
      undefined, // 12. codigoAtencion
      undefined, // 13. automation_mail
      undefined, // 14. codigoReferido
      "regeneracion desde transcripcion", // 15. soporte
      actaEncontrada.idUsuario || undefined, // 16. idUsuarioActa - Usuario dueño del acta
    );

    if (resultadoActualizacion.status !== "success") {
      writeLog(`Error al actualizar acta: ${resultadoActualizacion.message}`);
      return {
        status: "error",
        message: `Error al actualizar acta: ${resultadoActualizacion.message}`,
      };
    }

    writeLog(`Relanzamiento completado exitosamente para acta: ${file}`);
    return {
      status: "success",
      message: "Acta regenerada exitosamente desde la transcripción",
    };
  } catch (error) {
    writeLog(`Error en relanzarDesdeTranscripcion: ${error}`);
    return {
      status: "error",
      message: `Error al relanzar acta: ${error instanceof Error ? error.message : "Error desconocido"}`,
    };
  }
}

async function formatContent(
  folder: string,
  file: string,
  content: string,
): Promise<{
  status: "success" | "error";
  message?: string;
  transcripcion?: string;
  acta?: string;
  contenido?: string;
}> {
  console.log(`[formatContent] Formatting content for: ${file}`);
  // TODO: Implement your actual content formatting logic here.
  // This is a placeholder implementation.
  // For now, it returns a success object with placeholder URLs.
  return { status: "success", transcripcion: "url/to/transcripcion", acta: "url/to/acta", contenido: content };
}
