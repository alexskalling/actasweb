"use server";
import { google } from "googleapis";
import { Readable } from "stream";
import fs from "fs";
import { AssemblyAI } from "assemblyai";
import OpenAI from "openai/index.mjs";
//@ts-expect-error revisar despues
import { DOMParser } from "xmldom"; // Importar DOMParser desde xmldom

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

interface UploadResult {
  success: boolean;
  message?: string;
  publicUrl?: string | null;
  error?: string;
}

export async function uploadFile(formData: FormData): Promise<UploadResult> {
  const archivo = formData.get("audioFile") as File;
  const nombreCarpeta = formData.get("nombreCarpeta") as string;
  const nombreArchivo = formData.get("nombreNormalizado") as string;

  const urlNextcloud = process.env.NEXTCLOUD_URL;
  const usuario = process.env.NEXTCLOUD_USER;
  const contrasena = process.env.NEXTCLOUD_PASSWORD;

  if (!usuario || !contrasena || !urlNextcloud) {
    console.error("Error: Credenciales de Nextcloud no configuradas.");
    return {
      success: false,
      error: "Credenciales de Nextcloud no configuradas.",
    };
  }

  const rutaBaseActas = `${urlNextcloud}/remote.php/dav/files/${usuario}/Actas`;
  const rutaCompletaCarpeta = `${rutaBaseActas}/${nombreCarpeta}`;
  const rutaCompletaArchivo = `${rutaCompletaCarpeta}/${nombreArchivo}`;
  const rutaArchivoCompartir = `/Actas/${nombreCarpeta}/${nombreArchivo}`;
  const cabecerasAutenticacion = {
    Authorization: "Basic " + btoa(usuario + ":" + contrasena),
    "Content-Type": archivo.type || "audio/mpeg",
    "OCS-APIRequest": "true",
  };

  socketBackendReal.emit("upload-status", {
    roomName: nombreCarpeta,
    statusData: { message: `[Inicio] Subiendo ${nombreArchivo}` },
  });

  try {
    await verifyOrCreateFolder(
      rutaCompletaCarpeta,
      //@ts-expect-error revisar despues

      cabecerasAutenticacion,
      nombreCarpeta
    );
    const publicUrlExistente = await verifyExistingFileAndGetPublicUrl(
      rutaArchivoCompartir,
      rutaCompletaArchivo,
      urlNextcloud,
      //@ts-expect-error revisar despues

      cabecerasAutenticacion,
      nombreCarpeta
    );

    if (publicUrlExistente) {
      return {
        success: true,
        message: "Archivo existente y compartido previamente.",
        publicUrl: publicUrlExistente,
      };
    }

    await uploadFileToNextcloud(
      rutaCompletaArchivo,
      //@ts-expect-error revisar despues
      cabecerasAutenticacion,
      archivo,
      nombreCarpeta
    );
    const publicUrlNextcloud = await shareFilePublicly(
      rutaArchivoCompartir,
      urlNextcloud,
      //@ts-expect-error revisar despues

      cabecerasAutenticacion,
      nombreCarpeta,
      nombreArchivo
    );

    return {
      success: true,
      message: "Archivo subido y compartido públicamente en Nextcloud.",
      publicUrl: publicUrlNextcloud,
    };
  } catch (error) {
    console.error("[uploadFile] Error general:", error);
    socketBackendReal.emit("upload-status", {
      roomName: nombreCarpeta,
      statusData: {
        message: `Error al procesar archivo: ${error || error}`,
      },
    });
    return {
      success: false,
      error: "Error al guardar y compartir el archivo.",
    };
  }
}

async function verifyOrCreateFolder(
  rutaCompletaCarpeta: string,
  cabecerasAutenticacion: string,
  nombreCarpeta: string
): Promise<void> {
  socketBackendReal.emit("upload-status", {
    roomName: nombreCarpeta,
    statusData: { message: `[Carga] Validando carpeta de destino` },
  });

  try {
    const respuestaVerificacionCarpeta = await fetch(rutaCompletaCarpeta, {
      method: "PROPFIND",
      //@ts-expect-error revisar despues
      headers: cabecerasAutenticacion,
    });

    if (
      !respuestaVerificacionCarpeta.ok &&
      respuestaVerificacionCarpeta.status === 404
    ) {
      socketBackendReal.emit("upload-status", {
        roomName: nombreCarpeta,
        statusData: { message: `[Carga] Creando carpeta` },
      });
      const respuestaCreacion = await fetch(rutaCompletaCarpeta, {
        method: "MKCOL",
        //@ts-expect-error revisar despues

        headers: cabecerasAutenticacion,
      });

      if (!respuestaCreacion.ok) {
        throw new Error(
          `Error al crear carpeta: ${respuestaCreacion.status} ${respuestaCreacion.statusText}`
        );
      }
    } else if (!respuestaVerificacionCarpeta.ok) {
      throw new Error(
        `Error al verificar carpeta: ${respuestaVerificacionCarpeta.status} ${respuestaVerificacionCarpeta.statusText}`
      );
    }
  } catch (error) {
    console.error(
      `[verifyOrCreateFolder] Error en verificación/creación de carpeta '${nombreCarpeta}':`,
      error
    );
    socketBackendReal.emit("upload-status", {
      roomName: nombreCarpeta,
      statusData: { message: `[Carga] Error con carpeta de destino` },
    });
    throw error; // Relanzar el error para que sea manejado por la función principal
  }
}

async function verifyExistingFileAndGetPublicUrl(
  rutaArchivoCompartir: string,
  rutaCompletaArchivo: string,
  urlNextcloud: string,
  cabecerasAutenticacion: string,
  nombreCarpeta: string
): Promise<string | null> {
  socketBackendReal.emit("upload-status", {
    roomName: nombreCarpeta,
    statusData: { message: `[Carga] Validando archivo de carga` },
  });

  try {
    const respuestaVerificacionArchivo = await fetch(rutaCompletaArchivo, {
      method: "PROPFIND",
      //@ts-expect-error revisar despues

      headers: cabecerasAutenticacion,
    });

    if (respuestaVerificacionArchivo.ok) {
      socketBackendReal.emit("upload-status", {
        roomName: nombreCarpeta,
        statusData: {
          message: `[Carga] Archivo encontrado`,
        },
      });
      const publicUrlExistente = await getPublicUrlIfExists(
        rutaArchivoCompartir,
        urlNextcloud,
        cabecerasAutenticacion
      );
      if (publicUrlExistente) {
        return publicUrlExistente;
      } else {
        return null; // Archivo existe pero sin enlace público existente
      }
    } else if (respuestaVerificacionArchivo.status !== 404) {
      throw new Error(
        `Error al verificar archivo: ${respuestaVerificacionArchivo.status} ${respuestaVerificacionArchivo.statusText}`
      );
    }
    return null; // Archivo no existe
  } catch (error) {
    socketBackendReal.emit("upload-status", {
      roomName: nombreCarpeta,
      statusData: { message: `[Carga] Error al validar archivo de carga` },
    });
    throw error; // Relanzar el error
  }
}

async function uploadFileToNextcloud(
  rutaCompletaArchivo: string,
  cabecerasAutenticacion: string,
  archivo: File,
  nombreCarpeta: string
): Promise<void> {
  const stream = archivo.stream();
  socketBackendReal.emit("upload-status", {
    roomName: nombreCarpeta,
    statusData: { message: `[Carga] Enviando archivo` },
  });

  try {
    const respuestaSubida = await fetch(rutaCompletaArchivo, {
      method: "PUT",
      //@ts-expect-error revisar despues
      headers: cabecerasAutenticacion,
      body: stream,
      duplex: "half",
    });

    if (!respuestaSubida.ok) {
      throw new Error(
        `Error al subir archivo: ${respuestaSubida.status} ${respuestaSubida.statusText}`
      );
    }
    socketBackendReal.emit("upload-status", {
      roomName: nombreCarpeta,
      statusData: { message: `[Carga] Archivo guardado` },
    });
  } catch (error) {
    socketBackendReal.emit("upload-status", {
      roomName: nombreCarpeta,
      statusData: { message: `[Carga] Error al transferir archivo` },
    });
    throw error; // Relanzar el error
  }
}

async function shareFilePublicly(
  rutaArchivoCompartir: string,
  urlNextcloud: string,
  cabecerasAutenticacion: string,
  nombreCarpeta: string,
  nombreArchivo: string
): Promise<string> {
  socketBackendReal.emit("upload-status", {
    roomName: nombreCarpeta,
    statusData: { message: `[Carga] Disponibilizando enlace` },
  });

  try {
    const shareResponse = await fetch(
      `${urlNextcloud}/ocs/v2.php/apps/files_sharing/api/v1/shares`,
      {
        method: "POST",
        headers: {
          //@ts-expect-error revisar despues

          ...cabecerasAutenticacion,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          path: rutaArchivoCompartir,
          shareType: "3", // 3: Share Type Public Link
          permissions: "1", // 1: Read only permissions
        }),
      }
    );

    if (!shareResponse.ok) {
      const errorText = await shareResponse.text(); // Obtener texto de error para logs
      console.error(
        `[shareFilePublicly] Error al compartir archivo '${nombreArchivo}':`,
        shareResponse.status,
        shareResponse.statusText,
        errorText
      );
      socketBackendReal.emit("upload-status", {
        roomName: nombreCarpeta,
        statusData: { message: `[Carga] Error al disponibilizar enlace` },
      });
      throw new Error(
        `Error al compartir archivo: ${shareResponse.status} ${shareResponse.statusText} - ${errorText}`
      );
    }

    const responseText = await shareResponse.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(responseText, "text/xml");
    const urlElement = xmlDoc.getElementsByTagName("url")[0];

    if (!urlElement || !urlElement.textContent) {
      console.error(
        "[shareFilePublicly] Elemento <url> no encontrado en la respuesta XML:",
        xmlDoc
      );
      socketBackendReal.emit("upload-status", {
        roomName: nombreCarpeta,
        statusData: { message: `[Carga] Error al procesar enlace` },
      });
      throw new Error("URL pública no encontrada en respuesta del servidor.");
    }

    const publicUrlNextcloud = urlElement.textContent;

    socketBackendReal.emit("upload-status", {
      roomName: nombreCarpeta,
      statusData: {
        message: `[Carga] Proceso listo, puedes proceder con el pago`,
      },
    });
    return publicUrlNextcloud;
  } catch (error) {
    console.error(
      "[shareFilePublicly] Error al procesar el compartir o obtener URL pública:",
      error
    );
    socketBackendReal.emit("upload-status", {
      roomName: nombreCarpeta,
      statusData: { message: `[Carga] Error al disponibilizar enlace` },
    });
    throw error; // Relanzar el error
  }
}

async function getPublicUrlIfExists(
  //@ts-expect-error revisar despues

  rutaArchivoCompartir,
  //@ts-expect-error revisar despues

  urlNextcloud,
  //@ts-expect-error revisar despues

  cabecerasAutenticacion
) {
  try {
    const sharesResponse = await fetch(
      `${urlNextcloud}/ocs/v2.php/apps/files_sharing/api/v1/shares?path=${encodeURIComponent(
        rutaArchivoCompartir
      )}`,
      {
        method: "GET",
        headers: cabecerasAutenticacion,
      }
    );

    if (!sharesResponse.ok) {
      console.error(
        "Error al verificar shares existentes en Nextcloud:",
        sharesResponse.status,
        sharesResponse.statusText
      );
      return null; // No se pudo verificar shares, se asume que no hay o error.
    }

    const responseText = await sharesResponse.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(responseText, "text/xml");
    const urlElements = xmlDoc.getElementsByTagName("url");
    if (urlElements.length > 0) {
      const publicUrl = urlElements[0].textContent;

      return publicUrl;
    } else {
      return null; // No se encontró enlace público existente
    }
  } catch (error) {
    console.error(
      "[VERIFICAR SHARE] Error al verificar enlace público existente:",
      error
    );
    return null; // Error al buscar, se asume que no hay o hubo un problema.
  }
}

export async function obtenerClienteTranscripcion() {
  return new AssemblyAI({
    //@ts-expect-error revisar despues

    apiKey: process.env.NEXT_PUBLIC_ASSEMBLY_API_KEY,
  });
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

export async function verificarArchivoExistenteant(
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
export async function verificarArchivoExistente(
  nombreArchivo: string,
  nombreCarpeta: string
): Promise<boolean> {
  writeLog(
    `[${new Date().toISOString()}] Verificando existencia del archivo ${nombreArchivo} en Nextcloud carpeta ${nombreCarpeta}.`
  );

  const urlNextcloud = process.env.NEXTCLOUD_URL;
  const usuario = process.env.NEXTCLOUD_USER;
  const contrasena = process.env.NEXTCLOUD_PASSWORD;

  if (!usuario || !contrasena || !urlNextcloud) {
    console.error(
      "Credenciales de Nextcloud no configuradas en variables de entorno para verificarArchivoExistenteNextcloud."
    );
    return false; // No se puede verificar sin credenciales
  }

  const rutaBaseActas = `${urlNextcloud}/remote.php/dav/files/${usuario}/Actas`;
  const rutaCompletaCarpeta = `${rutaBaseActas}/${nombreCarpeta}`;
  const rutaCompletaArchivo = `${rutaCompletaCarpeta}/${nombreArchivo}`;

  const cabecerasAutenticacion = {
    Authorization: "Basic " + btoa(usuario + ":" + contrasena),
  };

  try {
    writeLog(`[VERIFICAR ARCHIVO NEXTCLOUD] Ruta: ${rutaCompletaArchivo}`);
    const respuestaVerificacionArchivo = await fetch(rutaCompletaArchivo, {
      method: "PROPFIND",
      headers: cabecerasAutenticacion,
    });
    writeLog(
      `[VERIFICAR ARCHIVO NEXTCLOUD] Respuesta status: ${respuestaVerificacionArchivo.status}, ok: ${respuestaVerificacionArchivo.ok}`
    );

    if (respuestaVerificacionArchivo.ok) {
      writeLog(
        `[${new Date().toISOString()}] Archivo "${nombreArchivo}" EXISTE en Nextcloud en la carpeta "${nombreCarpeta}".`
      );
      return true; // Archivo existe
    } else if (respuestaVerificacionArchivo.status === 404) {
      writeLog(
        `[${new Date().toISOString()}] Archivo "${nombreArchivo}" NO encontrado en Nextcloud en la carpeta "${nombreCarpeta}".`
      );
      return false; // Archivo no encontrado
    } else {
      writeLog(
        `[${new Date().toISOString()}] Error al verificar el archivo "${nombreArchivo}" en Nextcloud (Status ${
          respuestaVerificacionArchivo.status
        }).`
      );
      return false; // Error al verificar (o no existe)
    }
  } catch (error) {
    manejarError("verificarArchivoExistenteNextcloud", error);
    return false; // Error durante la verificación
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
export async function guardarArchivo(
  nombreCarpeta: string,
  nombreArchivo: string,
  transcripcion: string
) {
  //actasfiles.157.180.22.72.sslip.io/public.php/dav/files/AiKFjGBGNT8nXpn/
  http: console.log(`Guardando transcripción como ${nombreArchivo}.txt`);
  const urlNextcloud = process.env.NEXTCLOUD_URL;
  const usuario = process.env.NEXTCLOUD_USER;
  const contrasena = process.env.NEXTCLOUD_PASSWORD;

  if (!usuario || !contrasena || !urlNextcloud) {
    console.error(
      "Credenciales de Nextcloud no configuradas en variables de entorno."
    );
    return { success: false, error: "Credenciales no configuradas" };
  }

  const rutaBase = `${urlNextcloud}/remote.php/dav/files/${usuario}/Actas`;
  const rutaCompletaCarpeta = `${rutaBase}/${nombreCarpeta}`;
  const rutaCompletaArchivo = `${rutaCompletaCarpeta}/${nombreArchivo}`;
  const cabecerasAutenticacion = {
    Authorization: "Basic " + btoa(usuario + ":" + contrasena),
  };

  try {
    // 1. Verificar si la carpeta existe
    const respuestaVerificacion = await fetch(rutaCompletaCarpeta, {
      method: "PROPFIND", // Usamos PROPFIND para verificar la existencia
      headers: cabecerasAutenticacion,
    });

    if (!respuestaVerificacion.ok) {
      if (respuestaVerificacion.status === 404) {
        // 2. Si la carpeta no existe, crearla
        const respuestaCreacion = await fetch(rutaCompletaCarpeta, {
          method: "MKCOL", // Usamos MKCOL para crear la carpeta
          headers: cabecerasAutenticacion,
        });

        if (!respuestaCreacion.ok) {
          console.error(
            `Error al crear la carpeta ${nombreCarpeta}:`,
            respuestaCreacion.status,
            respuestaCreacion.statusText
          );
          return {
            success: false,
            error: `Error al crear la carpeta: ${respuestaCreacion.status} ${respuestaCreacion.statusText}`,
          };
        } else {
          console.log(`Carpeta ${nombreCarpeta} creada con éxito.`);
        }
      } else {
        console.error(
          `Error al verificar la carpeta ${nombreCarpeta}:`,
          respuestaVerificacion.status,
          respuestaVerificacion.statusText
        );
        return {
          success: false,
          error: `Error al verificar la carpeta: ${respuestaVerificacion.status} ${respuestaVerificacion.statusText}`,
        };
      }
    }

    // 3. Subir el archivo
    const respuestaSubida = await fetch(rutaCompletaArchivo, {
      method: "PUT",
      headers: cabecerasAutenticacion,
      body: transcripcion,
    });

    if (!respuestaSubida.ok) {
      console.error(
        `Error al guardar ${nombreArchivo}.txt:`,
        respuestaSubida.status,
        respuestaSubida.statusText
      );
      return {
        success: false,
        error: `Error al guardar el archivo: ${respuestaSubida.status} ${respuestaSubida.statusText}`,
      };
    }

    // --- MODIFICACIÓN: Probar endpoint de versión de la API OCS ---
    const ocsVersionResponse = await fetch(
      `${urlNextcloud}/ocs/v2.php/core/ хто/version`,
      {
        method: "GET",
        headers: {
          ...cabecerasAutenticacion,
          "OCS-APIRequest": "true",
        },
      }
    );

    if (!ocsVersionResponse.ok) {
      console.error(
        "Error al acceder al endpoint de versión de la API OCS:",
        ocsVersionResponse
      );
      return {
        success: false,
        error: "Error al acceder a la API OCS (endpoint de versión).",
      };
    }

    const ocsVersionData = await ocsVersionResponse.text(); // o .json() si esperas JSON
    console.log("Respuesta API OCS endpoint de versión:", ocsVersionData);

    return { success: true, publicUrl: "URL_DE_PRUEBA_OCS_VERSION" }; //  URL de prueba para evitar error por falta de publicUrl en return
  } catch (error) {
    console.error("Error de red:", error);
    return { success: false, error: "Error de red" };
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

export async function obtenerContenidoArchivo(
  folder: string,
  nombreArchivo: string
): Promise<string | null> {
  const urlNextcloud = process.env.NEXTCLOUD_URL;
  const usuario = process.env.NEXTCLOUD_USER;
  const contrasena = process.env.NEXTCLOUD_PASSWORD;
  let contenidoArchivo = null;

  if (usuario && contrasena && urlNextcloud) {
    const rutaBaseActas = `${urlNextcloud}/remote.php/dav/files/${usuario}/Actas`;
    const rutaCompletaCarpeta = `${rutaBaseActas}/${folder}`;
    const rutaCompletaArchivo = `${rutaCompletaCarpeta}/${nombreArchivo}`;
    const cabecerasAutenticacion = {
      Authorization: "Basic " + btoa(usuario + ":" + contrasena),
    };

    try {
      console.log(
        `[OBTENER CONTENIDO ARCHIVO NEXTCLOUD] Ruta: ${rutaCompletaArchivo}`
      );
      const respuestaContenidoArchivo = await fetch(rutaCompletaArchivo, {
        method: "GET",
        headers: cabecerasAutenticacion,
      });
      console.log(
        `[OBTENER CONTENIDO ARCHIVO NEXTCLOUD] Respuesta status: ${respuestaContenidoArchivo.status}, ok: ${respuestaContenidoArchivo.ok}`
      );

      if (respuestaContenidoArchivo.ok) {
        contenidoArchivo = await respuestaContenidoArchivo.text();
        writeLog(
          `[${new Date().toISOString()}] Contenido del archivo "${nombreArchivo}" obtenido de Nextcloud.`
        );
      } else {
        console.error(
          `Error al obtener contenido del archivo ${nombreArchivo} de Nextcloud: Status ${respuestaContenidoArchivo.status}, ${respuestaContenidoArchivo.statusText}`
        );
        return null;
      }
    } catch (error) {
      manejarError("obtenerContenidoArchivoNextcloud", error);
      return null;
    }
  } else {
    console.error(
      "Credenciales de Nextcloud no configuradas para obtener contenido de archivo."
    );
    return null;
  }

  return contenidoArchivo;
}

export async function obtenerFileIdArchivo(
  nombreArchivo: string,
  folder: string
): Promise<string | null> {
  try {
    const rutaCompleta = `${folder}/${nombreArchivo}`; // Ruta completa al archivo en Nextcloud
    //@ts-expect-error revisar despues

    const cliente = fileSystem({
      // Inicializa tu cliente WebDAV (adapta esto a tu configuración)
      baseUrl: process.env.NEXTCLOUD_URL,
      auth: {
        user: process.env.NEXTCLOUD_USER,
        password: process.env.NEXTCLOUD_PASSWORD,
      },
    });

    // **Petición WebDAV PROPFIND para obtener el fileId**
    const propiedadesResponse = await cliente.propFind(
      rutaCompleta,
      [
        {
          name: "fileid", // Nombre de la propiedad 'fileid' que queremos obtener (namespace 'oc')
          namespace: "oc", // Namespace 'oc' para propiedades de Nextcloud
        },
      ],
      0 // Profundidad 0: solo obtener propiedades del archivo base, no de subcarpetas
    );

    // Procesar la respuesta PROPFIND
    if (propiedadesResponse.status === 207 && propiedadesResponse.props) {
      // 207 Multi-Status para PROPFIND exitoso
      // 'propiedadesResponse.props' debería contener las propiedades solicitadas
      const fileIdProp = propiedadesResponse.props.find(
        //@ts-expect-error revisar despues

        (prop) => prop.name === "fileid" && prop.namespace === "oc"
      );

      if (fileIdProp && fileIdProp.value) {
        return fileIdProp.value as string; // Retorna el valor de fileId como string
      } else {
        writeLog(
          `Archivo "${nombreArchivo}" encontrado, pero la respuesta PROPFIND no contenía 'oc:fileid'.`
        );
        return null; // fileId no encontrado en la respuesta
      }
    } else {
      writeLog(
        `Error en petición PROPFIND para "${nombreArchivo}". Status: ${propiedadesResponse.status}`
      );
      return null; // Error en la petición PROPFIND
    }
  } catch (error) {
    if (error) {
      writeLog(
        `Archivo "${nombreArchivo}" no encontrado en Nextcloud en la carpeta "${folder}".`
      );
      return null; // Archivo no encontrado (404 Not Found)
    } else {
      manejarError("obtenerFileIdArchivo", error); // Manejar otros errores
      return null; // Error al buscar el archivo o al procesar la petición PROPFIND
    }
  }
}
