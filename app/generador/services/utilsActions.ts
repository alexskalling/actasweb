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
    private_key_id: "d3f1665a74897165a117093779b6e3187d025e88",
    private_key:
      "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCmmOkLFhbSY+FA\nXE/Jt00HuNSv47RpmXKpOlqmPx4L7kPvPt2vUiHr3rNMhPtiICuMBW126+z7jS4u\nv1WqtSMthx63HylcSWxF/UDUdw+2E9tuysu5r4nadqgcw3qHjK/BtgIFNNYShYva\nAHq9lcMrngt3I0nHdTL3a/abpKfP9B3SlC5AYmLjWZykQ4garWi0z6exefmafvOP\npCZMBu4bhamWbK3sQ3pl118ooCzeoCf9O0RDU7o+bJI4gkVvly9mNA4mBVoESPdS\nncwOYVlcQ8QPyKatEk6CJfvHNNRpuEM/QhejLDsRn3Y9U3ZJxMv6dtsIZjmBbUd8\ntxe0Ji71AgMBAAECggEAIHDYun+t6ICqEYAYSmGfBqCri+elj0Wh8gmqssJKLc0T\nHgCqJvRxpg5a8EzZ7cDxceXxq61j25Uhl9lKy3/Tzo8IAGU5Rt8GTjezWtwna0+B\nFJk5ZBpmV+vwrw8yqjgPVoOEb7Ka+AbY1ZXv0MCbvX/cYDH3MTeledAkeKjuw5vH\nC0u8/E0+3LqGYkC+T9YqF9P4SX46QSa/tFziETQmxUGynSMu3LMqR6mQvFXpmChA\nAQpDw2XT8l9kEa7/gugy/8m9v+yHh06gejSx0NdjGyVNhc336VtNNcOUju6eJ2b0\niPI93/u6x1fpgQW1PxJUUUWZbGgEZdSZzs0myRQesQKBgQDnVM5nx8sU6+K3VOt+\ny8Rgw/VYY92IrvNalNWj/EJkRLFy6Hxr9ThQQ6P1YU1a7+AoWxe/O8dz83H7cc6g\n3fAV3GA+XTHBE1mC8sZAMMHQmHCmEcLaSHYcEwhxruKIOZzt+a3N7aEywyRoDwlW\nTc9XkQTQCMhR2PDdDvx+Iw9lZQKBgQC4XOig+SP7Th7ir8EjnsoZmUeiWNlxhPGR\n924JgkTuwKiJIQ57plT15BQKnwkAODPd2Ln7s2tzGQcgqq/JlNpj0MtuTMPmxuqs\ns3frj5sh06D0Mfpj1s1XsGZQwifMhBh3PYJ1Tg/QYgua+55vvznOY4T5wwq/xFlr\nG4yUoy4SUQKBgDuamEwZKHRNiu7dzIexDPo5w19w68Wp/j3al2lXN+wJ3wbSbCyM\n1GOp6fbxiTLjF4iOYAH/7xYrJbU5z5mXVaLsU0f+TzGGQMwCrZ4gce/DN1MyxFfl\nz7jQFp7kBq4+2fZfHK8wiRZBPYIqTaeVCNVxIiJQAP1FvlnW4KvHcNIZAoGAWiKK\nVVEZJ189OGTnD2wtsLBA1n2L6bUuicenk5yN6RBmFY0E0K00cndM2RiBxQq1SOwR\nmZ5RlRcSZgUtJmfREeXd35JGYMi1qTOhGJjAJpyZ32mj2jYFdK64hxk1bgbTE1EO\nPB2rG50jwWTtRAMA1wfO1nFmCvWLJhN0+qKA/tECgYAkf/+XWEBOf1bSGoU+qQMH\nEVLWJVui/Bu0KBHPbVnvth82hpdagYO035pg3MzewGd3EKN2zTgC2IyNj3tHG9n3\nA94Ytr1Nnlrz/ePw4tsl7X1kqn18aw4yddoz2Q+LF0qvaBCV//08CzPv/MxBDpDP\nc4izuBX1wNVXgas5LNWw+Q==\n-----END PRIVATE KEY-----\n",
    client_email: "actasweb@actas-442811.iam.gserviceaccount.com",
    client_id: "113429413505474543142",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/actasweb%40actas-442811.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
  };

  // Configuración de la autenticación con GoogleAuth
  const auth = new google.auth.GoogleAuth({
    credentials, // Se pasa directamente el objeto credentials
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  try {
    // Retorna la instancia autenticada de Google Drive
    const drive = google.drive({ version: "v3", auth });
    console.log("Autenticación exitosa");
    return drive;
  } catch (error) {
    console.error("Error al autenticar con Google Drive:", error);
    throw error;
  }
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
