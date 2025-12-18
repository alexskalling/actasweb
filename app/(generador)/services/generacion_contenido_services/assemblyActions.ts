"use client";

interface UploadResult {
  success: boolean;
  message?: string;
  publicUrl?: string | null;
  error?: string;
  uploadUrl?: string | null;
}

const MAX_FILE_SIZE = 1.1 * 1024 * 1024 * 1024;
const UPLOAD_TIMEOUT = 300000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

function uploadWithProgress(
  file: File,
  url: string,
  apiKey: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = UPLOAD_TIMEOUT;

    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new Error("Upload cancelled"));
      });
    }

    xhr.upload.onprogress = (event: ProgressEvent<EventTarget>) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          const response = new Response(JSON.stringify(result), {
            status: xhr.status,
            statusText: xhr.statusText,
          });
          resolve(response);
        } catch (e) {
          reject(new Error("Error al parsear respuesta"));
        }
      } else {
        const response = new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
        });
        reject(response);
      }
    };

    xhr.ontimeout = () => {
      reject(new Error("Timeout"));
    };

    xhr.onerror = () => {
      reject(new Error("Network error"));
    };

    xhr.onabort = () => {
      reject(new Error("Upload cancelled"));
    };

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", apiKey);
    xhr.send(file);
  });
}

async function retryUpload(
  file: File,
  url: string,
  apiKey: string,
  onProgress?: (progress: number) => void,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | Response | null = null;
  const controller = new AbortController();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise<void>((resolve) => setTimeout(resolve, delay));

        if (onProgress) {
          onProgress(0);
        }
      }

      const response = await uploadWithProgress(
        file,
        url,
        apiKey,
        onProgress,
        controller.signal,
      );

      if (onProgress) {
        onProgress(100);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : (error as Response);

      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      if (
        error instanceof Response &&
        error.status >= 400 &&
        error.status < 500
      ) {
        throw error;
      }

      if (error instanceof Error && error.message === "Timeout") {
        throw error;
      }

      if (error instanceof Error && error.message === "Upload cancelled") {
        throw error;
      }

      console.warn(
        lastError instanceof Error
          ? lastError.message
          : `Status: ${(lastError as Response).status}`,
      );
    }
  }

  throw (
    lastError || new Error("Error desconocido después de múltiples intentos")
  );
}

export async function uploadFileToAssemblyAI(
  archivo: File,
  onUploadProgress?: (progress: number) => void,
): Promise<UploadResult> {
  const ASSEMBLYAI_API_KEY = process.env.NEXT_PUBLIC_ASSEMBLY_API_KEY;

  if (!ASSEMBLYAI_API_KEY) {
    console.error("Error: API Key de AssemblyAI no configurada.");
    return {
      success: false,
      message: "API Key de AssemblyAI no configurada.",
      error: "API Key de AssemblyAI no configurada.",
      publicUrl: null,
      uploadUrl: null,
    };
  }

  if (!archivo) {
    return {
      success: false,
      message: "No se proporcionó ningún archivo.",
      error: "Archivo no encontrado en FormData",
      publicUrl: null,
      uploadUrl: null,
    };
  }

  if (archivo.size > MAX_FILE_SIZE) {
    const fileSizeMB = (archivo.size / 1024 / 1024).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);

    return {
      success: false,
      message: `El archivo es demasiado grande (${fileSizeMB} MB). Tamaño máximo permitido: ${maxSizeMB} MB`,
      error: `Archivo demasiado grande: ${fileSizeMB} MB (máximo: ${maxSizeMB} MB)`,
      publicUrl: null,
      uploadUrl: null,
    };
  }

  if (archivo.size === 0) {
    return {
      success: false,
      message: "El archivo está vacío.",
      error: "Archivo sin contenido",
      publicUrl: null,
      uploadUrl: null,
    };
  }

  const uploadUrl = "https://api.assemblyai.com/v2/upload";

  try {
    const response = await retryUpload(
      archivo,
      uploadUrl,
      ASSEMBLYAI_API_KEY,
      onUploadProgress,
    );

    if (!response.ok) {
      const errorDetails = await response.text().catch(() => "Sin detalles");
      console.error(`Error al subir archivo: ${response.status}`, errorDetails);

      return {
        success: false,
        message: `Error al subir archivo: ${response.status} ${response.statusText}`,
        error: `Código: ${response.status}, Detalles: ${errorDetails}`,
        publicUrl: null,
        uploadUrl: null,
      };
    }

    const uploadResult = await response.json();

    if (!uploadResult.upload_url) {
      return {
        success: false,
        message: "La respuesta del servidor no contiene la URL de subida.",
        error: "Respuesta inválida del servidor",
        publicUrl: null,
        uploadUrl: null,
      };
    }

    return {
      success: true,
      message: "Archivo subido exitosamente a AssemblyAI.",
      publicUrl: null,
      uploadUrl: uploadResult.upload_url,
    };
  } catch (error) {
    console.error("❌ Error al subir archivo:", error);

    let errorMessage = "Error desconocido al subir el archivo.";
    let errorDetails = "Error desconocido";

    if (error instanceof Error) {
      if (error.message === "Timeout") {
        errorMessage =
          "La subida tardó demasiado y se agotó el tiempo de espera. Por favor, verifica tu conexión a internet e intenta de nuevo.";
        errorDetails = "Timeout durante la subida del archivo a AssemblyAI.";
      } else if (
        error.message.includes("Network error") ||
        error.message.includes("Failed to fetch")
      ) {
        errorMessage =
          "Error de conexión. Verifica tu conexión a internet e intenta nuevamente.";
        errorDetails = "Error de red";
      } else if (error.message === "Upload cancelled") {
        errorMessage = "La subida fue cancelada.";
        errorDetails = "Subida cancelada";
      } else {
        errorMessage = error.message;
        errorDetails = error.message;
      }
    } else if (error instanceof Response) {
      const errorText = await error.text().catch(() => "Sin detalles");
      errorMessage = `Error al subir archivo: ${error.status} ${error.statusText}`;
      errorDetails = `Código: ${error.status}, Detalles: ${errorText}`;
    }

    return {
      success: false,
      message: errorMessage,
      error: errorDetails,
      publicUrl: null,
      uploadUrl: null,
    };
  }
}
