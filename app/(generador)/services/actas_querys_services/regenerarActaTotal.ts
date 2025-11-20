"use server";

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { borrarArchivoPorUrl } from "../generacion_contenido_services/utilsActions";
import { transcripAction } from "../generacion_contenido_services/transcriptAction";
import { generateContenta } from "../generacion_contenido_services/generateContenta";
import { formatContent } from "../generacion_contenido_services/formatContent";
import { ActualizarProcesoPorId } from "./actualizarProcesoPorId";
import { writeLog } from "../generacion_contenido_services/utilsActions";

export async function regenerarActaTotal(
  idActa: string,
  urlAssembly: string,
  nombreArchivo: string,
  carpeta: string,
  emailUsuario: string,
  nombreUsuario: string,
  idUsuarioSoporte: string,
) {
  try {
    writeLog(`Iniciando regeneración total para acta ID: ${idActa}`);

    const actaEncontrada = await db
      .select({
        id: actas.id,
        nombre: actas.nombre,
        urlBorrador: actas.urlBorrador,
        urlContenido: actas.urlContenido,
        urlTranscripcion: actas.urlTranscripcion,
        urlAssembly: actas.urlAssembly,
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

    writeLog(`Folder: ${carpeta}, File: ${nombreArchivo}`);

    if (actaEncontrada.urlTranscripcion) {
      writeLog(`Borrando transcripción: ${actaEncontrada.urlTranscripcion}`);
      const borradoTranscripcion = await borrarArchivoPorUrl(
        actaEncontrada.urlTranscripcion,
      );
      if (borradoTranscripcion) {
      } else {
        writeLog(
          `Advertencia: No se pudo borrar la transcripción, continuando...`,
        );
      }
    } else {
    }

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

    writeLog(`Actualizando estado a 5 (en generación)...`);
    const resultadoActualizacionInicial = await ActualizarProcesoPorId(
      idActa,
      5,
      undefined,
      undefined,
      undefined,
      urlAssembly,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      idUsuarioSoporte,
      undefined,
      undefined,
      "regeneracion total",
    );

    if (resultadoActualizacionInicial.status !== "success") {
      writeLog(
        `Error al actualizar estado inicial: ${resultadoActualizacionInicial.message}`,
      );
      return {
        status: "error",
        message: `Error al actualizar estado inicial: ${resultadoActualizacionInicial.message}`,
      };
    }

    writeLog(`Generando nueva transcripción...`);
    const transcribe = await transcripAction(
      carpeta,
      nombreArchivo,
      urlAssembly,
    );

    if (transcribe?.status !== "success" || !transcribe.content) {
      writeLog(
        `Error al generar transcripción: ${transcribe?.message || "Error desconocido"}`,
      );
      return {
        status: "error",
        message: `Error al generar transcripción: ${transcribe?.message || "Error desconocido"}`,
      };
    }

    writeLog(`Generando nuevo contenido desde transcripción...`);
    const contenidoResult = await generateContenta(
      carpeta,
      nombreArchivo,
      urlAssembly,
      transcribe.content,
    );

    if (contenidoResult?.status !== "success" || !contenidoResult.content) {
      writeLog(
        `Error al generar contenido: ${contenidoResult?.message || "Error desconocido"}`,
      );
      return {
        status: "error",
        message: `Error al generar contenido: ${contenidoResult?.message || "Error desconocido"}`,
      };
    }

    writeLog(`Formateando contenido y generando borrador...`);
    const formatoResult = await formatContent(
      carpeta,
      nombreArchivo,
      contenidoResult.content,
    );

    if (formatoResult?.status !== "success") {
      writeLog(
        `Error al formatear contenido: ${formatoResult?.message || "Error desconocido"}`,
      );
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
    const resultadoActualizacion = await ActualizarProcesoPorId(
      idActa,
      6,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      formatoResult.transcripcion,
      formatoResult.acta,
      formatoResult.contenido || null,
      false,
      idUsuarioSoporte,
      undefined,
      undefined,
      "regeneracion total",
    );

    if (resultadoActualizacion.status !== "success") {
      writeLog(`Error al actualizar acta: ${resultadoActualizacion.message}`);
      return {
        status: "error",
        message: `Error al actualizar acta: ${resultadoActualizacion.message}`,
      };
    }

    writeLog(
      `Regeneración total completada exitosamente para acta: ${nombreArchivo}`,
    );
    return {
      status: "success",
      message: "Acta regenerada exitosamente",
      transcripcion: formatoResult.transcripcion,
      acta: formatoResult.acta,
      contenido: formatoResult.contenido || null,
    };
  } catch (error) {
    writeLog(`Error en regenerarActaTotal: ${error}`);
    return {
      status: "error",
      message: `Error al regenerar acta: ${error instanceof Error ? error.message : "Error desconocido"}`,
    };
  }
}
