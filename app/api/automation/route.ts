import { NextRequest, NextResponse } from "next/server";
import { processAction } from "@/app/(generador)/services/processAction";
import { normalizarNombreArchivo } from "@/app/(generador)/services/utilsActions";
import { GuardarNuevoProceso } from "@/app/(generador)/services/guardarNuevoProceso";
//import ffmpeg from "fluent-ffmpeg";
//import { PassThrough } from "stream";

import { parseBuffer } from "music-metadata";

async function getMediaDuration(buffer: Buffer): Promise<number> {
  try {
    const metadata = await parseBuffer(buffer, undefined, { duration: true });
    return metadata.format.duration || 0; // en segundos
  } catch (err) {
    console.error("Error leyendo duración real:", err);
    return 0;
  }
}

const calculatePrice = (durationInSeconds: number): number => {
  const segments = Math.ceil(durationInSeconds / 60 / 15);
  return segments * 2500;
};

// Tipos para la respuesta
interface AutomationResponse {
  status: "success" | "error";
  message: string;
  data?: {
    transcription: string;
    draft: string;
    fileId: string;
  };
}

// Validar API key
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  const expectedApiKey = process.env.N8N_API_KEY;

  if (!expectedApiKey) {
    console.error("N8N_API_KEY no está configurado en las variables de entorno");
    return false;
  }

  return apiKey === expectedApiKey;
}

export async function POST(request: NextRequest): Promise<NextResponse<AutomationResponse>> {
  try {
    // 1. Validar API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        {
          status: "error",
          message: "API key inválida o no proporcionada",
        },
        { status: 401 }
      );
    }

    // 2. Obtener JSON con pathDropbox, email y name (en lugar de archivo directamente)
    const formData = await request.formData();

    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    const pathDropbox = formData.get("pathDropbox") as string; // si lo mandas

    if (!pathDropbox) {
      return NextResponse.json(
        {
          status: "error",
          message: "No se proporcionó la ruta del archivo en Dropbox (pathDropbox).",
        },
        { status: 400 }
      );
    }

    // 3. Obtener enlace temporal desde Dropbox API
    const dropboxToken = process.env.DROPBOX_TOKEN;
    if (!dropboxToken) {
      return NextResponse.json(
        {
          status: "error",
          message: "Token de Dropbox no configurado en variables de entorno.",
        },
        { status: 500 }
      );
    }

    const dropboxLinkRes = await fetch("https://api.dropboxapi.com/2/files/get_temporary_link", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${dropboxToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: pathDropbox }),
    });

    if (!dropboxLinkRes.ok) {
      const errorText = await dropboxLinkRes.text();
      return NextResponse.json(
        {
          status: "error",
          message: `Error al obtener enlace temporal de Dropbox: ${dropboxLinkRes.status} - ${errorText}`,
        },
        { status: 500 }
      );
    }

    const dropboxLinkData = await dropboxLinkRes.json();
    const fileDownloadUrl = dropboxLinkData.link; // Aquí tienes el link temporal directo al archivo
    // 4. Extraer nombre de archivo de la ruta Dropbox
    const nombreArchivo = pathDropbox.split("/").pop() || "archivo";

    // 5. Validar extensión permitida
    const allowedExtensions = [
      ".wav", ".mp3", ".m4a", ".aac", ".ogg", ".wma", ".flac",
      ".mp4", ".avi", ".mov", ".wmv", ".flv", ".mkv", ".webm",
    ];
    const ext = "." + nombreArchivo.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        {
          status: "error",
          message: `Tipo de archivo no permitido. Extensiones permitidas: ${allowedExtensions.join(", ")}`,
        },
        { status: 400 }
      );
    }



    // 6. Normalizar nombre
    const nombreNormalizado = await normalizarNombreArchivo(nombreArchivo);
    const nombreCarpeta = nombreNormalizado.replace(/\.[^/.]+$/, "");

    // 7. Descargar archivo directamente usando fetch y convertir a buffer para subir a AssemblyAI
    const fileRes = await fetch(fileDownloadUrl);
    if (!fileRes.ok) {
      const errText = await fileRes.text();
      return NextResponse.json(
        {
          status: "error",
          message: `Error al descargar archivo desde Dropbox: ${fileRes.status} - ${errText}`,
        },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const durationInSeconds = await getMediaDuration(buffer);
    const formattedDuration = new Date(durationInSeconds * 1000)
      .toISOString()
      .substr(11, 8);

    // 8. Subir a AssemblyAI
    const assemblyApiKey = process.env.NEXT_PUBLIC_ASSEMBLY_API_KEY;
    if (!assemblyApiKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "Falta API Key de AssemblyAI",
        },
        { status: 500 }
      );
    }

    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        Authorization: assemblyApiKey,
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      return NextResponse.json(
        {
          status: "error",
          message: `Error al subir archivo a AssemblyAI: ${uploadRes.status} - ${errorText}`,
        },
        { status: 500 }
      );
    }

    const uploadData = await uploadRes.json();
    const uploadUrl = uploadData.upload_url;

    // 9. Guardar proceso en DB
    try {
      const tipo = process.env.NEXT_PUBLIC_PAGO === "soporte" ? "soporte" : "acta";
      await GuardarNuevoProceso(
        nombreNormalizado,
        4,
        formattedDuration,
        calculatePrice(durationInSeconds),
        tipo,
        uploadUrl,
        "",
        "",
        "",
        99,
        email || "automation@actas.com"
      );
    } catch (error) {
      console.warn("Error al guardar proceso, continuando con el procesamiento:", error);
    }

    // 10. Procesar archivo
    const processResult = await processAction(
      nombreCarpeta,
      nombreNormalizado,
      uploadUrl,
      email || "automation@actas.com",
      name || "Usuario Automatizado"
    );
    if (processResult.status !== "success") {
      return NextResponse.json(
        {
          status: "error",
          message: `Error en el procesamiento: ${processResult.message}`,
        },
        { status: 500 }
      );
    }

    // 11. Retornar respuesta
    return NextResponse.json(
      {
        status: "success",
        message: "Archivo procesado exitosamente",
        data: {
          transcription: processResult.transcripcion as string,
          draft: processResult.acta as string,
          fileId: nombreNormalizado,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en el endpoint de automatización:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "success",
      message: "Endpoint de automatización funcionando correctamente",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
