"use server";

import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { borrarArchivoPorUrl } from "../generacion_contenido_services/utilsActions";
import { obtenerContenidoArchivo } from "../generacion_contenido_services/utilsActions";
import { formatContent } from "../generacion_contenido_services/formatContent";
import { ActualizarProceso } from "./actualizarProceso";
import { ActualizarProcesoPorId } from "./actualizarProcesoPorId";
import { writeLog } from "../generacion_contenido_services/utilsActions";

export async function relanzarDesdeContenido(idActa: string) {
  try {
    writeLog(`Iniciando relanzamiento desde contenido para acta ID: ${idActa}`);

    // PRIMERO: Actualizar estado a 5 (En generación) INMEDIATAMENTE
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
      "regeneracion desde contenido",
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
      writeLog(`Borrando borrador existente: ${actaEncontrada.urlBorrador}`);
      const borradoBorrador = await borrarArchivoPorUrl(
        actaEncontrada.urlBorrador,
      );
      if (!borradoBorrador) {
        writeLog(`Advertencia: No se pudo borrar el borrador existente, continuando...`);
      }
    }

    const nombreContenido = `${file.replace(/\.[^/.]+$/, "")}_Contenido.txt`;
    writeLog(`Leyendo contenido existente: ${nombreContenido}`);

    const contenidoExistente = await obtenerContenidoArchivo(
      folder,
      nombreContenido,
    );
    if (!contenidoExistente) {
      writeLog(`Error: No se pudo leer el contenido existente`);
      return {
        status: "error",
        message: "No se pudo leer el contenido existente para regenerar el borrador",
      };
    }

    writeLog(`Formateando contenido y generando nuevo borrador...`);
    const formatoResult = await formatContent(
      folder,
      file,
      contenidoExistente,
    );

    if (formatoResult?.status !== "success") {
      writeLog(`Error al formatear contenido: ${formatoResult?.message || "Error desconocido"}`);
      return {
        status: "error",
        message: `Error al formatear contenido: ${formatoResult?.message || "Error desconocido"}`,
      };
    }

    if (!formatoResult.acta) {
      writeLog(`Error: No se pudo generar la URL del nuevo borrador`);
      return {
        status: "error",
        message: "Error: No se pudo generar la URL del nuevo borrador",
      };
    }

    writeLog(`Actualizando acta con la nueva URL del borrador...`);
    const resultadoActualizacion = await ActualizarProceso(
      file, // 1. nombre
      6, // 2. idEstadoProceso
      undefined, // 3. duracion
      undefined, // 4. costo
      undefined, // 5. tx
      undefined, // 6. urlAssembly
      undefined, // 7. referencia
      undefined, // 8. urlTranscripcion (no se toca)
      formatoResult.acta, // 9. urlborrador (la nueva)
      undefined, // 10. urlContenido (no se toca)
      false, // 11. automation
      undefined, // 12. codigoAtencion
      undefined, // 13. automation_mail
      undefined, // 14. codigoReferido
      "regeneracion desde contenido", // 15. soporte
      actaEncontrada.idUsuario || undefined, // 16. idUsuarioActa - Usuario dueño del acta
    );

    if (resultadoActualizacion.status !== "success") {
      writeLog(`Error al actualizar acta: ${resultadoActualizacion.message}`);
      return {
        status: "error",
        message: `Error al actualizar acta: ${resultadoActualizacion.message}`,
      };
    }

    writeLog(`Relanzamiento desde contenido completado exitosamente para acta: ${file}`);
    return {
      status: "success",
      message: "Borrador de acta regenerado exitosamente desde el contenido",
    };
  } catch (error) {
    let errorMessage = "Error desconocido";
    if (error instanceof Error) {
      errorMessage = `Error en relanzarDesdeContenido: ${error.message}. Stack: ${error.stack}`;
    }
    writeLog(errorMessage);
    return {
      status: "error",
      message: `Error al relanzar acta desde contenido: ${error instanceof Error ? error.message : "Error desconocido"}`,
    };
  }
}