"use server";

import {
  autenticarGoogleDrive,
  manejarError,
  obtenerClienteTranscripcion,
  obtenerOCrearCarpeta,
  crearArchivo,
  verificarArchivoExistente,
  writeLog,
} from "./utilsActions";

export async function transcripAction(nombreNormalizado: string) {
  try {
    const drive = await autenticarGoogleDrive();
    const nombreTranscripcion = `${nombreNormalizado.replace(
      /\.[^/.]+$/,
      ""
    )}_Transcripcion.txt`;

    writeLog(
      `[${new Date().toISOString()}] Verificando si la transcripción ya existe.`
    );

    const idCarpeta = await obtenerOCrearCarpeta(drive, nombreNormalizado);

    const transcripcionExistente = await verificarArchivoExistente(
      drive,
      nombreTranscripcion,
      idCarpeta
    );
    const audio = await verificarArchivoExistente(
      drive,
      nombreNormalizado,
      idCarpeta
    );
    console.log(audio);
    if (transcripcionExistente) {
      writeLog(`[${new Date().toISOString()}] La transcripción ya existe.`);
      return { status: "success", message: "La transcripción ya existía." };
    }

    writeLog(
      `[${new Date().toISOString()}] Iniciando proceso de transcripción.`
    );
    const clienteTranscripcion = await obtenerClienteTranscripcion();
    const transcripcion = await clienteTranscripcion.transcripts.transcribe({
      audio_url: `https://drive.usercontent.google.com/download?id=${audio}&export=download&confirm=t`,
      speaker_labels: true,
      language_code: "es",
    });

    if (transcripcion.error) {
      throw new Error(`Error en la transcripción: ${transcripcion.error}`);
    }

    const textoTranscripcion = transcripcion.text || "";
    writeLog(`[${new Date().toISOString()}] Guardando transcripción.`);
    await crearArchivo(
      drive,
      textoTranscripcion,
      nombreTranscripcion,
      idCarpeta
    );

    writeLog(
      `[${new Date().toISOString()}] Transcripción completada con éxito.`
    );
    return {
      status: "success",
      message: "Transcripción generada correctamente.",
    };
  } catch (error) {
    manejarError("validarYTranscribirArchivo", error);
    return {
      status: "error",
      message: "Error en la generación de la transcripción.",
    };
  }
}
