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
  console.log("inicio carga");
  // Retornará transcriptId también
  if (!ASSEMBLYAI_API_KEY) {
    return { success: false, error: "AssemblyAI API key is not configured." };
  }

  const audioFile = formData.get("audioFile") as File;

  if (!audioFile) {
    return { success: false, error: "No audio file provided in formData." };
  }
  console.log("llamando al api");
  try {
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
    console.log("revcisando url");
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
    console.log(JSON.stringify(uploadResponse));
    console.log("url" + uploadUrl);

    return { success: true, uploadUrl: uploadUrl }; // Retornar ambos: uploadUrl y transcriptId
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
