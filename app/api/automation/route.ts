import { NextRequest, NextResponse } from "next/server";
import { processAction } from "@/app/(generador)/services/processAction";
import { normalizarNombreArchivo } from "@/app/(generador)/services/utilsActions";
import { GuardarNuevoProceso } from "@/app/(generador)/services/guardarNuevoProceso";

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

// Función para validar el API key
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  const expectedApiKey = process.env.N8N_API_KEY;

  if (!expectedApiKey) {
    console.error("N8N_API_KEY no está configurado en las variables de entorno");
    return false;
  }

  return apiKey === expectedApiKey;
}

// Función para validar el archivo
function validateFile(file: File): { valid: boolean; error?: string } {
  const allowedExtensions = [
    '.wav', '.mp3', '.m4a', '.aac', '.ogg', '.wma', '.flac',
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'
  ];

  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Extensiones permitidas: ${allowedExtensions.join(', ')}`
    };
  }

  // Validar tamaño del archivo (máximo 1GB)
  const maxSize = 1_000 * 1024 * 1024; // 1000MB (~1GB)
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "El archivo es demasiado grande. Tamaño máximo: 1GB"
    };
  }

  return { valid: true };
}

export async function POST(request: NextRequest): Promise<NextResponse<AutomationResponse>> {
  try {
    // 1. Validar API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        {
          status: "error",
          message: "API key inválida o no proporcionada"
        },
        { status: 401 }
      );
    }

    // 2. Obtener el archivo del request
    const requestFormData = await request.formData();
    const file = requestFormData.get("file") as File;
    const email = requestFormData.get("email") as string;
    const name = requestFormData.get("name") as string;

    // 3. Validar que se proporcionó un archivo
    if (!file) {
      return NextResponse.json(
        {
          status: "error",
          message: "No se proporcionó ningún archivo"
        },
        { status: 400 }
      );
    }

    // 4. Validar el archivo
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        {
          status: "error",
          message: fileValidation.error!
        },
        { status: 400 }
      );
    }

    // 5. Validar email y nombre (opcionales pero recomendados)
    if (!email || !name) {
      console.warn("Email o nombre no proporcionados, usando valores por defecto");
    }

    console.log(`Iniciando procesamiento automático para archivo: ${file.name}`);

    // 6. Preparar datos
    const nombreNormalizado = await normalizarNombreArchivo(file.name);
    const nombreCarpeta = nombreNormalizado.replace(/\.[^/.]+$/, "");

    // 7. Subir archivo a AssemblyAI (server-side con fetch)
    const apiKey = process.env.NEXT_PUBLIC_ASSEMBLY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "Falta API Key de AssemblyAI"
        },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        Authorization: apiKey,
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      return NextResponse.json(
        {
          status: "error",
          message: `Error al subir archivo a AssemblyAI: ${uploadRes.status} - ${errorText}`
        },
        { status: 500 }
      );
    }

    const uploadData = await uploadRes.json();
    const uploadUrl = uploadData.upload_url;

    // 8. Guardar proceso en base de datos
    try {
      const tipo = process.env.NEXT_PUBLIC_PAGO === "soporte" ? "soporte" : "acta";
      await GuardarNuevoProceso(
        nombreNormalizado,
        4,
        "00:00:00", // duration placeholder
        0, // price placeholder
        tipo,
        uploadUrl,
        '',
        '',
        '',
        99 // industriaId por defecto
      );
    } catch (error) {
      console.warn("Error al guardar proceso, continuando con el procesamiento:", error);
    }

    // 9. Procesar el archivo
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
          message: `Error en el procesamiento: ${processResult.message}`
        },
        { status: 500 }
      );
    }

    // 10. Retornar respuesta
    return NextResponse.json(
      {
        status: "success",
        message: "Archivo procesado exitosamente",
        data: {
          transcription: processResult.transcripcion as string,
          draft: processResult.acta as string,
          fileId: nombreNormalizado
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error en el endpoint de automatización:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Error interno del servidor"
      },
      { status: 500 }
    );
  }
}

// Método GET para verificar que el endpoint está funcionando
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "success",
      message: "Endpoint de automatización funcionando correctamente",
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}
