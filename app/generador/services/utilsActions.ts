"use server";
import { google } from "googleapis";
import { Readable } from "stream";
import fs from "fs";
import { AssemblyAI } from "assemblyai";
import OpenAI from "openai/index.mjs";

export async function obtenerClienteTranscripcion() {
  return new AssemblyAI({
    //@ts-expect-error revisar despues

    apiKey: process.env.ASSEMBLY_API_KEY,
  });
}

//@ts-expect-error revisar despues

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function obtenerOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
//@ts-expect-error revisar despues

export async function obtenerContenidoArchivoDrive(drive, fileId) {
  try {
    // Obtener el archivo desde Google Drive como stream
    const archivoStream = await drive.files.get(
      {
        fileId: fileId,
        alt: "media", // Obtiene el contenido del archivo
      },
      { responseType: "stream" }
    );

    // Leer el contenido del archivo desde el stream
    const contenido = await new Promise((resolve, reject) => {
      let contenidoTotal = "";
      archivoStream.data
        //@ts-expect-error revisar despues

        .on("data", (chunk) => {
          contenidoTotal += chunk; // Agregar cada fragmento al contenido total
        })
        .on("end", () => {
          resolve(contenidoTotal); // Resolver con el contenido completo
        })
        //@ts-expect-error revisar despues

        .on("error", (error) => {
          reject(error); // Rechazar en caso de error
        });
    });

    return contenido; // Devolver el contenido leído
  } catch (error) {
    console.error("Error al obtener el contenido del archivo:", error);
    throw error; // Lanza el error para que pueda manejarse externamente
  }
}

export async function normalizarNombreArchivo(nombreArchivo: string) {
  console.log("Normalizando nombre: " + nombreArchivo);
  if (!nombreArchivo) {
    const errorMsg = "El nombre del archivo es indefinido";
    writeLog(`[${new Date().toISOString()}] Error: ${errorMsg}.`);
    throw new Error(errorMsg);
  }

  const name = nombreArchivo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\s+/g, "_")
    .toLowerCase();
  console.log("Nombre normalizado: " + name);

  return name;
}

export async function autenticarGoogleDrive() {
  writeLog(`[${new Date().toISOString()}] Autenticando en Google Drive.`);

  // Verifica que las variables de entorno estén definidas
  const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error(
      "Faltan las variables de entorno para la autenticación de Google Drive"
    );
  }

  // Configuración de la autenticación
  const auth = new google.auth.GoogleAuth({
    credentials: {
      private_key: privateKey.replace(/\\n/g, "\n"), // Asegúrate de restaurar los saltos de línea correctamente
      client_email: clientEmail,
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  // Retorna la instancia autenticada de Google Drive
  return google.drive({ version: "v3", auth });
}

export async function obtenerOCrearCarpeta(
  drive: unknown,
  nombreNormalizado: string
) {
  writeLog(`[${new Date().toISOString()}] Verificando o creando carpeta.`);
  const nombreCarpeta = nombreNormalizado.replace(/\.[^/.]+$/, "");
  //@ts-expect-error revisar despues

  const respuestaCarpetaExistente = await drive.files.list({
    q: `name='${nombreCarpeta}' and mimeType='application/vnd.google-apps.folder' and '1vm0oIotvB4v4zAMwNYvtZzkHAIKVacQ9' in parents`,
    fields: "files(id)",
  });

  let idCarpeta = respuestaCarpetaExistente?.data?.files?.[0]?.id ?? null;
  if (!idCarpeta) {
    const carpetaNueva = {
      name: nombreCarpeta,
      mimeType: "application/vnd.google-apps.folder",
      parents: ["1vm0oIotvB4v4zAMwNYvtZzkHAIKVacQ9"],
    };
    //@ts-expect-error revisar despues

    const respuestaCarpetaNueva = await drive.files.create({
      requestBody: carpetaNueva,
      fields: "id",
    });
    idCarpeta = respuestaCarpetaNueva.data.id;
    writeLog(
      `[${new Date().toISOString()}] Carpeta creada con ID: ${idCarpeta}.`
    );
  } else {
    writeLog(
      `[${new Date().toISOString()}] Carpeta existente con ID: ${idCarpeta}.`
    );
  }
  return idCarpeta;
}

export async function verificarArchivoExistente(
  drive: unknown,
  nombreNormalizado: string,
  idCarpeta: string
) {
  writeLog(`[${new Date().toISOString()}] Verificando existencia del archivo.`);
  //@ts-expect-error revisar despues

  const respuestaArchivoExistente = await drive.files.list({
    q: `name='${nombreNormalizado}' and '${idCarpeta}' in parents`,
    fields: "files(id, webViewLink)",
  });
  if (respuestaArchivoExistente.data?.files?.length > 0) {
    const urlArchivoExistente = respuestaArchivoExistente.data.files[0].id;
    writeLog(
      `[${new Date().toISOString()}] Archivo ya existe. URL: ${urlArchivoExistente}.`
    );
    return urlArchivoExistente;
  }
  writeLog(`[${new Date().toISOString()}] Archivo no encontrado.`);
  return null;
}

export async function subirArchivo(
  drive: unknown,
  archivo: unknown,
  nombreNormalizado: string,
  idCarpeta: string
) {
  try {
    writeLog(`[${new Date().toISOString()}] Iniciando subida de archivo.`);

    // Preparación de los metadatos del archivo
    const metadataArchivo = {
      name: nombreNormalizado,
      parents: [idCarpeta],
    };

    // Convertimos el archivo a un ArrayBuffer y luego a un flujo de lectura
    //@ts-expect-error revisar despues

    const archivoContent = await archivo.arrayBuffer();
    const flujoArchivo = Readable.from(Buffer.from(archivoContent));

    // Definimos el objeto de media con el tipo MIME y el cuerpo del archivo
    const media = {
      //@ts-expect-error revisar despues

      mimeType: archivo.type,
      body: flujoArchivo,
    };

    // Subimos el archivo a Google Drive
    //@ts-expect-error revisar despues

    const respuestaSubidaArchivo = await drive.files.create({
      requestBody: metadataArchivo,
      media,
      fields: "id",
    });

    // Asignamos permisos públicos de lectura
    //@ts-expect-error revisar despues

    await drive.permissions.create({
      fileId: respuestaSubidaArchivo.data.id,
      requestBody: {
        type: "anyone",
        role: "reader",
      },
    });

    writeLog(
      `[${new Date().toISOString()}] Archivo subido con éxito. ID: ${
        respuestaSubidaArchivo.data.id
      } y permisos de lectura pública asignados.`
    );

    // Retornamos el ID del archivo subido
    return respuestaSubidaArchivo.data.id;
  } catch (error) {
    writeLog(
      //@ts-expect-error revisar despues

      `[${new Date().toISOString()}] Error al subir archivo: ${error.message}`
    );
    throw error;
  }
}
export async function crearArchivo(
  drive: unknown,
  archivo: string, // `archivo` es siempre un string
  nombreNormalizado: string,
  idCarpeta: string
) {
  try {
    writeLog(`[${new Date().toISOString()}] Iniciando subida de archivo.`);

    // Preparación de los metadatos del archivo
    const metadataArchivo = {
      name: nombreNormalizado,
      parents: [idCarpeta],
    };

    // Convertir el string a un Buffer
    const archivoContent = Buffer.from(archivo, "utf8");

    // Convierte el contenido a un flujo de lectura
    const flujoArchivo = Readable.from(archivoContent);

    // Definimos el objeto de media con el tipo MIME
    const media = {
      mimeType: "application/octet-stream", // Tipo MIME genérico para un archivo binario
      body: flujoArchivo,
    };

    // Subimos el archivo a Google Drive
    // @ts-expect-error revisar despues
    const respuestaSubidaArchivo = await drive.files.create({
      requestBody: metadataArchivo,
      media,
      fields: "id",
    });

    // Asignamos permisos públicos de lectura
    // @ts-expect-error revisar despues

    await drive.permissions.create({
      fileId: respuestaSubidaArchivo.data.id,
      requestBody: {
        type: "anyone",
        role: "reader",
      },
    });

    writeLog(
      `[${new Date().toISOString()}] Archivo subido con éxito. ID: ${
        respuestaSubidaArchivo.data.id
      } y permisos de lectura pública asignados.`
    );

    // Retornamos el ID del archivo subido
    return respuestaSubidaArchivo.data.id;
  } catch (error) {
    writeLog(
      // @ts-expect-error revisar despues

      `[${new Date().toISOString()}] Error al subir archivo: ${error.message}`
    );
    throw error;
  }
}
export async function manejarError(funcion: string, error: unknown) {
  writeLog(
    //@ts-expect-error revisar despues

    `[${new Date().toISOString()}] Error en ${funcion}: ${error.message}.`
  );
  //@ts-expect-error revisar despues

  throw new Error(`Error en ${funcion}: ${error.message}`);
}

export async function writeLog(message: string) {
  fs.appendFileSync("log.txt", message + "\n", "utf8");
}
