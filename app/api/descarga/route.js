import { NextResponse } from "next/server";

export async function GET(req) {
  const searchParams = req.nextUrl.searchParams;
  const fileUrl = searchParams.get("url");

  if (!fileUrl) {
    return new NextResponse("URL del archivo no proporcionada.", {
      status: 400,
    });
  }

  try {
    const response = await fetch(fileUrl);

    if (!response.ok) {
      console.error(
        "Error al descargar desde Nextcloud:",
        response.status,
        response.statusText
      );
      return new NextResponse(
        `Error al descargar el archivo desde Nextcloud: ${response.statusText}`,
        { status: response.status }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
    
    const contentDisposition = response.headers.get("Content-Disposition");
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    } else {
      const fileName = fileUrl.split('/').pop() || 'archivo';
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
    }
    
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    return new NextResponse(response.body, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error("Error en el proxy de descarga:", error);
    return new NextResponse("Error interno al procesar la descarga.", {
      status: 500,
    });
  }
}
