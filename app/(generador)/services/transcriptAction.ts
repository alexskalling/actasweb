"use server";

import {
  manejarError,
  obtenerClienteTranscripcion,
  writeLog,
  guardarArchivo,
  verificarArchivoExistente,
  obtenerContenidoArchivo,
} from "./utilsActions";

import io from "socket.io-client";

// 🔑 Conexión Socket.IO (FUERA de la función uploadFile, se inicializa una sola vez)
const socketBackendReal = io(process.env.NEXT_PUBLIC_SOCKET_URL);

socketBackendReal.on("connect_error", (error) => {
  console.error("Error de conexión Socket.IO desde backend real:", error);
});
socketBackendReal.on("connect_timeout", (timeout) => {
  console.error("Timeout de conexión Socket.IO desde backend real:", timeout);
});
socketBackendReal.on("disconnect", (reason) => {
  console.log("Desconexión de Socket.IO desde backend real:", reason);
});

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

  socketBackendReal.emit("upload-status", {
    roomName: folder,
    statusData: {
      message: `[Transcripción] Iniciando proceso esto puede tardar unos minutos dependiendo del tamanio del archivo`,
    },
  });

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

    socketBackendReal.emit("upload-status", {
      roomName: folder,
      statusData: {
        message: `[Transcripción] Transcripción completada, generando archivo `,
      },
    });

    return { status: "success", content: textoTranscripcion };
  } catch (error) {
    manejarError("transcripAction", error); // Log del error usando la función existente
    socketBackendReal.emit("upload-status", {
      roomName: folder,
      statusData: {
        message: `[Transcripción] Error al procesar. Error: ${error || error}`,
      },
    });
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
  //@ts-expect-error revisar despues

  return { status: "success", content: contenidoTranscripcion };
}

async function realizarTranscripcionAssemblyAI(
  folder: string,
  file: string,
  urlAssembly: string
): Promise<string> {
  writeLog(`Iniciando transcripción con AssemblyAI para: ${file}`);
  socketBackendReal.emit("upload-status", {
    roomName: undefined, // No folder context for this specific status, or determine if folder is relevant here
    statusData: {
      message: `[Transcripción] Convirtiendo audio a texto...`,
    },
  });

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
  socketBackendReal.emit("upload-status", {
    roomName: folder,
    statusData: {
      message: `[Transcripción] Guardando transcripción...`,
    },
  });
  writeLog(
    `Guardando transcripción: ${nombreTranscripcion} en carpeta ${folder}`
  );
  await guardarArchivo(folder, nombreTranscripcion, textoTranscripcion);
  writeLog(`Transcripción guardada: ${nombreTranscripcion}`);
}
