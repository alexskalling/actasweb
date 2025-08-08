"use server";
//@ts-expect-error revisar despues
import htmlToDocx from "html-to-docx";
//@ts-expect-error revisar despues

import { DOMParser } from "xmldom";

import {
  manejarError,
  writeLog,
  verificarArchivoExistente,
  obtenerContenidoArchivo,
} from "./utilsActions";

import io from "socket.io-client";

const socketBackendReal = io(process.env.NEXT_PUBLIC_SOCKET_URL);

socketBackendReal.on("connect_error", (error) => {
  console.error("Error de conexión Socket.IO desde backend real:", error);
});
socketBackendReal.on("connect_timeout", (timeout) => {
  console.error("Timeout de conexión Socket.IO desde backend real:", timeout);
});
socketBackendReal.on("disconnect", (reason) => {
  console.log("Desconexión de Socket.IO desde backend real:", reason);
});

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

    socketBackendReal.emit("upload-status", {
      roomName: folder,
      statusData: {
        message: `[Formato] Organizando el contenido del acta en formato legible`,
      },
    });

    const urlNextcloud = process.env.NEXTCLOUD_URL;
    const usuario = process.env.NEXTCLOUD_USER;
    const contrasena = process.env.NEXTCLOUD_PASSWORD;

    if (!usuario || !contrasena || !urlNextcloud) {
      throw new Error("Credenciales de Nextcloud no configuradas.");
    }
    const rutaBaseActas = `${urlNextcloud}/remote.php/dav/files/${usuario}/Actas`;
    const rutaCarpetaActa = `${rutaBaseActas}/${folder}`;
    console.log(rutaCarpetaActa);

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
        //@ts-expect-error revisar despues
        actaHTMLContent = await obtenerContenidoArchivo(
          folder,
          nombreContenidoTxt
        );
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
      socketBackendReal.emit("upload-status", {
        roomName: folder,
        statusData: {
          message: `[Formato] Guardando resultado de formato`,
        },
      });

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
      socketBackendReal.emit("upload-status", {
        roomName: folder,
        statusData: {
          message: `Felicidades tu proceso ha terminado, ya puedes descargar tu acta`,
        },
      });

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

  // SOLUCIÓN DRASTICA: Eliminar completamente las etiquetas de formato
  // Esto evita que htmlToDocx genere saltos de línea
  cleanedHTML = cleanedHTML.replace(/<strong>/g, '').replace(/<\/strong>/g, '');
  cleanedHTML = cleanedHTML.replace(/<b>/g, '').replace(/<\/b>/g, '');
  
  // Eliminar <br><br> que causan doble espaciado entre párrafos
  cleanedHTML = cleanedHTML.replace(/<br><br>/g, '');
  cleanedHTML = cleanedHTML.replace(/<br\s*\/?>\s*<br\s*\/?>/g, '');

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

    const contentLength = Buffer.byteLength(docxBuffer);

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