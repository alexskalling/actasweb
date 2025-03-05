"use server";

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
  textoActa: string
): Promise<boolean> {
  // **AHORA CREANDO UN SIMPLE ARCHIVO DE TEXTO EN LUGAR DE DOCX**
  const textContent =
    "Este es un archivo de texto plano subido desde Docker a Nextcloud.";
  const textFileName = nombreActaDocx.replace(".docx", ".txt"); // Cambiar nombre de archivo a .txt

  writeLog(`Preparando guardado .txt en Nextcloud: ${textFileName}`);
  writeLog(`Contenido de textContent (texto plano): ${textContent}`);
  console.log("textContent (Texto Plano): ", textContent);

  // **AÑADIDOS LOGS DE DEBUGGING - INFORMACIÓN DEL ENTORNO - SIN CAMBIOS**
  writeLog(`VERSION DE NODE.JS EN DOCKER: ${process.version}`);
  writeLog(`SISTEMA OPERATIVO EN DOCKER: ${process.platform} ${process.arch}`);
  writeLog(`VARIABLES DE ENTORNO IMPORTANTES EN DOCKER:`);
  writeLog(`  NEXTCLOUD_URL: ${process.env.NEXTCLOUD_URL}`);
  writeLog(`  NEXTCLOUD_USER: ${process.env.NEXTCLOUD_USER}`);
  writeLog(
    `  (Contraseña de Nextcloud definida: ${!!process.env.NEXTCLOUD_PASSWORD})`
  );
  // LOG DEL CONTENIDO TEXTO  - SIN CAMBIOS
  writeLog(`CONTENIDO TEXTO A SUBIR: ${textContent}`);
  console.log(textoActa); // Sigue mostrando textoActa en consola (aunque ahora usamos textContent)
  try {
    // **YA NO CREA DOCX - SOLO USA CONTENIDO DE TEXTO COMO BUFFER**
    const textBuffer = Buffer.from(textContent, "utf-8"); // Buffer desde el contenido de texto
    const bufferStream = Readable.from(textBuffer);

    writeLog(`Tamaño del textBuffer generado: ${textBuffer.length} bytes`); // **LOG DE DEPURACIÓN - Tamaño textBuffer**

    // **NUEVA PRUEBA - GUARDAR textBuffer LOCALMENTE COMO ARCHIVO DE TEXTO**
    const rutaArchivoLocalPrueba = path.join(
      "/tmp",
      `prueba_${textFileName}` // Usando nombre de archivo .txt
    ); // Ajusta la ruta si es necesario
    writeLog(
      `Guardando textBuffer localmente para prueba en: ${rutaArchivoLocalPrueba}`
    );
    await fs.writeFile(rutaArchivoLocalPrueba, textBuffer); // Guardar textBuffer localmente

    writeLog(
      `Primeros 100 bytes de textBuffer (hex): ${textBuffer
        .subarray(0, 100)
        .toString("hex")}`
    ); // **NUEVO LOG - CONTENIDO textBuffer (PRIMEROS 100 BYTES en HEX)**

    const usuario = process.env.NEXTCLOUD_USER;
    const contrasena = process.env.NEXTCLOUD_PASSWORD;
    const urlNextcloud = process.env.NEXTCLOUD_URL;

    if (!usuario || !contrasena || !urlNextcloud) {
      throw new Error("Credenciales de Nextcloud no configuradas.");
    }

    const rutaBaseActas = `${urlNextcloud}/remote.php/dav/files/${usuario}/Actas`;
    const rutaCompletaCarpeta = `${rutaBaseActas}/${folder}`;
    const rutaCompletaArchivoText = `${rutaCompletaCarpeta}/${textFileName}`; // Usando nombre .txt para ruta en Nextcloud

    // **NUEVO - CALCULAR Content-Length EXPLICITAMENTE - SIN CAMBIOS**
    const contentLength = Buffer.byteLength(textBuffer); // Tamaño del textBuffer

    // **MODIFICACIÓN IMPORTANTE - CABECERAS - Content-Type AHORA text/plain**
    const cabecerasAutenticacionBase = {
      // Renombrando para no confundir - SIN CAMBIOS
      Authorization: "Basic " + btoa(usuario + ":" + contrasena),
      // **QUITAMOS Content-Type DE AQUÍ - SIN CAMBIOS**
    };

    const cabecerasAutenticacion = {
      // Usamos un nuevo objeto para las cabeceras FINALES - **Content-Type CAMBIADO a text/plain**
      ...cabecerasAutenticacionBase, // **SPREAD DE LAS CABECERAS BASE (Authorization) - SIN CAMBIOS**
      "Content-Type": "text/plain", // **CONTENT-TYPE AHORA ES text/plain**
      "Content-Length": contentLength.toString(), // **MANTENEMOS Content-Length - SIN CAMBIOS**
    };

    writeLog(`Implementación de fetch: ${global.fetch.toString()}`); // **AÑADIDO LOG - Implementación de fetch - SIN CAMBIOS**

    writeLog(`**INICIO LOG PETICIÓN FETCH PUT TEXT (PRUEBA):**`); // **CABECERA DEL LOG CAMBIADA A TEXTO**
    writeLog(`  Método: PUT`); // **LOG - MÉTODO - SIN CAMBIOS**
    writeLog(`  URL: ${rutaCompletaArchivoText}`); // **LOG - URL - AHORA URL DE ARCHIVO DE TEXTO**
    writeLog(`  Headers:`); // **LOG - CABECERAS (JSON INDENTADO) - SIN CAMBIOS**
    writeLog(JSON.stringify(cabecerasAutenticacion, null, 2));
    writeLog(
      `  Body: ReadableStream (Buffer de tamaño ${textBuffer.length} bytes)`
    ); // **LOG - INFO DEL BODY - Tamaño del Buffer ahora de textBuffer**
    writeLog(`**FIN LOG PETICIÓN FETCH PUT TEXT (PRUEBA)**`); // **PIE DEL LOG CAMBIADO A TEXTO**

    const respuestaGuardado = await fetch(rutaCompletaArchivoText, {
      // **URL AHORA ES DE ARCHIVO DE TEXTO**
      method: "PUT",
      headers: cabecerasAutenticacion, // **USAMOS EL NUEVO OBJETO DE CABECERAS - SIN CAMBIOS**
      //@ts-expect-error revisar despues
      body: bufferStream,
      duplex: "half", // **MANTENEMOS duplex: 'half'**
    });

    if (!respuestaGuardado.ok) {
      console.error(
        `Error al guardar .txt en Nextcloud: Status ${respuestaGuardado.status}, ${respuestaGuardado.statusText}` // **MENSAJE DE ERROR CAMBIADO A .txt**
      );
      return false;
    }

    writeLog(
      `.txt guardado exitosamente en Nextcloud (PRUEBA ARCHIVO DE TEXTO): ${textFileName}` // **MENSAJE DE ÉXITO CAMBIADO A ARCHIVO DE TEXTO**
    );
    return true;
  } catch (error) {
    manejarError("guardarArchivoNextcloudDocx", error); // Nombre del manejador de error sigue siendo de la función DOCX, OK por ahora.
    return false;
  }
}
