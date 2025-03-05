//@ts-expect-error revisar despues
import { DOMParser } from "xmldom"; // Importar DOMParser desde xmldom

import io from "socket.io-client";

// 🔑 Conexión Socket.IO (FUERA de la función uploadFile, se inicializa una sola vez)
const socketBackendReal = io(process.env.NEXT_PUBLIC_SOCKET_URL); // Asumimos que esta URL es pública y segura para el cliente

socketBackendReal.on("connect_error", (error) => {
  console.error("Error de conexión Socket.IO desde backend real:", error);
});
socketBackendReal.on("connect_timeout", (timeout) => {
  console.error("Timeout de conexión Socket.IO desde backend real:", timeout);
});
socketBackendReal.on("disconnect", (reason) => {
  console.log("Desconexión de Socket.IO desde backend real:", reason);
});

interface UploadResult {
  success: boolean;
  message?: string;
  publicUrl?: string | null;
  error?: string;
}

export async function uploadFile(formData: FormData): Promise<UploadResult> {
  const ASSEMBLYAI_API_KEY = process.env.NEXT_PUBLIC_ASSEMBLY_API_KEY;
  const archivo = formData.get("audioFile") as File;
  if (!ASSEMBLYAI_API_KEY) {
    console.error("Error: API Key de AssemblyAI no configurada.");
    throw new Error(
      "API Key de AssemblyAI no configurada. Debes reemplazar 'TU_API_KEY_DE_ASSEMBLYAI' con tu clave real."
    );
  }

  try {
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        Authorization: ASSEMBLYAI_API_KEY,
      },
      body: archivo,
    });

    if (!uploadResponse.ok) {
      console.error(
        `Error al subir el audio a AssemblyAI. Código de estado: ${uploadResponse.status}`
      );
      const errorDetails = await uploadResponse.text(); // Obtener detalles del error
      console.error("Detalles del error:", errorDetails);
      throw new Error(
        `Error al subir audio a AssemblyAI: ${uploadResponse.status} - ${uploadResponse.statusText}. Detalles: ${errorDetails}`
      );
    }

    const uploadResult = await uploadResponse.json();
    console.log("Audio subido exitosamente a AssemblyAI:", uploadResult);
    return uploadResult.upload_url; // Devuelve la URL de carga de AssemblyAI
  } catch (error) {
    console.error("Error general en la función uploadAudio:", error);
    throw error; // Relanza el error para que quien llame a la función pueda manejarlo
  }
}
