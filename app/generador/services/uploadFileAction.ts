''use
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
