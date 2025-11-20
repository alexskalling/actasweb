"use server";
import { google } from "googleapis";
import { Readable } from "stream";
import fs from "fs";
import { AssemblyAI } from "assemblyai";
import OpenAI from "openai/index.mjs";

export async function obtenerClienteTranscripcion() {
  const apiKey = process.env.NEXT_PUBLIC_ASSEMBLY_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_ASSEMBLY_API_KEY no está configurada");
  }
  return new AssemblyAI({
    apiKey: apiKey as string,
  });
}
export async function obtenerOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está configurada");
  }
  return new OpenAI({ apiKey: apiKey as string });
}

export async function obtenerContenidoArchivoDrive(drive: any, fileId: string) {
  try {
    const archivoStream = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      { responseType: "stream" },
    );

    const contenido = await new Promise<string>((resolve, reject) => {
      let contenidoTotal = "";
      archivoStream.data

        .on("data", (chunk: Buffer) => {
          contenidoTotal += chunk.toString();
        })
        .on("end", () => {
          resolve(contenidoTotal);
        })

        .on("error", (error: Error) => {
          reject(error);
        });
    });

    return contenido;
  } catch (error) {
    console.error("Error al obtener el contenido del archivo:", error);
    throw error;
  }
}

export async function normalizarNombreArchivo(nombreArchivo: string) {
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

  return name;
}

export async function autenticarGoogleDrive() {
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

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  try {
    const drive = google.drive({ version: "v3", auth });
    return drive;
  } catch (error) {
    console.error("Error al autenticar con Google Drive:", error);
    throw error;
  }
}

export async function obtenerOCrearCarpeta(
  drive: any,
  nombreNormalizado: string,
) {
  writeLog(`[${new Date().toISOString()}] Verificando o creando carpeta.`);
  const nombreCarpeta = nombreNormalizado.replace(/\.[^/.]+$/, "");

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

    const respuestaCarpetaNueva = await drive.files.create({
      requestBody: carpetaNueva,
      fields: "id",
    });
    idCarpeta = respuestaCarpetaNueva.data.id;
    writeLog(`Carpeta creada con ID: ${idCarpeta}`);
  } else {
    writeLog(`Carpeta ya existe con ID: ${idCarpeta}`);
  }
  return idCarpeta;
}

export async function verificarArchivoExistenteant(
  drive: any,
  nombreNormalizado: string,
  idCarpeta: string,
) {
  writeLog(`[${new Date().toISOString()}] Verificando existencia del archivo.`);

  const respuestaArchivoExistente = await drive.files.list({
    q: `name='${nombreNormalizado}' and '${idCarpeta}' in parents`,
    fields: "files(id, webViewLink)",
  });
  if (respuestaArchivoExistente.data?.files?.length > 0) {
    const urlArchivoExistente = respuestaArchivoExistente.data.files[0].id;
    writeLog(`Archivo encontrado con ID: ${urlArchivoExistente}`);
    return urlArchivoExistente;
  }
  writeLog(`[${new Date().toISOString()}] Archivo no encontrado.`);
  return null;
}
export async function verificarArchivoExistente(
  nombreArchivo: string,
  nombreCarpeta: string,
): Promise<boolean> {
  writeLog(`Verificando archivo: ${nombreArchivo} en carpeta: ${nombreCarpeta}`);

  const urlNextcloud = process.env.NEXTCLOUD_URL;
  const usuario = process.env.NEXTCLOUD_USER;
  const contrasena = process.env.NEXTCLOUD_PASSWORD;

  if (!usuario || !contrasena || !urlNextcloud) {
    console.error(
      "Credenciales de Nextcloud no configuradas en variables de entorno para verificarArchivoExistenteNextcloud.",
    );
    return false;
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
    writeLog(`Verificación de archivo completada. Status: ${respuestaVerificacionArchivo.status}`);

    if (respuestaVerificacionArchivo.ok) {
      writeLog(`Archivo verificado exitosamente: ${rutaCompletaArchivo}`);
      return true;
    } else if (respuestaVerificacionArchivo.status === 404) {
      return false;
    } else {
      writeLog(
        `[${new Date().toISOString()}] Error al verificar el archivo "${nombreArchivo}" en Nextcloud (Status ${
          respuestaVerificacionArchivo.status
        }).`,
      );
      return false;
    }
  } catch (error) {
    manejarError("verificarArchivoExistenteNextcloud", error);
    return false;
  }
}

export async function crearArchivo(
  drive: any,
  archivo: string,
  nombreNormalizado: string,
  idCarpeta: string,
) {
  try {
    writeLog(`[${new Date().toISOString()}] Iniciando subida de archivo.`);

    const metadataArchivo = {
      name: nombreNormalizado,
      parents: [idCarpeta],
    };

    const archivoContent = Buffer.from(archivo, "utf8");

    const flujoArchivo = Readable.from(archivoContent);

    const media = {
      mimeType: "application/octet-stream",
      body: flujoArchivo,
    };

    const respuestaSubidaArchivo = await drive.files.create({
      requestBody: metadataArchivo,
      media,
      fields: "id",
    });

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
      } y permisos de lectura pública asignados.`,
    );

    return respuestaSubidaArchivo.data.id;
  } catch (error) {
    throw error;
  }
}
export async function guardarArchivo(
  nombreCarpeta: string,
  nombreArchivo: string,
  transcripcion: string,
) {
  const urlNextcloud = process.env.NEXTCLOUD_URL;
  const usuario = process.env.NEXTCLOUD_USER;
  const contrasena = process.env.NEXTCLOUD_PASSWORD;

  if (!usuario || !contrasena || !urlNextcloud) {
    console.error(
      "Credenciales de Nextcloud no configuradas en variables de entorno.",
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
    const respuestaVerificacion = await fetch(rutaCompletaCarpeta, {
      method: "PROPFIND",
      headers: cabecerasAutenticacion,
    });

    if (!respuestaVerificacion.ok) {
      if (respuestaVerificacion.status === 404) {
        const respuestaCreacion = await fetch(rutaCompletaCarpeta, {
          method: "MKCOL",
          headers: cabecerasAutenticacion,
        });

        if (!respuestaCreacion.ok) {
          console.error(
            respuestaCreacion.status,
            respuestaCreacion.statusText,
          );
          return {
            success: false,
            error: `Error al crear la carpeta: ${respuestaCreacion.status} ${respuestaCreacion.statusText}`,
          };
        }
      } else {
        console.error(
          respuestaVerificacion.status,
          respuestaVerificacion.statusText,
        );
        return {
          success: false,
          error: `Error al verificar la carpeta: ${respuestaVerificacion.status} ${respuestaVerificacion.statusText}`,
        };
      }
    }

    const respuestaSubida = await fetch(rutaCompletaArchivo, {
      method: "PUT",
      headers: cabecerasAutenticacion,
      body: transcripcion,
    });

    if (!respuestaSubida.ok) {
      console.error(
        respuestaSubida.status,
        respuestaSubida.statusText,
      );
      return {
        success: false,
        error: `Error al guardar el archivo: ${respuestaSubida.status} ${respuestaSubida.statusText}`,
      };
    }

    const ocsVersionUrl = `${urlNextcloud}/ocs/v2.php/cloud/capabilities`;
    const ocsVersionResponse = await fetch(ocsVersionUrl, {
      method: "GET",
      headers: {
        ...cabecerasAutenticacion,
        "OCS-APIRequest": "true",
      },
    });

    if (!ocsVersionResponse.ok) {
      console.error(
        "Error al acceder al endpoint de versión de la API OCS:",
        ocsVersionResponse,
      );
      return {
        success: false,
        error: "Error al acceder a la API OCS (endpoint de versión).",
      };
    }

    const ocsVersionData = await ocsVersionResponse.text();

    return { success: true, publicUrl: "URL_DE_PRUEBA_OCS_VERSION" };
  } catch (error) {
    console.error("Error de red:", error);
    return { success: false, error: "Error de red" };
  }
}
export async function manejarError(funcion: string, error: unknown) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  writeLog(`Error en ${funcion}: ${errorMsg}`);

  throw new Error(`Error en ${funcion}: ${errorMsg}`);
}

export async function writeLog(message: string) {
  fs.appendFileSync("log.txt", message + "\n", "utf8");
}

export async function borrarArchivoPorUrl(
  urlArchivo: string,
): Promise<boolean> {
  const urlNextcloud = process.env.NEXTCLOUD_URL;
  const usuario = process.env.NEXTCLOUD_USER;
  const contrasena = process.env.NEXTCLOUD_PASSWORD;

  if (!usuario || !contrasena || !urlNextcloud) {
    writeLog(
      "Error: Credenciales de Nextcloud no configuradas para borrar archivo",
    );
    return false;
  }

  try {
    const partesUrl = urlArchivo.split("/");
    const nombreArchivo = partesUrl[partesUrl.length - 1];

    if (!nombreArchivo) {
      writeLog("Error: No se pudo extraer el nombre del archivo de la URL");
      return false;
    }

    writeLog(`Intentando borrar archivo: ${nombreArchivo}`);

    const nombreSinSufijo = nombreArchivo
      .replace(/_Borrador\.docx$/, "")
      .replace(/_Contenido\.txt$/, "")
      .replace(/_Transcripcion\.txt$/, "");

    const rutaArchivo = `/Actas/${nombreSinSufijo}/${nombreArchivo}`;

    const rutaCompletaWebDAV = `${urlNextcloud}/remote.php/dav/files/${usuario}${rutaArchivo}`;

    writeLog(`Borrando archivo en ruta: ${rutaCompletaWebDAV}`);

    const cabecerasAutenticacion = {
      Authorization: "Basic " + btoa(usuario + ":" + contrasena),
    };

    const deleteResponse = await fetch(rutaCompletaWebDAV, {
      method: "DELETE",
      headers: cabecerasAutenticacion,
    });

    if (
      deleteResponse.ok ||
      deleteResponse.status === 204 ||
      deleteResponse.status === 404
    ) {
      writeLog(`Archivo borrado exitosamente o ya no existe: ${nombreArchivo}`);
      return true;
    } else {
      writeLog(`Error al borrar archivo. Status: ${deleteResponse.status}`);
      return false;
    }
  } catch (error) {
    writeLog(`Error al borrar archivo por URL: ${error}`);
    return false;
  }
}

export async function obtenerContenidoArchivo(
  folder: string,
  nombreArchivo: string,
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
      const respuestaContenidoArchivo = await fetch(rutaCompletaArchivo, {
        method: "GET",
        headers: cabecerasAutenticacion,
      });

      if (respuestaContenidoArchivo.ok) {
        contenidoArchivo = await respuestaContenidoArchivo.text();
        writeLog(`Contenido del archivo obtenido exitosamente: ${nombreArchivo}`);
      } else {
        console.error(
          `Error al obtener contenido del archivo. Status: ${respuestaContenidoArchivo.status}`,
        );
        return null;
      }
    } catch (error) {
      manejarError("obtenerContenidoArchivoNextcloud", error);
      return null;
    }
  } else {
    console.error(
      "Credenciales de Nextcloud no configuradas para obtener contenido de archivo.",
    );
    return null;
  }

  return contenidoArchivo;
}

export async function obtenerFileIdArchivo(
  nombreArchivo: string,
  folder: string,
): Promise<string | null> {
  const urlNextcloud = process.env.NEXTCLOUD_URL;
  const usuario = process.env.NEXTCLOUD_USER;
  const contrasena = process.env.NEXTCLOUD_PASSWORD;

  if (!usuario || !contrasena || !urlNextcloud) {
    writeLog("Error: Credenciales de Nextcloud no configuradas para obtener fileId");
    return null;
  }

  try {
    const rutaBaseActas = `${urlNextcloud}/remote.php/dav/files/${usuario}/Actas`;
    const rutaCompleta = `${rutaBaseActas}/${folder}/${nombreArchivo}`;

    const cabecerasAutenticacion = {
      Authorization: "Basic " + btoa(usuario + ":" + contrasena),
      Depth: "0",
    };

    const propiedadesResponse = await fetch(rutaCompleta, {
      method: "PROPFIND",
      headers: cabecerasAutenticacion,
    });

    if (propiedadesResponse.ok) {
      const xmlText = await propiedadesResponse.text();
      const fileIdMatch = xmlText.match(/<oc:fileid>(\d+)<\/oc:fileid>/);
      if (fileIdMatch && fileIdMatch[1]) {
        return fileIdMatch[1];
      } else {
        writeLog("Error: No se encontró el ID del archivo en la respuesta XML");
        return null;
      }
    } else {
      writeLog(`Error: No se encontró la propiedad fileid. Status: ${propiedadesResponse.status}`);
      return null;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    writeLog(`Error al obtener fileId: ${errorMsg}`);
    return null;
  }
}
