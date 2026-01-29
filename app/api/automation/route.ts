import { NextRequest, NextResponse } from "next/server";
import { normalizarNombreArchivo } from "@/app/(generador)/services/generacion_contenido_services/utilsActions";
import { GuardarNuevoProceso } from "@/app/(generador)/services/actas_querys_services/guardarNuevoProceso";
import { parseBuffer } from "music-metadata";
import { processAction } from "@/app/(generador)/services/generacion_contenido_services/processAction";
import { BuscarExistenteProceso } from "@/app/(generador)/services/actas_querys_services/buscarExistente.proceso";
import { calculatePrice } from "@/app/(generador)/utils/price";

async function getMediaDuration(buffer: Buffer): Promise<number> {
  try {
    const metadata = await parseBuffer(buffer, undefined, { duration: true });
    return metadata.format.duration || 0;
  } catch (err) {
    console.error("Error leyendo duración real:", err);
    return 0;
  }
}

async function getDropboxAccessToken() {
  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error("Falta DROPBOX_REFRESH_TOKEN en las variables de entorno");
  }

  const res = await fetch("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) throw new Error("Error obteniendo access token de Dropbox");

  const data = await res.json();
  return data.access_token as string;
}

interface AutomationResponse {
  status: "success" | "error";
  message: string;
  data?: {
    transcription: string;
    draft: string;
    fileId: string;
  };
}

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  const expectedApiKey = process.env.N8N_API_KEY;

  if (!expectedApiKey) {
    console.error(
      "N8N_API_KEY no está configurado en las variables de entorno",
    );
    return false;
  }

  return apiKey === expectedApiKey;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<AutomationResponse>> {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        {
          status: "error",
          message: "API key inválida o no proporcionada",
        },
        { status: 401 },
      );
    }

    const formData = await request.formData();

    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    const pathDropbox = formData.get("pathDropbox") as string;

    if (!pathDropbox) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "No se proporcionó la ruta del archivo en Dropbox (pathDropbox).",
        },
        { status: 400 },
      );
    }

    const dropboxToken = await getDropboxAccessToken();
    if (!dropboxToken) {
      return NextResponse.json(
        {
          status: "error",
          message: "Token de Dropbox no configurado en variables de entorno.",
        },
        { status: 500 },
      );
    }

    async function getTemporaryLink() {
      const res = await fetch(
        "https://api.dropboxapi.com/2/files/get_temporary_link",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${dropboxToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: pathDropbox }),
        },
      );

      if (!res.ok) {
        throw new Error(
          `Error al obtener enlace temporal de Dropbox: ${res.status} - ${await res.text()}`,
        );
      }

      const data = await res.json();
      return data.link as string;
    }

    const fileDownloadUrl = await getTemporaryLink();

    const nombreArchivo = pathDropbox.split("/").pop() || "archivo";

    const allowedExtensions = [
      ".wav",
      ".mp3",
      ".m4a",
      ".aac",
      ".ogg",
      ".wma",
      ".flac",
      ".mp4",
      ".avi",
      ".mov",
      ".wmv",
      ".flv",
      ".mkv",
      ".webm",
    ];
    const ext = "." + nombreArchivo.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        {
          status: "error",
          message: `Tipo de archivo no permitido. Extensiones permitidas: ${allowedExtensions.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const nombreNormalizado = await normalizarNombreArchivo(nombreArchivo);
    const nombreCarpeta = nombreNormalizado.replace(/\.[^/.]+$/, "");

    console.log("🔗 Dropbox download URL:", fileDownloadUrl);
    const fileRes = await fetch(fileDownloadUrl);
    if (!fileRes.ok) {
      const errText = await fileRes.text();
      return NextResponse.json(
        {
          status: "error",
          message: `Error al descargar archivo desde Dropbox: ${fileRes.status} - ${errText}`,
        },
        { status: 500 },
      );
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const durationInSeconds = await getMediaDuration(buffer);
    const formattedDuration = new Date(durationInSeconds * 1000)
      .toISOString()
      .substr(11, 8);

    const assemblyApiKey = process.env.NEXT_PUBLIC_ASSEMBLY_API_KEY;
    if (!assemblyApiKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "Falta API Key de AssemblyAI",
        },
        { status: 500 },
      );
    }
    try {
      await BuscarExistenteProceso(nombreNormalizado);
    } catch (error) {
      if (error instanceof Error && error.message === "DUPLICATE_ACTA") {
        return NextResponse.json(
          { status: "error", message: "Ya existe un acta con ese nombre." },
          { status: 409 },
        );
      }
      throw error;
    }

    const uploadRes = await fetch(
      `${process.env.NEXT_PUBLIC_AMBIENTE_URL || "http://localhost:3000"}/api/assembly/upload`,
      {
        method: "POST",
        body: buffer,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      },
    );

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      return NextResponse.json(
        {
          status: "error",
          message: `Error al subir archivo a AssemblyAI: ${uploadRes.status} - ${errorText}`,
        },
        { status: 500 },
      );
    }

    const uploadData = await uploadRes.json();
    if (!uploadData.success) {
      return NextResponse.json(
        {
          status: "error",
          message: uploadData.error || "Error en subida",
        },
        { status: 500 },
      );
    }
    const uploadUrl = uploadData.upload_url;

    try {
      const tipo =
        process.env.NEXT_PUBLIC_PAGO === "soporte" ? "soporte" : "acta";
      await GuardarNuevoProceso(
        nombreNormalizado,
        4,
        formattedDuration,
        calculatePrice(durationInSeconds),
        "",
        uploadUrl,
        tipo,
        "",
        "",
        "",
        99,
        email || "automation@skalling.com",
        undefined,
        undefined,
        undefined,
        undefined,
      );
    } catch (error) {
      console.warn(
        "Error al guardar proceso, continuando con el procesamiento:",
        error,
      );
    }

    console.log("archivo: " + nombreArchivo);
    const processResult = await processAction(
      nombreCarpeta,
      nombreArchivo,
      uploadUrl,
      email || "automation@skalling.com",
      name || "Usuario automatizado",
      true,
    );
    if (processResult.status !== "success") {
      return NextResponse.json(
        {
          status: "error",
          message: `Error en el procesamiento: ${processResult.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        status: "success",
        message: "Archivo procesado exitosamente",
        data: {
          transcription: processResult.transcripcion as string,
          draft: processResult.acta as string,
          fileId: nombreNormalizado,
          duracion_acta: formattedDuration,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error en el endpoint de automatización:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Error interno del servidor",
      },
      { status: 500 },
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
    { status: 200 },
  );
}
