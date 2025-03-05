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

    // Reenviar los headers importantes para la descarga (Content-Type, Content-Disposition)
    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("Content-Type"));
    headers.set(
      "Content-Disposition",
      response.headers.get("Content-Disposition")
    );

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
