"use server";
//@ts-expect-error revisar despues
import htmlToDocx from "html-to-docx";
import { Readable } from "stream";

import {
  autenticarGoogleDrive,
  manejarError,
  obtenerContenidoArchivoDrive,
  obtenerOCrearCarpeta,
  verificarArchivoExistente,
  writeLog,
} from "./utilsActions";

export async function formatContent(nombreNormalizado: string) {
  try {
    writeLog(
      `[${new Date().toISOString()}] Iniciando formato de contenido. ${nombreNormalizado}`
    );

    const drive = await autenticarGoogleDrive();
    const idCarpeta = await obtenerOCrearCarpeta(drive, nombreNormalizado);

    // Definimos los nombres de los archivos
    const nombreContenido = `${nombreNormalizado.replace(
      /\.[^/.]+$/,
      ""
    )}_Contenido.txt`;
    const nombreBorrador = `${nombreNormalizado.replace(
      /\.[^/.]+$/,
      ""
    )}_Borrador.docx`;
    const nombreTranscripcion = `${nombreNormalizado.replace(
      /\.[^/.]+$/,
      ""
    )}_Transcripcion.txt`;

    // Verifica si los archivos ya existen
    const actaExistente = await verificarArchivoExistente(
      drive,
      nombreBorrador,
      idCarpeta
    );
    const contenidoExistente = await verificarArchivoExistente(
      drive,
      nombreContenido,
      idCarpeta
    );
    const transcripcionExistente = await verificarArchivoExistente(
      drive,
      nombreTranscripcion,
      idCarpeta
    );

    if (actaExistente) {
      // Si el acta ya existe, se termina el proceso
      writeLog(`[${new Date().toISOString()}] Formato ya generado.`);
      return {
        status: "success",
        trasncripcion: `https://drive.google.com/uc?export=download&id=${transcripcionExistente}`,
        acta: `https://drive.google.com/uc?export=download&id=${actaExistente}`,
      };
    } else if (contenidoExistente) {
      // Si el contenido existe pero no el acta, generamos el formato
      const contenido = await obtenerContenidoArchivoDrive(
        drive,
        contenidoExistente
      );
      writeLog("Formato generado:");

      const archivoSubido = await subirActa(
        drive,
        //@ts-expect-error revisar despues
        contenido,
        nombreBorrador,
        idCarpeta
      );

      if (!archivoSubido) {
        throw new Error("Error al subir el archivo acta.");
      }

      console.log("id acta subida:" + JSON.stringify(archivoSubido.data.id));

      writeLog(
        `[${new Date().toISOString()}] Acta lista y guardada como ${nombreBorrador}.`
      );
      return {
        status: "success",
        trasncripcion: `https://drive.google.com/uc?export=download&id=${transcripcionExistente}`,
        acta: `https://drive.google.com/uc?export=download&id=${archivoSubido.data.id}`,
      };
    } else {
      // Si ni el acta ni el contenido existen, respondemos error
      return {
        status: "error",
        message: "No se encontró el contenido o el acta",
      };
    }
  } catch (error) {
    // Manejo de errores
    manejarError("Generar formato", error);
    return {
      status: "error",
      message: "Problemas en el proceso de formato de acta",
    };
  }
}

async function subirActa(
  drive: unknown,
  textoActa: string,
  nombreActa: string,
  idCarpeta: string
) {
  const actaContent = textoActa
    .replace(/```html/g, "")
    .replace(/html/g, "")
    .replace(/```/g, "")
    .replace(/< lang="es">/g, "")
    .replace(/<\/?>/g, "")
    .replace(/\[Text Wrapping Break\]/g, "")
    .trim();

  writeLog(`[${new Date().toISOString()}] Subiendo acta. ${actaContent}`);

  // Convertir el contenido de HTML a formato DOCX
  const docxBuffer = await htmlToDocx(actaContent);
  const bufferStream = Readable.from(docxBuffer);

  const metadatosArchivo = {
    name: nombreActa,
    parents: [idCarpeta],
  };

  const contenidoArchivo = {
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    body: bufferStream,
  };

  try {
    // Subir el archivo a Google Drive
    //@ts-expect-error revisar despues

    const archivoSubido = await drive.files.create({
      requestBody: metadatosArchivo,
      media: contenidoArchivo,
      fields: "id, webViewLink",
    });

    // Asignar permisos de lectura pública
    //@ts-expect-error revisar despues

    await drive.permissions.create({
      fileId: archivoSubido.data.id,
      requestBody: {
        type: "anyone",
        role: "reader",
      },
    });

    writeLog(
      `[${new Date().toISOString()}] Contenido cargado con éxito. ID: ${
        archivoSubido.data.id
      }`
    );

    return archivoSubido;
  } catch (error) {
    writeLog(
      //@ts-expect-error revisar despues

      `[${new Date().toISOString()}] Error al subir contenido: ${error.message}`
    );
    throw new Error("Error al subir contenido a Google Drive");
  }
}
