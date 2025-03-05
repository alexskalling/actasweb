// services/assemblyaiActions.ts (modificado)

const ASSEMBLYAI_API_KEY = process.env.NEXT_PUBLIC_ASSEMBLY_API_KEY;

if (!ASSEMBLYAI_API_KEY) {
  console.error("ASSEMBLYAI_API_KEY is not set in environment variables.");
}

export const uploadFileToAssemblyAI = async (
  formData: FormData
): Promise<{
  success: boolean;
  uploadUrl?: string;
  transcriptId?: string;
  error?: string;
}> => {
  // Retornará transcriptId también
  if (!ASSEMBLYAI_API_KEY) {
    return { success: false, error: "AssemblyAI API key is not configured." };
  }

  const audioFile = formData.get("audioFile") as File;

  if (!audioFile) {
    return { success: false, error: "No audio file provided in formData." };
  }

  try {
    // **Paso 1: Subir el archivo (como antes)**
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        Authorization: ASSEMBLYAI_API_KEY,
      },
      body: audioFile,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(
        "AssemblyAI Upload API error:",
        uploadResponse.status,
        errorText
      );
      return {
        success: false,
        error: `Upload failed with status ${uploadResponse.status}: ${errorText}`,
      };
    }

    const uploadResult = await uploadResponse.json();
    const uploadUrl = uploadResult?.upload_url; // Extraer upload_url

    if (!uploadUrl) {
      console.error(
        "AssemblyAI Upload API response missing upload_url:",
        uploadResult
      );
      return {
        success: false,
        error: "Upload successful but upload URL not found in response.",
      };
    }

    // **Paso 2: Iniciar la transcripción (NUEVO)**
    const transcriptionResponse = await fetch(
      "https://api.assemblyai.com/v2/transcript",
      {
        method: "POST",
        headers: {
          Authorization: ASSEMBLYAI_API_KEY,
          "Content-Type": "application/json", // Importante indicar que enviamos JSON
        },
        body: JSON.stringify({
          audio_url: uploadUrl, // Usamos la upload_url obtenida del paso 1
        }),
      }
    );

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error(
        "AssemblyAI Transcription API error:",
        transcriptionResponse.status,
        errorText
      );
      return {
        success: false,
        uploadUrl: uploadUrl,
        error: `Transcription start failed with status ${transcriptionResponse.status}: ${errorText}`,
      }; // Devolvemos también uploadUrl en caso de error de transcripción, por si acaso
    }

    const transcriptionResult = await transcriptionResponse.json();
    const transcriptId = transcriptionResult?.id; // Extraer transcript_id

    if (!transcriptId) {
      console.error(
        "AssemblyAI Transcription API response missing transcript_id:",
        transcriptionResult
      );
      return {
        success: false,
        uploadUrl: uploadUrl,
        error:
          "Transcription started successfully but transcript ID not found in response.",
      }; // Devolvemos también uploadUrl en caso de error de transcript_id, por si acaso
    }

    return { success: true, uploadUrl: uploadUrl, transcriptId: transcriptId }; // Retornar ambos: uploadUrl y transcriptId
  } catch (error) {
    console.error(
      "Error during AssemblyAI file upload and transcription:",
      error
    );
    return {
      success: false,
      error: `Error uploading and starting transcription with AssemblyAI: ${error}`,
    };
  }
};
