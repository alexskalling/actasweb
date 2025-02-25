"use server";

import {
  autenticarGoogleDrive,
  crearArchivo,
  manejarError,
  obtenerOCrearCarpeta,
  writeLog,
} from "./utilsActions";

export async function uploadFileAction(
  nombreNormalizado: string,
  trasncripcion: string
) {
  try {
    console.log(nombreNormalizado);
    const drive = await autenticarGoogleDrive();

    const nombreTranscripcion = `${nombreNormalizado.replace(
      /\.[^/.]+$/,
      ""
    )}_Transcripcion.txt`;

    const idCarpeta = await obtenerOCrearCarpeta(drive, nombreNormalizado);
    console.log(idCarpeta);

    const idArchivoNuevo = await crearArchivo(
      drive,
      trasncripcion,
      nombreTranscripcion,
      idCarpeta
    );
    if (idArchivoNuevo) {
      writeLog(
        `[${new Date().toISOString()}] Archivo subido correctamente: ${nombreTranscripcion}.`
      );
      return { status: "success", message: "Archivo subido correctamente." };
    }

    throw new Error("Error al subir el archivo");
  } catch (error) {
    manejarError("uploadFileAction", error);
    writeLog(`[${new Date().toISOString()}] Error: ${error}`);
    return {
      status: "error",
      message: error || "Problemas al cargar el archivo.",
    };
  }
}
