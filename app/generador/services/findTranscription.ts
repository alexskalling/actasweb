"use server";

import {
  autenticarGoogleDrive,
  obtenerOCrearCarpeta,
  verificarArchivoExistente,
  writeLog,
} from "./utilsActions";

export async function findTranscription(nombreNormalizado: string) {
  try {
    console.log("llego a la busqueda" + nombreNormalizado);
    const drive = await autenticarGoogleDrive();

    const nombreTranscripcion = `${nombreNormalizado.replace(
      /\.[^/.]+$/,
      ""
    )}_Transcripcion.txt`;

    const idCarpeta = await obtenerOCrearCarpeta(drive, nombreNormalizado);
    console.log(idCarpeta);
    const archivoExistente = await verificarArchivoExistente(
      drive,
      nombreTranscripcion,
      idCarpeta
    );

    if (archivoExistente) {
      console.log("archivo exite");
      writeLog(
        `[${new Date().toISOString()}] El archivo de trancripcion ya existe.`
      );
      return { status: "success", message: "No transcribir" };
    } else {
      console.log("archivo NO exite");

      writeLog(
        `[${new Date().toISOString()}] El archivo de transcripcion no existe.`
      );
      return { status: "success", message: "Transcribir" };
    }
  } catch (error) {
    writeLog(`[${new Date().toISOString()}] Error: ${error}`);
    return {
      status: "error",
      message: error || "Problemas al buscar el archivo de transcripcion.",
    };
  }
}
