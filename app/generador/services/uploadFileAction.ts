"use server";

import {
  autenticarGoogleDrive,
  manejarError,
  obtenerOCrearCarpeta,
  subirArchivo,
  verificarArchivoExistente,
  writeLog,
} from "./utilsActions";

export async function uploadFileAction(
  formData: unknown,
  nombreNormalizado: string
) {
  try {
    console.log(nombreNormalizado);
    const drive = await autenticarGoogleDrive();
    //@ts-expect-error revisar despues
    const archivo = formData.get("file");
    if (!archivo) throw new Error("No se recibió el archivo.");

    writeLog(
      `[${new Date().toISOString()}] Verificando existencia del archivo: ${
        archivo.name
      }.`
    );

    const idCarpeta = await obtenerOCrearCarpeta(drive, nombreNormalizado);
    console.log(idCarpeta);
    const archivoExistente = await verificarArchivoExistente(
      drive,
      nombreNormalizado,
      idCarpeta
    );

    if (archivoExistente) {
      writeLog(`[${new Date().toISOString()}] El archivo ya existe.`);
      return { status: "success", message: "El archivo ya existía." };
    }

    const idArchivoNuevo = await subirArchivo(
      drive,
      archivo,
      nombreNormalizado,
      idCarpeta
    );
    if (idArchivoNuevo) {
      writeLog(
        `[${new Date().toISOString()}] Archivo subido correctamente: ${
          archivo.name
        }.`
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
