"use server";
import htmlToDocx from "html-to-docx";
import { DOMParser } from "@xmldom/xmldom";

import {
  manejarError,
  writeLog,
  verificarArchivoExistente,
  obtenerContenidoArchivo,
} from "./utilsActions";

export async function formatContent(
  folder: string,
  file: string,
  contenidoActa: string
) {
  const nombreNormalizado = file;
  const nombreBorradorDocx = `${nombreNormalizado.replace(
    /\.[^/.]+$/,
    ""
  )}_Borrador.docx`;
  const nombreTranscripcionTxt = `${nombreNormalizado.replace(
    /\.[^/.]+$/,
    ""
  )}_Transcripcion.txt`;
  const nombreContenidoTxt = `${nombreNormalizado.replace(
    /\.[^/.]+$/,
    ""
  )}_Contenido.txt`;

  try {
    writeLog(
      `Iniciando formatContent (VERSION FUSIONADA) para: ${nombreNormalizado} en carpeta: ${folder}`
    );

    const urlNextcloud = process.env.NEXTCLOUD_URL;
    const usuario = process.env.NEXTCLOUD_USER;
    const contrasena = process.env.NEXTCLOUD_PASSWORD;

    if (!usuario || !contrasena || !urlNextcloud) {
      throw new Error("Credenciales de Nextcloud no configuradas.");
    }
    const rutaBaseActas = `${urlNextcloud}/remote.php/dav/files/${usuario}/Actas`;
    const rutaCarpetaActa = `${rutaBaseActas}/${folder}`;
    const rutaArchivoBorrador = `/Actas/${folder}/${nombreBorradorDocx}`;
    const rutaArchivoTranscripcion = `/Actas/${folder}/${nombreTranscripcionTxt}`;

    writeLog(`Verificando Borrador .docx existente: ${nombreBorradorDocx}`);
    if (await verificarArchivoExistente(nombreBorradorDocx, folder)) {
      writeLog(
        `Borrador .docx existente. Generando URLs públicas para archivos existentes.`
      );

      writeLog(
        `Generando URL pública para Borrador.docx (EXISTENTE): ${nombreBorradorDocx}`
      );
      const publicUrlBorrador = await obtenerUrlPublicaArchivoExistente(
        rutaArchivoBorrador,
        urlNextcloud,
        usuario,
        contrasena
      );
      if (!publicUrlBorrador) {
        throw new Error(
          `No se pudo obtener URL pública para Borrador.docx (EXISTENTE): ${nombreBorradorDocx}`
        );
      }
      writeLog(
        `URL pública de Borrador.docx (EXISTENTE) obtenida: ${publicUrlBorrador}`
      );

      writeLog(
        `Generando URL pública para Transcripcion.txt (EXISTENTE): ${nombreTranscripcionTxt}`
      );
      const publicUrlTranscripcion = await obtenerUrlPublicaArchivoExistente(
        rutaArchivoTranscripcion,
        urlNextcloud,
        usuario,
        contrasena
      );
      if (!publicUrlTranscripcion) {
        throw new Error(
          `No se pudo obtener URL pública para Transcripcion.txt (EXISTENTE): ${nombreTranscripcionTxt}`
        );
      }
      writeLog(
        `URL pública de Transcripcion.txt (EXISTENTE) obtenida: ${publicUrlTranscripcion}`
      );

      const fileIdFromUrlBorrador =
        obtenerFileIdDeUrlPublica(publicUrlBorrador);
      if (!fileIdFromUrlBorrador) {
        throw new Error(
          "No se pudo extraer fileId de la publicUrl de Borrador.docx (EXISTENTE)."
        );
      }
      const fileIdFromUrlTranscripcion = obtenerFileIdDeUrlPublica(
        publicUrlTranscripcion
      );
      if (!fileIdFromUrlTranscripcion) {
        throw new Error(
          "No se pudo extraer fileId de la publicUrl de Transcripcion.txt (EXISTENTE)."
        );
      }

      const baseUrlDescargaDirectaBorrador = `${urlNextcloud}/s/${fileIdFromUrlBorrador}/download`;
      const baseUrlDescargaDirectaTranscripcion = `${urlNextcloud}/s/${fileIdFromUrlTranscripcion}/download`;

      return {
        status: "success",
        message:
          "Borrador .docx ya existente. URLs de descarga pública generadas.",
        transcripcion: `${baseUrlDescargaDirectaTranscripcion}/${nombreTranscripcionTxt}`,
        acta: `${baseUrlDescargaDirectaBorrador}/${nombreBorradorDocx}`,
      };
    } else {
      writeLog(
        `Borrador .docx NO existente. Generando Borrador .docx y URLs públicas.`
      );

      let actaHTMLContent = contenidoActa;
      if (!actaHTMLContent) {
        writeLog(`Contenido del acta no proporcionado. Leyendo _Contenido.txt`);
        actaHTMLContent = await obtenerContenidoArchivo(
          folder,
          nombreContenidoTxt
        ) as string;
        if (!actaHTMLContent) {
          return {
            status: "error",
            message: `No se proporcionó contenido del acta y no se pudo leer _Contenido.txt`,
          };
        }
        writeLog(`Contenido de _Contenido.txt leído.`);
      } else {
        writeLog(`Usando contenido del acta proporcionado como parámetro.`);
      }

      writeLog(`Guardando Borrador .docx en Nextcloud: ${nombreBorradorDocx}`);
      const archivoGuardado = await guardarArchivoNextcloudDocx(
        folder,
        nombreBorradorDocx,
        actaHTMLContent
      );
      if (!archivoGuardado) {
        throw new Error("Error al guardar el archivo .docx en Nextcloud.");
      }
      writeLog(`Borrador .docx guardado exitosamente.`);

      writeLog(
        `Generando URL pública para Borrador.docx (RECIÉN CREADO): ${nombreBorradorDocx}`
      );
      const publicUrlBorrador = await obtenerUrlPublicaArchivoExistente(
        rutaArchivoBorrador,
        urlNextcloud,
        usuario,
        contrasena
      );
      if (!publicUrlBorrador) {
        throw new Error(
          `No se pudo obtener URL pública para Borrador.docx (RECIÉN CREADO): ${nombreBorradorDocx}`
        );
      }
      writeLog(
        `URL pública de Borrador.docx (RECIÉN CREADO) obtenida: ${publicUrlBorrador}`
      );

      writeLog(
        `Generando URL pública para Transcripcion.txt (EXISTENTE): ${nombreTranscripcionTxt}`
      );
      const publicUrlTranscripcion = await obtenerUrlPublicaArchivoExistente(
        rutaArchivoTranscripcion,
        urlNextcloud,
        usuario,
        contrasena
      );
      if (!publicUrlTranscripcion) {
        throw new Error(
          `No se pudo obtener URL pública para Transcripcion.txt (EXISTENTE): ${nombreTranscripcionTxt}`
        );
      }
      writeLog(
        `URL pública de Transcripcion.txt (EXISTENTE) obtenida: ${publicUrlTranscripcion}`
      );

      const fileIdFromUrlBorrador =
        obtenerFileIdDeUrlPublica(publicUrlBorrador);
      if (!fileIdFromUrlBorrador) {
        throw new Error(
          "No se pudo extraer fileId de la publicUrl de Borrador.docx (RECIÉN CREADO)."
        );
      }
      const fileIdFromUrlTranscripcion = obtenerFileIdDeUrlPublica(
        publicUrlTranscripcion
      );
      if (!fileIdFromUrlTranscripcion) {
        throw new Error(
          "No se pudo extraer fileId de la publicUrl de Transcripcion.txt (EXISTENTE)."
        );
      }

      const baseUrlDescargaDirectaBorrador = `${urlNextcloud}/s/${fileIdFromUrlBorrador}/download`;
      const baseUrlDescargaDirectaTranscripcion = `${urlNextcloud}/s/${fileIdFromUrlTranscripcion}/download`;

      return {
        status: "success",
        message:
          "Borrador .docx generado y guardado. URLs de descarga pública generadas.",
        transcripcion: `${baseUrlDescargaDirectaTranscripcion}/${nombreTranscripcionTxt}`,
        acta: `${baseUrlDescargaDirectaBorrador}/${nombreBorradorDocx}`,
      };
    }
  } catch (error) {
    manejarError("formatContent", error);
    return {
      status: "error",
      message:
        "Error al formatear el acta .docx y/o generar URLs de descarga pública en Nextcloud.",
    };
  }
}

function obtenerFileIdDeUrlPublica(publicUrl: string): string | null {
  if (!publicUrl) {
    return null;
  }

  const partesUrl = publicUrl.split("/");
  const indiceFileId = partesUrl.indexOf("s") + 1;

  if (indiceFileId > 0 && indiceFileId < partesUrl.length) {
    return partesUrl[indiceFileId];
  } else {
    console.error("No se pudo extraer el fileId de la URL pública:", publicUrl);
    return null;
  }
}

async function obtenerUrlPublicaArchivoExistente(
  rutaArchivoCompartir: string,
  urlNextcloud: string,
  usuario: string,
  contrasena: string
): Promise<string | null> {
  const cabecerasAutenticacion = {
    Authorization: "Basic " + btoa(usuario + ":" + contrasena),
    "Content-Type": "application/x-www-form-urlencoded",
    "OCS-APIRequest": "true",
  };

  try {
    writeLog(
      `Compartiendo archivo existente para obtener URL pública: ${rutaArchivoCompartir}`
    );
    const shareResponse = await fetch(
      `${urlNextcloud}/ocs/v2.php/apps/files_sharing/api/v1/shares`,
      {
        method: "POST",
        headers: cabecerasAutenticacion,
        body: new URLSearchParams({
          path: rutaArchivoCompartir,
          shareType: "3",
          permissions: "1",
        }),
      }
    );

    if (!shareResponse.ok) {
      console.error(
        `Error al compartir archivo existente en Nextcloud: Status ${shareResponse.status}, ${shareResponse.statusText}`
      );
      return null;
    }

    let publicUrlNextcloud = null;
    try {
      const responseText = await shareResponse.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseText, "text/xml");
      const urlElements = xmlDoc.getElementsByTagName("url");
      const urlElement = urlElements[0];

      if (urlElement) {
        publicUrlNextcloud = urlElement.textContent;
        writeLog(
          `URL pública de archivo existente obtenida: ${publicUrlNextcloud}`
        );
      } else {
        console.error(
          "Elemento <url> no encontrado en la respuesta XML al compartir archivo existente:",
          xmlDoc
        );
        return null;
      }
    } catch (xmlError) {
      manejarError("obtenerUrlPublicaArchivoExistente - parseo XML", xmlError);
      return null;
    }

    return publicUrlNextcloud;
  } catch (error) {
    manejarError("obtenerUrlPublicaArchivoExistente", error);
    return null;
  }
}



function limpiarHTMLParaDocx(htmlContent: string): string {
  if (!htmlContent) return "";

  let cleanedHTML = htmlContent;

  // Limpieza no destructiva: preservar estructura y formato útil
  // 1) Quitar fences y marcadores de exportación
  cleanedHTML = cleanedHTML
    .replace(/```(?:html)?/gi, "")
    .replace(/\[Text Wrapping Break\]/g, "");

  // 2) Normalizar espacios no separables y múltiples
  cleanedHTML = cleanedHTML
    .replace(/&nbsp;+/gi, " ")
    .replace(/[ \t]{2,}/g, " ");

  // 3) Compactar saltos de línea y <br> duplicados para evitar dobles espacios
  cleanedHTML = cleanedHTML
    .replace(/<br\s*\/?>\s*(?:<br\s*\/?>\s*)+/gi, "<br>")
    .replace(/\n{3,}/g, "\n\n");

  // 4) Eliminar párrafos vacíos redundantes
  cleanedHTML = cleanedHTML.replace(/<p>\s*<\/p>/gi, "");

  // 5) Quitar etiquetas de formato vacías (mantener negritas cuando tienen contenido)
  cleanedHTML = cleanedHTML
    .replace(/<strong>\s*<\/strong>/gi, "")
    .replace(/<b>\s*<\/b>/gi, "");

  // 6) Recortar extremos
  cleanedHTML = cleanedHTML.trim();

  return cleanedHTML;
}

async function guardarArchivoNextcloudDocx(
  folder: string,
  nombreActaDocx: string,
  textoActa: string
): Promise<boolean> {

  const actaContent = limpiarHTMLParaDocx(textoActa);

  writeLog(`Preparando guardado .docx en Nextcloud: ${nombreActaDocx}`);
  writeLog(
    `Contenido de actaContent justo antes de htmlToDocx: ${actaContent}`
  );

  writeLog(`VERSION DE NODE.JS EN DOCKER: ${process.version}`);
  writeLog(`SISTEMA OPERATIVO EN DOCKER: ${process.platform} ${process.arch}`);
  writeLog(`VARIABLES DE ENTORNO IMPORTANTES EN DOCKER:`);
  writeLog(`  NEXTCLOUD_URL: ${process.env.NEXTCLOUD_URL}`);
  writeLog(`  NEXTCLOUD_USER: ${process.env.NEXTCLOUD_USER}`);
  writeLog(
    `  (Contraseña de Nextcloud definida: ${!!process.env.NEXTCLOUD_PASSWORD})`
  );
  writeLog(`CONTENIDO HTML JUSTO ANTES DE htmlToDocx: ${actaContent}`);

  try {
    // Configuración mínima sin formato especial
    const options = {
      header: false,
      footer: false,
      pageNumber: false
    };



    const docxBuffer = await htmlToDocx(actaContent, null, options);



    const usuario = process.env.NEXTCLOUD_USER;
    const contrasena = process.env.NEXTCLOUD_PASSWORD;
    const urlNextcloud = process.env.NEXTCLOUD_URL;

    if (!usuario || !contrasena || !urlNextcloud) {
      throw new Error("Credenciales de Nextcloud no configuradas.");
    }

    const rutaBaseActas = `${urlNextcloud}/remote.php/dav/files/${usuario}/Actas`;
    const rutaCompletaArchivoDocx = `${rutaBaseActas}/${folder}/${nombreActaDocx}`;

    const contentLength = Buffer.byteLength(docxBuffer as unknown as string);

    const cabecerasAutenticacion = {
      Authorization:
        "Basic " + Buffer.from(`${usuario}:${contrasena}`).toString("base64"),
      "Content-Type": "application/octet-stream",
      "Content-Length": contentLength.toString(),
    };



    const respuestaGuardado = await fetch(rutaCompletaArchivoDocx, {
      method: "PUT",
      headers: cabecerasAutenticacion,
      body: docxBuffer,
    });

    if (!respuestaGuardado.ok) {
      const errorText = await respuestaGuardado.text();
      console.error(
        `Error al guardar .docx en Nextcloud: Status ${respuestaGuardado.status}, ${respuestaGuardado.statusText}, Body: ${errorText}`
      );
      return false;
    }


    return true;
  } catch (error) {
    console.error("Error en guardarArchivoNextcloudDocx:", error);
    return false;
  }
}