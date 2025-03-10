// services/assemblyActions.ts
"use client";
interface UploadResult {
  success: boolean;
  message?: string;
  publicUrl?: string | null;
  error?: string;
  uploadUrl?: string | null;
}

export async function uploadFileToAssemblyAI(
  formData: FormData,
  onUploadProgress?: (progress: number) => void
): Promise<UploadResult> {
  const ASSEMBLYAI_API_KEY = process.env.NEXT_PUBLIC_ASSEMBLY_API_KEY;
  const archivo = formData.get("audioFile") as File;

  if (!ASSEMBLYAI_API_KEY) {
    console.error("Error: API Key de AssemblyAI no configurada.");
    return {
      success: false,
      message: "API Key de AssemblyAI no configurada.",
      error:
        "API Key de AssemblyAI no configurada. Debes reemplazar 'TU_API_KEY_DE_ASSEMBLYAI' con tu clave real.",
      publicUrl: null,
      uploadUrl: null,
    };
  }

  return new Promise((resolve) => {
    // Retornamos una Promesa para manejar la asincronía
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.assemblyai.com/v2/upload");
    xhr.setRequestHeader("Authorization", ASSEMBLYAI_API_KEY);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onUploadProgress) {
        const progress = (event.loaded / event.total) * 100;
        console.log("Upload Progress (services/assemblyActions.ts):", progress); // ➡️ Añade esta línea
        onUploadProgress(progress);
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const uploadResult = JSON.parse(xhr.responseText);
          console.log("Audio subido exitosamente a AssemblyAI:", uploadResult);
          resolve({
            success: true,
            message: "Audio subido exitosamente a AssemblyAI.",
            publicUrl: null,
            uploadUrl: uploadResult.upload_url,
            error: null,
          });
        } catch (e) {
          console.error("Error al parsear la respuesta JSON:", e);
          resolve({
            success: false,
            message: "Error al procesar la respuesta del servidor.",
            error:
              e instanceof Error
                ? e.message
                : "Error desconocido al parsear JSON",
            publicUrl: null,
            uploadUrl: null,
          });
        }
      } else {
        console.error(
          `Error al subir el audio a AssemblyAI. Código de estado: ${xhr.status}`
        );
        const errorDetails = xhr.responseText;
        console.error("Detalles del error:", errorDetails);
        resolve({
          success: false,
          message: `Error al subir audio a AssemblyAI: ${xhr.status} - ${xhr.statusText}`,
          error: `Código de estado: ${xhr.status}, Detalles: ${errorDetails}`,
          publicUrl: null,
          uploadUrl: null,
        });
      }
    };

    xhr.onerror = () => {
      console.error(
        "Error general en la función uploadAudio (XMLHttpRequest error):",
        xhr.statusText
      );
      resolve({
        success: false,
        message: "Error general al subir el audio.",
        error: `Error de red al subir el archivo. Código de estado: ${xhr.status}`,
        publicUrl: null,
        uploadUrl: null,
      });
    };

    xhr.send(archivo); // Enviamos el archivo con XMLHttpRequest
  });
}
