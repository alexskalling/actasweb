"use server";

import {
  manejarError,
  obtenerClienteTranscripcion,
  writeLog,
  guardarArchivo,
  verificarArchivoExistente,
  obtenerContenidoArchivo,
} from "./utilsActions";

interface TranscripcionResult {
  status: "success" | "error";
  content?: string;
  message?: string;
}

export async function transcripAction(
  folder: string,
  file: string,
  urlAssembly: string
): Promise<TranscripcionResult> {
  const nombreTranscripcion = generateTranscriptionFilename(file);
  const nextcloudUser = process.env.NEXTCLOUD_USER;
  const nextcloudPassword = process.env.NEXTCLOUD_PASSWORD;
  const nextcloudUrl = process.env.NEXTCLOUD_URL;

  if (!nextcloudUser || !nextcloudPassword || !nextcloudUrl) {
    const errorMessage = "Credenciales de Nextcloud no configuradas.";
    console.error(errorMessage);
    return { status: "error", message: errorMessage };
  }

  try {
    if (await verificarTranscripcionExistente(nombreTranscripcion, folder)) {
      return await obtenerTranscripcionExistente(nombreTranscripcion, folder);
    }

    const textoTranscripcion = await realizarTranscripcionAssemblyAI(
      folder,
      file,
      urlAssembly
    );
    await guardarTranscripcionEnNextcloud(
      folder,
      nombreTranscripcion,
      textoTranscripcion
    );

    return { status: "success", content: textoTranscripcion };
  } catch (error) {
    manejarError("transcripAction", error);
    return {
      status: "error",
      message: "Error en el proceso de transcripción.",
    };
  }
}

function generateTranscriptionFilename(file: string): string {
  return `${file.replace(/\.[^/.]+$/, "")}_Transcripcion.txt`;
}

async function verificarTranscripcionExistente(
  nombreTranscripcion: string,
  folder: string
): Promise<boolean> {
  writeLog(
    `Verificando si existe transcripción: ${nombreTranscripcion} en carpeta ${folder}`
  );
  return await verificarArchivoExistente(nombreTranscripcion, folder);
}

async function obtenerTranscripcionExistente(
  folder: string,
  nombreTranscripcion: string
): Promise<TranscripcionResult> {
  writeLog(
    `Transcripción existente encontrada: ${nombreTranscripcion}. Obteniendo contenido.`
  );
  const contenidoTranscripcion = await obtenerContenidoArchivo(
    folder,
    nombreTranscripcion
  );

  return { status: "success", content: contenidoTranscripcion as string };
}

async function realizarTranscripcionAssemblyAI(
  folder: string,
  file: string,
  urlAssembly: string
): Promise<string> {
  writeLog(`Iniciando transcripción con AssemblyAI para: ${file}`);
  const clienteTranscripcion = await obtenerClienteTranscripcion();
  const transcripcion = await clienteTranscripcion.transcripts.transcribe({
    audio_url: urlAssembly,
    speaker_labels: true,
    language_code: "es",
  });

  if (transcripcion.error) {
    throw new Error(`Error de AssemblyAI: ${transcripcion.error}`);
  }

  return transcripcion.text || "";
}

async function guardarTranscripcionEnNextcloud(
  folder: string,
  nombreTranscripcion: string,
  textoTranscripcion: string
): Promise<void> {
  writeLog(
    `Guardando transcripción: ${nombreTranscripcion} en carpeta ${folder}`
  );
  await guardarArchivo(folder, nombreTranscripcion, textoTranscripcion);
  writeLog(`Transcripción guardada: ${nombreTranscripcion}`);
}
