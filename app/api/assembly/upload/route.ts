import { NextRequest, NextResponse } from "next/server";
import { obtenerClienteTranscripcion } from "@/app/(generador)/services/generacion_contenido_services/utilsActions";

export async function POST(req: NextRequest) {
  try {
    const client = await obtenerClienteTranscripcion();

    const buffer = await req.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const uploadUrl = await client.files.upload(fileBuffer);

    return NextResponse.json({
      upload_url: uploadUrl,
      success: true,
    });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error uploading file",
      },
      { status: 500 },
    );
  }
}
