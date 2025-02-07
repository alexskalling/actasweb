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
  console.log(`[${new Date().toISOString()}] Autenticando en Google Drive.`);

  const credentials = {
    type: "service_account",
    project_id: "actas-442811",
    private_key_id: "6a6aef9eee79ba60b248691d33f2fbd324e36256",
    private_key:
      "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+8A1/vjlvYvS3\nfAPGdh+Wpd/YGAPsInFwf2V0WEROUTz2SVNs0sZ94RE+eamW/D1puGl7ZeMFz4tg\njF1HdwZvlwcsb5WWZqLp2pS17gRRrU8MSCO6ZvYec078FSUX1+ubKH/eC2Bu6NgL\nhnfpVoVEGyQJeqlHQdP0iNJL9uLhkM30dlM293TJFuhfDZU5T7mqLqgNbHGD9amF\nwV4G9Y2yG2NAz7Aldt2p+TAc3+3ARYp6fAVMmhJi8jjY7rslX3rXbHP3UCgyUc2M\njJ/BDCnKkv7HxA/DOriaQxDllUsKkSRuqnCuGPbBxUfmQyS0OO/PoPGiR7si3rVX\nYLUeiohtAgMBAAECggEAXOS0ZJRbJB5sOcKLoagBeU0NKPiSG/Wr5BQO+3ogDUxH\n0PjeriCjskVoGtGdGRhyFnfCVec9equ9PwU7MpQtXOgI9Oz6xXf8xbJyzEpW7pfX\nT/3e6AbEsg7efBUbfUyu00dyYkh9q6f7yCutNihCYN6lezkil0jnAl74lT2xpxRw\ntpQ3npA3ekglyYRGr/wGvw1C5UuSvuisEZF7fuJZfjHTk3Vanj+rRLTUY107pwvD\nWyv84MbMoPBOvF5laQJeWVe4m1dYnLq5b6WoCFeQSHac6aVs6UORw/c1z1HpvDYf\nbHta1KY8RbDEKtnxfzwV+tHmap9438sQkSojDlEaDwKBgQDxJgpOmc1NJ3geq9e4\nqkJXfSwdtcTt8LMD+UnZeR7dgtLzUgTyzT1GofLJX+Ct0dUk7ht9IEbnauIJWYO2\nXfenX+YujR7xhlGoFCg0dq7HXFUpMSP8m714Pg8z7hLcuO0hVq8IdB03Moaoy9/J\nUyBiK7yzbvmQD/IzxR16DfCMqwKBgQDKsmKjeiGr/0HaFft+RbvjM23VAu7MhtUG\n9l5i9j2d4NZW2RQA4jJX+xPWSY83nHOpRv7zid58yljDGNjFx8GxCG1MI3o1m4CY\nv1Thr5LEpybbPBRsHBzDTfSSj+G13DGjYBeUDHNVIMP635U+AgIO8ZOxwNhY1kPx\nXnhVJsCPRwKBgBEx1jBOlS34L394X1Rih4J3gWrI6DbTH+CbqOFh2oqO5n3FDmdF\nrSXZLFehh4K9YIZWmA0u/P9JRr7F7DdXse30T5RoKZmtKyth7I/5GnNKqSPbxiYf\n8L2fJzRbuGqWoQnshWSD6wVhi+qDRvyy+a8mUTk2I4NbL7jzSCvIzKsrAoGBAJH2\nHPOtqfuqR2hdNgn6+06jpS6j+wQK//IQjW1j9oDu/Enz7eSo/im+4s0HkXsxTVST\njFohaLaiG4L6LHdX3lG2SMZwMbvSq6rS9LPD88Nqvp9WxzoGkGvPghPcSmPkGVaV\nhsUUpiSiAJ5yTI0ncwYBziJNRT3LpYd1SN/AlR9XAoGAeCtjUo5CnB+C5t3m59Wd\nt0WgJcS6CmtReXLSaK2yjtRPckKjzLjGRZC+Lx6r8q1e2SuOtzzWGf5D/7w4owfn\nRXYciTVtNs8mD3BRJL74XYoA10POa6mwHkiFhzJU4bqRAailXaFG1WovlmAH8xOY\ntaVh6yEdv3F7NaxlK0e1R2U=\n-----END PRIVATE KEY-----\n",
    client_email: "actasnextjs@actas-442811.iam.gserviceaccount.com",
    client_id: "102261341883094311574",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/actasnextjs%40actas-442811.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
  };

  // Configuración de la autenticación con GoogleAuth
  const auth = new google.auth.GoogleAuth({
    credentials, // Se pasa directamente el objeto credentials
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
