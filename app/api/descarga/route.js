// app/api/descargar-archivo/route.js (o .ts) - Estructura 'app directory' en Next.js 13+
import { NextResponse } from "next/server";

export async function GET(req) {
  // Usamos GET para este ejemplo, también podrías usar POST si prefieres
  const searchParams = req.nextUrl.searchParams;
  const fileUrl = searchParams.get("url"); // Obtén la URL del archivo desde query parameters

  if (!fileUrl) {
    return new NextResponse("URL del archivo no proporcionada.", {
      status: 400,
    });
  }

  try {
    const response = await fetch(fileUrl); // Petición server-side a la URL de Nextcloud

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

    // Configurar headers para forzar la descarga
    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
    
    // Forzar descarga con nombre de archivo
    const contentDisposition = response.headers.get("Content-Disposition");
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    } else {
      // Si no hay Content-Disposition, crear uno
      const fileName = fileUrl.split('/').pop() || 'archivo';
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
    }
    
    // Headers adicionales para evitar cache y forzar descarga
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");

    // Enviar el stream de la respuesta directamente al cliente
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
