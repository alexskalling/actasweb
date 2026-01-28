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
  contenidoActa: string,
) {
  const nombreNormalizado = file;
  const nombreBorradorDocx = `${nombreNormalizado.replace(
    /\.[^/.]+$/,
    "",
  )}_Borrador.docx`;
  const nombreTranscripcionTxt = `${nombreNormalizado.replace(
    /\.[^/.]+$/,
    "",
  )}_Transcripcion.txt`;
  const nombreContenidoTxt = `${nombreNormalizado.replace(
    /\.[^/.]+$/,
    "",
  )}_Contenido.txt`;

  try {
    writeLog(`Iniciando formateo de contenido para: ${file}`);

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
    const rutaArchivoContenido = `/Actas/${folder}/${nombreContenidoTxt}`;

    writeLog(`Verificando Borrador .docx existente: ${nombreBorradorDocx}`);
    if (await verificarArchivoExistente(nombreBorradorDocx, folder)) {
      writeLog(`Borrador .docx encontrado: ${nombreBorradorDocx}`);

      writeLog(`Obteniendo URL pública del borrador`);
      const publicUrlBorrador = await obtenerUrlPublicaArchivoExistente(
        rutaArchivoBorrador,
        urlNextcloud,
        usuario,
        contrasena,
      );
      if (!publicUrlBorrador) {
        throw new Error("No se pudo obtener URL pública del borrador");
      }
      writeLog(`URL pública del borrador obtenida: ${publicUrlBorrador}`);

      writeLog(`Obteniendo URL pública de la transcripción`);
      const publicUrlTranscripcion = await obtenerUrlPublicaArchivoExistente(
        rutaArchivoTranscripcion,
        urlNextcloud,
        usuario,
        contrasena,
      );
      if (!publicUrlTranscripcion) {
        throw new Error("No se pudo obtener URL pública de la transcripción");
      }
      writeLog(`URL pública de la transcripción obtenida: ${publicUrlTranscripcion}`);

      const fileIdFromUrlBorrador =
        obtenerFileIdDeUrlPublica(publicUrlBorrador);
      if (!fileIdFromUrlBorrador) {
        throw new Error(
          "No se pudo extraer fileId de la publicUrl de Borrador.docx (EXISTENTE).",
        );
      }
      const fileIdFromUrlTranscripcion = obtenerFileIdDeUrlPublica(
        publicUrlTranscripcion,
      );
      if (!fileIdFromUrlTranscripcion) {
        throw new Error(
          "No se pudo extraer fileId de la publicUrl de Transcripcion.txt (EXISTENTE).",
        );
      }

      writeLog(`Obteniendo URL pública del contenido`);
      const publicUrlContenido = await obtenerUrlPublicaArchivoExistente(
        rutaArchivoContenido,
        urlNextcloud,
        usuario,
        contrasena,
      );
      if (!publicUrlContenido) {
        writeLog(`Advertencia: No se pudo obtener URL pública del contenido`);
      } else {
        writeLog(`URL pública del contenido obtenida: ${publicUrlContenido}`);
      }

      const fileIdFromUrlContenido = publicUrlContenido
        ? obtenerFileIdDeUrlPublica(publicUrlContenido)
        : null;
      const baseUrlDescargaDirectaContenido = fileIdFromUrlContenido
        ? `${urlNextcloud}/s/${fileIdFromUrlContenido}/download`
        : null;

      const baseUrlDescargaDirectaBorrador = `${urlNextcloud}/s/${fileIdFromUrlBorrador}/download`;
      const baseUrlDescargaDirectaTranscripcion = `${urlNextcloud}/s/${fileIdFromUrlTranscripcion}/download`;

      return {
        status: "success",
        message:
          "Borrador .docx ya existente. URLs de descarga pública generadas.",
        transcripcion: `${baseUrlDescargaDirectaTranscripcion}/${nombreTranscripcionTxt}`,
        acta: `${baseUrlDescargaDirectaBorrador}/${nombreBorradorDocx}`,
        contenido: baseUrlDescargaDirectaContenido
          ? `${baseUrlDescargaDirectaContenido}/${nombreContenidoTxt}`
          : null,
      };
    } else {
      writeLog(`Borrador .docx no existe, se creará uno nuevo`);

      let actaHTMLContent = contenidoActa;
      if (!actaHTMLContent) {
        writeLog(`Contenido del acta no proporcionado. Leyendo _Contenido.txt`);
        actaHTMLContent = (await obtenerContenidoArchivo(
          folder,
          nombreContenidoTxt,
        )) as string;
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

      // Validar HTML antes de intentar guardar
      writeLog(`Validando HTML completo antes de guardar...`);
      const validacion = validarHTMLCompleto(actaHTMLContent);
      
      if (!validacion.esValido) {
        writeLog(`[VALIDACIÓN HTML] HTML inicial tiene errores, intentando reparar...`);
        writeLog(`[VALIDACIÓN HTML] Errores detectados: ${validacion.errores.join("; ")}`);
        
        // Intentar reparar HTML desbalanceado
        const { htmlReparado, reparacionesRealizadas } = repararHTMLDesbalanceado(actaHTMLContent);
        
        if (reparacionesRealizadas.length > 0) {
          writeLog(`[AUTO-REPARACIÓN HTML] Reparaciones realizadas:`);
          reparacionesRealizadas.forEach((rep) => writeLog(`  - ${rep}`));
          
          // Validar nuevamente el HTML reparado
          const validacionReparado = validarHTMLCompleto(htmlReparado);
          
          if (validacionReparado.esValido) {
            writeLog(`[AUTO-REPARACIÓN HTML] ✓ HTML reparado exitosamente`);
            actaHTMLContent = htmlReparado;
          } else {
            const mensajeError = `HTML no se pudo reparar completamente:\n${validacionReparado.errores.join("\n")}`;
            writeLog(`[ERROR VALIDACIÓN HTML] ${mensajeError}`);
            writeLog(`[HTML] Longitud: ${actaHTMLContent.length} caracteres`);
            writeLog(`[HTML] Últimos 500 caracteres: ${actaHTMLContent.slice(-500)}`);
            throw new Error(mensajeError);
          }
        } else {
          const mensajeError = `HTML incompleto o malformado detectado:\n${validacion.errores.join("\n")}`;
          writeLog(`[ERROR VALIDACIÓN HTML] ${mensajeError}`);
          writeLog(`[HTML] Longitud: ${actaHTMLContent.length} caracteres`);
          writeLog(`[HTML] Últimos 500 caracteres: ${actaHTMLContent.slice(-500)}`);
          throw new Error(mensajeError);
        }
      }
      
      if (validacion.advertencias.length > 0) {
        writeLog(`[ADVERTENCIAS HTML] ${validacion.advertencias.join(", ")}`);
      }
      
      writeLog(`HTML validado correctamente: ${actaHTMLContent.length} caracteres, estructura completa`);

      writeLog(`Guardando Borrador .docx en Nextcloud: ${nombreBorradorDocx}`);
      const archivoGuardado = await guardarArchivoNextcloudDocx(
        folder,
        nombreBorradorDocx,
        actaHTMLContent,
      );
      if (!archivoGuardado) {
        throw new Error("Error al guardar el archivo .docx en Nextcloud.");
      }
      writeLog(`Borrador .docx guardado exitosamente.`);

      writeLog(`Obteniendo URL pública del borrador recién creado`);
      const publicUrlBorrador = await obtenerUrlPublicaArchivoExistente(
        rutaArchivoBorrador,
        urlNextcloud,
        usuario,
        contrasena,
      );
      if (!publicUrlBorrador) {
        throw new Error("No se pudo obtener URL pública del borrador");
      }
      writeLog(`URL pública del borrador obtenida: ${publicUrlBorrador}`);

      writeLog(`Obteniendo URL pública de la transcripción`);
      const publicUrlTranscripcion = await obtenerUrlPublicaArchivoExistente(
        rutaArchivoTranscripcion,
        urlNextcloud,
        usuario,
        contrasena,
      );
      if (!publicUrlTranscripcion) {
        throw new Error("No se pudo obtener URL pública de la transcripción");
      }
      writeLog(`URL pública de la transcripción obtenida: ${publicUrlTranscripcion}`);

      const fileIdFromUrlBorrador =
        obtenerFileIdDeUrlPublica(publicUrlBorrador);
      if (!fileIdFromUrlBorrador) {
        throw new Error(
          "No se pudo extraer fileId de la publicUrl de Borrador.docx (RECIÉN CREADO).",
        );
      }
      const fileIdFromUrlTranscripcion = obtenerFileIdDeUrlPublica(
        publicUrlTranscripcion,
      );
      if (!fileIdFromUrlTranscripcion) {
        throw new Error(
          "No se pudo extraer fileId de la publicUrl de Transcripcion.txt (EXISTENTE).",
        );
      }

      writeLog(`Obteniendo URL pública del contenido`);
      const publicUrlContenido = await obtenerUrlPublicaArchivoExistente(
        rutaArchivoContenido,
        urlNextcloud,
        usuario,
        contrasena,
      );
      if (!publicUrlContenido) {
        writeLog(`Advertencia: No se pudo obtener URL pública del contenido`);
      } else {
        writeLog(`URL pública del contenido obtenida: ${publicUrlContenido}`);
      }

      const fileIdFromUrlContenido = publicUrlContenido
        ? obtenerFileIdDeUrlPublica(publicUrlContenido)
        : null;
      const baseUrlDescargaDirectaContenido = fileIdFromUrlContenido
        ? `${urlNextcloud}/s/${fileIdFromUrlContenido}/download`
        : null;

      const baseUrlDescargaDirectaBorrador = `${urlNextcloud}/s/${fileIdFromUrlBorrador}/download`;
      const baseUrlDescargaDirectaTranscripcion = `${urlNextcloud}/s/${fileIdFromUrlTranscripcion}/download`;

      return {
        status: "success",
        message:
          "Borrador .docx generado y guardado. URLs de descarga pública generadas.",
        transcripcion: `${baseUrlDescargaDirectaTranscripcion}/${nombreTranscripcionTxt}`,
        acta: `${baseUrlDescargaDirectaBorrador}/${nombreBorradorDocx}`,
        contenido: baseUrlDescargaDirectaContenido
          ? `${baseUrlDescargaDirectaContenido}/${nombreContenidoTxt}`
          : null,
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
  contrasena: string,
): Promise<string | null> {
  const cabecerasAutenticacion = {
    Authorization: "Basic " + btoa(usuario + ":" + contrasena),
    "Content-Type": "application/x-www-form-urlencoded",
    "OCS-APIRequest": "true",
  };

  try {
    writeLog(`Obteniendo URL pública para archivo: ${rutaArchivoCompartir}`);
    const shareUrl = `${urlNextcloud}/ocs/v2.php/apps/files_sharing/api/v1/shares`;
    const shareResponse = await fetch(shareUrl, {
        method: "POST",
        headers: cabecerasAutenticacion,
        body: new URLSearchParams({
          path: rutaArchivoCompartir,
          shareType: "3",
          permissions: "1",
        }),
    });

    if (!shareResponse.ok) {
      console.error(`Error al obtener URL pública. Status: ${shareResponse.status} ${shareResponse.statusText}`);
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
        writeLog(`URL pública obtenida: ${publicUrlNextcloud}`);
      } else {
        console.error(
          "Elemento <url> no encontrado en la respuesta XML al compartir archivo existente:",
          xmlDoc,
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

interface ValidacionHTML {
  esValido: boolean;
  errores: string[];
  advertencias: string[];
}

function validarHTMLCompleto(htmlContent: string): ValidacionHTML {
  const resultado: ValidacionHTML = {
    esValido: true,
    errores: [],
    advertencias: [],
  };

  if (!htmlContent || htmlContent.trim().length === 0) {
    resultado.esValido = false;
    resultado.errores.push("El contenido HTML está vacío");
    return resultado;
  }

  // Verificar que no termine en medio de una etiqueta
  const ultimosCaracteres = htmlContent.trim().slice(-50);
  if (ultimosCaracteres.includes("<") && !ultimosCaracteres.endsWith(">")) {
    const posicionUltimoMenor = ultimosCaracteres.lastIndexOf("<");
    const fragmentoIncompleto = ultimosCaracteres.slice(posicionUltimoMenor);
    resultado.esValido = false;
    resultado.errores.push(
      `HTML truncado: termina en medio de una etiqueta: "${fragmentoIncompleto}"`,
    );
  }

  // Verificar balance de comillas en atributos
  const comillas = (htmlContent.match(/"/g) || []).length;
  if (comillas % 2 !== 0) {
    resultado.esValido = false;
    resultado.errores.push(
      "HTML incompleto: número impar de comillas - posible atributo sin cerrar",
    );
  }

  // Verificar balance de etiquetas comunes
  const etiquetasParaValidar = [
    "header",
    "h1",
    "h2",
    "h3",
    "p",
    "ul",
    "ol",
    "li",
    "div",
    "strong",
  ];

  for (const etiqueta of etiquetasParaValidar) {
    const aperturas = (
      htmlContent.match(new RegExp(`<${etiqueta}[\\s>]`, "gi")) || []
    ).length;
    const cierres = (
      htmlContent.match(new RegExp(`</${etiqueta}>`, "gi")) || []
    ).length;

    if (aperturas !== cierres) {
      resultado.esValido = false;
      resultado.errores.push(
        `Etiquetas <${etiqueta}> desbalanceadas: ${aperturas} aperturas vs ${cierres} cierres`,
      );
    }
  }

  // Verificar que haya una estructura mínima esperada
  if (!htmlContent.includes("<header>")) {
    resultado.advertencias.push(
      "No se encontró etiqueta <header> - posible contenido incompleto",
    );
  }

  // Verificar que no haya etiquetas huérfanas al final
  const patronEtiquetaHuerfana = /<(h[1-6]|p|li|div|strong)[^>]*>[^<]*$/i;
  if (patronEtiquetaHuerfana.test(htmlContent.trim())) {
    const match = htmlContent.trim().match(patronEtiquetaHuerfana);
    if (match) {
      resultado.esValido = false;
      resultado.errores.push(
        `HTML truncado: etiqueta sin cerrar al final: "${match[0].slice(0, 50)}..."`,
      );
    }
  }

  return resultado;
}

function repararHTMLDesbalanceado(htmlContent: string): {
  htmlReparado: string;
  reparacionesRealizadas: string[];
} {
  let html = htmlContent;
  const reparaciones: string[] = [];

  // Contar etiquetas para reparar
  const etiquetasParaReparar = [
    { tag: "ul", selfClosing: false },
    { tag: "ol", selfClosing: false },
    { tag: "li", selfClosing: false },
    { tag: "p", selfClosing: false },
    { tag: "div", selfClosing: false },
    { tag: "strong", selfClosing: false },
    { tag: "h1", selfClosing: false },
    { tag: "h2", selfClosing: false },
    { tag: "h3", selfClosing: false },
  ];

  for (const { tag } of etiquetasParaReparar) {
    const aperturas = (
      html.match(new RegExp(`<${tag}[\\s>]`, "gi")) || []
    ).length;
    const cierres = (html.match(new RegExp(`</${tag}>`, "gi")) || []).length;

    if (aperturas > cierres) {
      const faltantes = aperturas - cierres;
      const tagsDeCierre = `</${tag}>`.repeat(faltantes);
      html += tagsDeCierre;
      reparaciones.push(
        `Agregados ${faltantes} </${tag}> al final del documento`,
      );
    }
  }

  return {
    htmlReparado: html,
    reparacionesRealizadas: reparaciones,
  };
}

function limpiarHTMLParaDocx(htmlContent: string): string {
  if (!htmlContent) return "";

  let cleanedHTML = htmlContent;

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
  textoActa: string,
): Promise<boolean> {
  const actaContent = limpiarHTMLParaDocx(textoActa);

  writeLog(`Preparando guardado .docx en Nextcloud: ${nombreActaDocx}`);
  writeLog(`Iniciando proceso de guardado`);

  writeLog(`VERSION DE NODE.JS EN DOCKER: ${process.version}`);
  writeLog(`SISTEMA OPERATIVO EN DOCKER: ${process.platform} ${process.arch}`);
  writeLog(`VARIABLES DE ENTORNO IMPORTANTES EN DOCKER:`);
  writeLog(`  NEXTCLOUD_URL: ${process.env.NEXTCLOUD_URL}`);
  writeLog(`  NEXTCLOUD_USER: ${process.env.NEXTCLOUD_USER}`);
  writeLog(`  NEXTCLOUD_PASSWORD: ${process.env.NEXTCLOUD_PASSWORD ? "***" : "NO CONFIGURADO"}`);
  writeLog(`CONTENIDO HTML JUSTO ANTES DE htmlToDocx: ${actaContent}`);

  try {
    // Configuración mínima sin formato especial
    const options = {
      header: false,
      footer: false,
      pageNumber: false,
    };

    writeLog(`[DOCX] Convirtiendo HTML a DOCX...`);
    const docxBuffer = await htmlToDocx(actaContent, null, options);
    writeLog(`[DOCX] Conversión exitosa, tamaño buffer: ${Buffer.byteLength(docxBuffer as unknown as string)} bytes`);

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

    writeLog(`[NEXTCLOUD] Guardando archivo en: ${rutaCompletaArchivoDocx}`);
    const respuestaGuardado = await fetch(rutaCompletaArchivoDocx, {
      method: "PUT",
      headers: cabecerasAutenticacion,
      body: docxBuffer,
    });

    if (!respuestaGuardado.ok) {
      const errorText = await respuestaGuardado.text();
      const errorMsg = `Error al guardar en Nextcloud - Status: ${respuestaGuardado.status} ${respuestaGuardado.statusText}`;
      writeLog(`[ERROR NEXTCLOUD] ${errorMsg}`);
      writeLog(`[ERROR NEXTCLOUD] Response body: ${errorText.slice(0, 500)}`);
      writeLog(`[ERROR NEXTCLOUD] Ruta: ${rutaCompletaArchivoDocx}`);
      writeLog(`[ERROR NEXTCLOUD] Tamaño contenido: ${contentLength} bytes`);
      console.error(errorMsg);
      console.error("Response body:", errorText);
      return false;
    }

    writeLog(`[NEXTCLOUD] Archivo guardado exitosamente`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    writeLog(`[ERROR] Error en guardarArchivoNextcloudDocx: ${errorMsg}`);
    console.error("Error en guardarArchivoNextcloudDocx:", error);
    if (error instanceof Error && error.stack) {
      writeLog(`[ERROR] Stack trace: ${error.stack}`);
    }
    return false;
  }
}
