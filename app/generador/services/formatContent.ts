"use server";
//@ts-expect-error revisar despues
import htmlToDocx from "html-to-docx";
import { Readable } from "stream";
//@ts-expect-error revisar despues

import { DOMParser } from "xmldom"; // Asegúrate de tener xmldom: npm install xmldom

import {
  manejarError,
  writeLog,
  verificarArchivoExistente,
  obtenerContenidoArchivo,
} from "./utilsActions";

import io from "socket.io-client";

// 🔑 Conexión Socket.IO (FUERA de la función uploadFile, se inicializa una sola vez)
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
    // 1. Verificar si _Borrador.docx ya existe.
    if (await verificarArchivoExistente(nombreBorradorDocx, folder)) {
      writeLog(
        `Borrador .docx existente. Generando URLs públicas para archivos existentes.`
      );

      // Generar URLs públicas para Borrador.docx y Transcripcion.txt (EXISTENTES)
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

      // Extraer fileId de AMBAS URLs públicas
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
      // Borrador.docx NO existe, hay que crearlo

      writeLog(
        `Borrador .docx NO existente. Generando Borrador .docx y URLs públicas.`
      );

      let actaHTMLContent = contenidoActa;
      // 2. Priorizar contenidoActa, si no, leer _Contenido.txt
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

      // 3. Guardar acta .docx en Nextcloud
      const archivoGuardado = await guardarArchivoNextcloudDocx(
        folder,
        nombreBorradorDocx,
        actaHTMLContent
      );
      if (!archivoGuardado) {
        throw new Error("Error al guardar el archivo .docx en Nextcloud.");
      }
      writeLog(`Borrador .docx guardado exitosamente.`);

      // Generar URLs públicas para Borrador.docx (RECIÉN CREADO) y Transcripcion.txt (EXISTENTE)
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

      // Extraer fileId de AMBAS URLs públicas
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
  // Buscar el segmento que sigue a '/s/' que debería ser el fileId
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

// Función para guardar el archivo .docx en Nextcloud (CON CAMBIOS IMPORTANTES PARA PRUEBAS: duplex: "half", Content-Type octet-stream, Buffer.from, log de fetch, CONSOLE LOGS ADICIONALES, GUARDADO LOCAL, LOG CONTENIDO docxBuffer, HTML MUY SIMPLE DE PRUEBA, **CONTENT-LENGTH HEADER EXPLICITO**)
import fs from "fs/promises"; // Importar fs.promises para guardar archivo localmente
import path from "path";

async function guardarArchivoNextcloudDocx(
  folder: string,
  nombreActaDocx: string,
  textoActa: string // Aunque este parámetro no se usa directamente ahora, se mantiene para la estructura de la función
): Promise<boolean> {
  // **HTML EXTREMADAMENTE SIMPLE DE PRUEBA - DIRECTAMENTE EN EL CÓDIGO**
  const actaContent =
    "<h1>Prueba DOCX Simple</h1><p>Texto sencillo de prueba para Docker.</p>";

  writeLog(`Preparando guardado .docx en Nextcloud: ${nombreActaDocx}`);
  writeLog(
    `Contenido de actaContent justo antes de htmlToDocx: ${actaContent}`
  );
  console.log("actaContent (HTML Simple de Prueba): ", actaContent);

  // **AÑADIDOS LOGS DE DEBUGGING - INFORMACIÓN DEL ENTORNO**
  writeLog(`VERSION DE NODE.JS EN DOCKER: ${process.version}`);
  writeLog(`SISTEMA OPERATIVO EN DOCKER: ${process.platform} ${process.arch}`);
  writeLog(`VARIABLES DE ENTORNO IMPORTANTES EN DOCKER:`);
  writeLog(`  NEXTCLOUD_URL: ${process.env.NEXTCLOUD_URL}`);
  writeLog(`  NEXTCLOUD_USER: ${process.env.NEXTCLOUD_USER}`);
  writeLog(
    `  (Contraseña de Nextcloud definida: ${!!process.env.NEXTCLOUD_PASSWORD})`
  );
  // LOG DEL CONTENIDO HTML JUSTO ANTES DE htmlToDocx (PARA COMPARAR CON LOCAL)
  writeLog(`CONTENIDO HTML JUSTO ANTES DE htmlToDocx: ${actaContent}`);
  console.log(textoActa);
  try {
    const docxBuffer = await htmlToDocx(actaContent);
    writeLog(
      `Tamaño del docxBuffer generado por htmlToDocx: ${docxBuffer.length} bytes`
    ); // **LOG DE DEPURACIÓN - Tamaño docxBuffer**

    // **NUEVA PRUEBA - GUARDAR docxBuffer LOCALMENTE**
    const rutaArchivoLocalPrueba = path.join(
      "/tmp",
      `prueba_${nombreActaDocx}`
    ); // Ajusta la ruta si es necesario
    writeLog(
      `Guardando docxBuffer localmente para prueba en: ${rutaArchivoLocalPrueba}`
    );
    await fs.writeFile(rutaArchivoLocalPrueba, Buffer.from(docxBuffer)); // Guardar como Buffer

    writeLog(
      `Primeros 100 bytes de docxBuffer (hex): ${Buffer.from(docxBuffer)
        .subarray(0, 100)
        .toString("hex")}`
    ); // **NUEVO LOG - CONTENIDO docxBuffer (PRIMEROS 100 BYTES en HEX)**
    console.log(
      "Primeros 100 bytes de docxBuffer (hex): ",
      Buffer.from(docxBuffer).subarray(0, 100).toString("hex")
    ); // Console.log también

    // const bufferStream = Readable.from(docxBuffer); // Línea original
    const bufferStream = Readable.from(Buffer.from(docxBuffer)); // **MANTENEMOS Buffer.from()**

    const usuario = process.env.NEXTCLOUD_USER;
    const contrasena = process.env.NEXTCLOUD_PASSWORD;
    const urlNextcloud = process.env.NEXTCLOUD_URL;

    if (!usuario || !contrasena || !urlNextcloud) {
      throw new Error("Credenciales de Nextcloud no configuradas.");
    }

    const rutaBaseActas = `${urlNextcloud}/remote.php/dav/files/${usuario}/Actas`;
    const rutaCompletaCarpeta = `${rutaBaseActas}/${folder}`;
    const rutaCompletaArchivoDocx = `${rutaCompletaCarpeta}/${nombreActaDocx}`;

    // **NUEVO - CALCULAR Content-Length EXPLICITAMENTE**
    const contentLength = Buffer.byteLength(docxBuffer); // Calcular tamaño en bytes del buffer

    const cabecerasAutenticacion = {
      Authorization: "Basic " + btoa(usuario + ":" + contrasena),
      "Content-Type": "application/octet-stream", // **MANTENEMOS Content-Type application/octet-stream PARA PRUEBAS**
      "Content-Length": contentLength.toString(), // **NUEVO - AÑADIR Content-Length HEADER EXPLICITAMENTE**
    };

    writeLog(`Implementación de fetch: ${global.fetch.toString()}`); // **AÑADIDO LOG - Implementación de fetch**

    const respuestaGuardado = await fetch(rutaCompletaArchivoDocx, {
      method: "PUT",
      headers: cabecerasAutenticacion,
      //@ts-expect-error revisar despues
      body: bufferStream,
      duplex: "half", // **VOLVEMOS A duplex: "half"**
    });

    if (!respuestaGuardado.ok) {
      console.error(
        `Error al guardar .docx en Nextcloud: Status ${respuestaGuardado.status}, ${respuestaGuardado.statusText}`
      );
      return false;
    }

    writeLog(
      `.docx guardado exitosamente en Nextcloud con Content-Type: application/octet-stream, Content-Length: ${contentLength}, y duplex: half: ${nombreActaDocx}`
    ); // **LOG MODIFICADO - Indica Content-Type, Content-Length y duplex: half**
    return true;
  } catch (error) {
    manejarError("guardarArchivoNextcloudDocx", error);
    return false;
  }
}
