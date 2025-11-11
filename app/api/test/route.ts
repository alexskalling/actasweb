import { NextRequest, NextResponse } from "next/server";
import { normalizarNombreArchivo } from "@/app/(generador)/services/generacion_contenido_services/utilsActions";



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
      "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
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
    const dropboxToken = await getDropboxAccessToken();
    if (!dropboxToken) {
      return NextResponse.json(
        {
          status: "error",
          message: "Token de Dropbox no configurado en variables de entorno.",
        },
        { status: 500 }
      );
    }




    // 4. Extraer nombre de archivo de la ruta Dropbox
    const nombreArchivo = pathDropbox.split("/").pop() || "archivo";

    



    // 6. Normalizar nombre
    const nombreNormalizado = await normalizarNombreArchivo(nombreArchivo);

    

    return NextResponse.json(
      {
        status: "success",
        message: "Archivo procesado exitosamente",
        data: {
            transcription: "processResult.transcripcion as string",
            draft: "processResult.acta as string",
            fileId: nombreNormalizado,
            duracion_acta: "00:00:00"
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
