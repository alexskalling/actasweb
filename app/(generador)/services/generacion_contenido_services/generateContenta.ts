"use server";

import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  manejarError,
  writeLog,
  guardarArchivo,
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

export async function generateContenta(
  folder: string,
  file: string,
  fileid: string,
  transcipcion: string
) {
  const nombreContenido = `${file.replace(/\.[^/.]+$/, "")}_Contenido.txt`;
  const nombreTranscripcion = `${file.replace(
    /\.[^/.]+$/,
    ""
  )}_Transcripcion.txt`;

  try {
    writeLog(`Verificando contenido existente: ${nombreContenido}`);

    if (await verificarArchivoExistente(nombreContenido, folder)) {
      writeLog(`Contenido existente: ${nombreContenido}. Cargando.`);
      const contenidoExistente = await obtenerContenidoArchivo(
        folder,
        nombreContenido
      );
      return { status: "success", content: contenidoExistente };
    }

    writeLog(`Generando contenido para: ${file}`);
    socketBackendReal.emit("upload-status", {
      roomName: folder,
      statusData: {
        message: `[Contenido] Leyendo, entendiendo y analisando el contenido de: ${file} `,
      },
    });

    let contenidoTranscripcion = transcipcion;

    if (!contenidoTranscripcion) {
      writeLog(
        `Transcripción no proporcionada como parámetro. Verificando transcripción existente: ${nombreTranscripcion}`
      );
      if (!(await verificarArchivoExistente(nombreTranscripcion, folder))) {
        writeLog(`Transcripción no encontrada: ${nombreTranscripcion}`);
        return {
          status: "error",
          message: "Transcripción no encontrada en Nextcloud.",
        };
      }
      writeLog(
        `Transcripción encontrada: ${nombreTranscripcion}. Obteniendo contenido.`
      );
      //@ts-expect-error revisar despues - This comment can be removed if types are properly checked.
      contenidoTranscripcion = await obtenerContenidoArchivo(
        folder,
        nombreTranscripcion
      );
      if (!contenidoTranscripcion) {
        return {
          status: "error",
          message:
            "No se pudo obtener el contenido de la transcripción desde Nextcloud.",
        };
      }
    } else {
      writeLog(`Usando transcripción proporcionada como parámetro.`);
    }

    writeLog(`Generando Orden del Día con Gemini para: ${file}`);
    socketBackendReal.emit("upload-status", {
      roomName: folder,
      statusData: {
        message: `[Contenido] Generando el orden del dia de la reunion `,
      },
    });
    let responseGeminiOrdenDelDia;
    let retryCountOrdenDelDia = 0;
    const maxRetriesOrdenDelDia = 3;
    let modelNameOrdenDelDia = "gemini-2.0-flash"; // Puedes mantener este modelo inicial

    while (retryCountOrdenDelDia < maxRetriesOrdenDelDia) {
      try {
        responseGeminiOrdenDelDia = await generateText({
          model: google(modelNameOrdenDelDia),
          maxTokens: 20000,
          temperature: 0,
          frequencyPenalty: 0.6,
          presencePenalty: 0.3,
          system: await getSystemPromt("Orden"),
          prompt: await getUserPromt(
            "Orden",
            "Orden",
            contenidoTranscripcion,
            "",
            0,
            ""
          ),
        });
        break; // Si la llamada es exitosa, sal del bucle
      } catch (error) {
        console.error(
          `Error al generar el Orden del Día (intento ${retryCountOrdenDelDia + 1
          }):`,
          error
        );
        retryCountOrdenDelDia++;
        if (retryCountOrdenDelDia > 1) {
          modelNameOrdenDelDia = "gemini-2.5-flash"; // Mantener el mismo modelo o cambiar si lo prefieres
          console.log("Cambio de modelo (Orden del Día) a gemini-2.5-flash");
        }
        if (retryCountOrdenDelDia >= maxRetriesOrdenDelDia) {
          console.error(
            "Máximo número de intentos alcanzado al generar el Orden del Día."
          );
          return {
            status: "error",
            message:
              "Error al generar el Orden del Día después de varios intentos.",
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Espera antes de reintentar
      }
    }

    //@ts-expect-error revisar despues - This comment can be removed if types are properly checked.

    const jsonCleaned = responseGeminiOrdenDelDia.text
      .trim()
      .replace(/^`+|`+$/g, "")
      .replace(/^json/i, "");

    try {
      const ordenDelDiaJSON = JSON.parse(jsonCleaned);
      
      // Validar que el cierre esté presente
      const tieneCierre = ordenDelDiaJSON.some((item: { nombre: string; }) => 
        item.nombre && item.nombre.toLowerCase().includes('cierre')
      );
      
      if (!tieneCierre) {
        console.log('Orden del día no incluye cierre, agregando...');
        ordenDelDiaJSON.push({
          id: ordenDelDiaJSON.length,
          nombre: "Cierre",
          esLecturaActaAnterior: false,
          discutido: true
        });
      }
      
      socketBackendReal.emit("upload-status", {
        roomName: folder,
        statusData: {
          message: `[Contenido] Orden del dia listo `,
        },
      });
      console.log('este es el orden del dia'+JSON.stringify(ordenDelDiaJSON));

      // Crear caché de transcripción en Gemini para reducir tokens por llamada
      const cachedContentId = await crearCacheGeminiTranscripcion(contenidoTranscripcion);

      const contenido = await procesarOrdenDelDia(
        ordenDelDiaJSON,
        folder,
        socketBackendReal,
        contenidoTranscripcion,
        cachedContentId
      );

      // Log para verificar que el contenido incluye el cierre
      console.log("🔍 CONTENIDO COMPLETO - Longitud:", contenido.length);
      console.log("🔍 CONTENIDO COMPLETO - Incluye 'Cierre':", contenido.includes("Cierre"));
      console.log("🔍 CONTENIDO COMPLETO - Últimas 500 caracteres:", contenido.slice(-500));
      
      const contenidoFormato = contenido
        .replace(/```html/g, "")
        .replace(/HTML/g, "")
        .replace(/html/g, "")
        .replace(/```/g, "")
        .replace(/< lang="es">/g, "")
        .replace(/\[Text Wrapping Break\]/g, "")
        .trim();

      writeLog(`Guardando contenido en Nextcloud: ${nombreContenido}`);
      await guardarArchivo(folder, nombreContenido, contenidoFormato);
      writeLog(`Contenido guardado: ${nombreContenido}`);

      return { status: "success", content: contenidoFormato };
    } catch (jsonError) {
      manejarError("generateContenta - Error JSON", jsonError);
      writeLog(`Error JSON parse: . JSON Text: ${jsonCleaned}`);
      return {
        status: "error",
        message: "Error al procesar el Orden del Día (JSON inválido).",
      };
    }
  } catch (error) {
    manejarError("generateContenta", error);
    return {
      status: "error",
      message: "Error durante la generación del contenido.",
    };
  }
}

async function procesarOrdenDelDia(
  //@ts-expect-error revisar después
  ordenDelDiaJSON,
  //@ts-expect-error revisar después
  folder,
  //@ts-expect-error revisar después
  socketBackendReal,
  //@ts-expect-error revisar después
  contenidoTranscripcion,
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cachedContentId?: string
) {
 
  let contenido = "";

  let index = 0;
  let modelName = "gemini-2.0-flash";
  const maxRetries = 3;
  let retryCount = 0;

  for (const tema of ordenDelDiaJSON) {
    console.log(tema);
    
    // Log específico para el cierre
    if (tema.nombre === "Cierre") {
      console.log("🔍 PROCESANDO CIERRE - tema:", tema);
      socketBackendReal.emit("upload-status", {
        roomName: folder,
        statusData: {
          message: `[Contenido] Procesando Cierre de la Reunión`,
        },
      });
    } else if (tema.nombre != "Cabecera") {
      socketBackendReal.emit("upload-status", {
        roomName: folder,
        statusData: {
          message: `[Contenido] ${index}/${ordenDelDiaJSON.length - 2}   ${tema.nombre
            }   `,
        },
      });
    }
    console.log(index);
    const nombreTemaNormalizado = String((tema as { nombre: string })?.nombre ?? "")
      .trim()
      .toLowerCase();
    const promptType =
      nombreTemaNormalizado === "cabecera"
        ? "Cabecera"
        : nombreTemaNormalizado === "cierre"
          ? "Cierre"
          : "Contenido";

    let responseTema;
    retryCount = 0;

    // Límites por tipo para permitir desarrollo suficiente
    const maxTokensPorTipo: Record<string, number> = {
      Cabecera: 12000,
      Contenido: 20000,
      Cierre: 12000,
    };

    // Fuente para el tema: si se indicó que no fue discutido, pasa vacío; de lo contrario, usa la transcripción completa (cacheada externamente por el proveedor si aplica)
    // EXCEPCIONES: El cierre y la cabecera siempre necesitan la transcripción completa
    const contenidoTemaFuente = (tema )?.discutido === false && nombreTemaNormalizado !== "cierre" && nombreTemaNormalizado !== "cabecera" ? "" : contenidoTranscripcion;

    // Debug log para cabecera
    if (promptType === "Cabecera") {
      console.log("🔍 GENERANDO CABECERA - Tema:", tema.nombre);
      console.log("🔍 CONTENIDO TRANSCRIPCIÓN (primeros 500 chars):", contenidoTemaFuente.substring(0, 500));
      console.log("🔍 LONGITUD TOTAL TRANSCRIPCIÓN:", contenidoTemaFuente.length);
    }

    while (retryCount < maxRetries) {
      try {
        responseTema = await generateText({
          model: google(modelName),
          maxTokens: maxTokensPorTipo[promptType] ?? 2000,
          temperature: 0,
          frequencyPenalty: 0.6,
          presencePenalty: 0.3,
          system: await getSystemPromt(promptType),
          prompt: await getUserPromt(
            promptType,
            tema.nombre,
            contenidoTemaFuente,
            promptType !== "Cierre" ? JSON.stringify(ordenDelDiaJSON) : "",
            index,
            ""
          ),
        });
        // Evitamos logs largos; solo acumulamos
        contenido += responseTema.text.trim();
        
        // Log específico para el cierre
        if (tema.nombre === "Cierre") {
          console.log("✅ CIERRE PROCESADO - Longitud del contenido:", contenido.length);
          console.log("📄 Últimas 200 caracteres del contenido:", contenido.slice(-200));
        }
        
        // Log específico para la cabecera
        if (tema.nombre === "Cabecera") {
          console.log("✅ CABECERA PROCESADA - Respuesta completa:");
          console.log(responseTema.text);
        }
        
        break;
      } catch (error) {
        console.error(
          `Error al procesar tema ${tema.nombre} (intento ${retryCount + 1}):` +
          error
        );

        retryCount++;
        if (retryCount > 1) {
          modelName = "gemini-2.5-flash";
          console.log("Cambio de modelo a gemini-2.5-flash");
        }

        if (retryCount >= maxRetries) {
          console.error(
            "Máximo número de intentos alcanzado, no se pudo procesar el tema."
          );
          contenido += `[Error: No se pudo procesar ${tema.nombre}. Máximo número de intentos alcanzado.]`;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    index++;
  }
  if (contenido.trim() === "") {
    console.warn("Advertencia: El contenido está vacío.");
  }
  return contenido;
}

// Crea caché de transcripción en Gemini y devuelve el ID (name)
async function crearCacheGeminiTranscripcion(transcripcion: string): Promise<string | undefined> {
  try {
    if (!transcripcion || transcripcion.trim().length === 0) return undefined;
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY_GEMINI || "";
    if (!apiKey) return undefined;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cachedContentApi: any = (model as any).cachedContent?.();
    if (!cachedContentApi || typeof cachedContentApi.create !== "function") {
      return undefined;
    }
    const res = await cachedContentApi.create({
      contents: [{ role: "user", parts: [{ text: transcripcion }] }],
      ttl: "1h", 
    });
    const name = res?.cachedContent?.name;
    if (name) writeLog(`[Gemini Cache] creado: ${name}`);
    return name;
  } catch (e) {
    console.warn("No se pudo crear caché en Gemini (opcional):", e);
    return undefined;
  }
}

async function getSystemPromt(tipo: string) {
  let systemPromt = "";

  switch (tipo) {
    case "Orden":
      systemPromt = `Genera un Orden del Día en JSON estricto.
Regla CRÍTICA: Todo lo dicho en "Lectura del acta anterior" va en un ÚNICO ítem y se resume; está prohibido desarrollarlo aparte o extraer subtemas para la reunión actual.

Formato (array de objetos): { id:number, nombre:string, esLecturaActaAnterior:boolean, discutido:boolean, subtemas?: string[] }

Los subtemas deben incluirse en el arreglo "subtemas" cuando se identifiquen temas relacionados dentro de cada tema principal.

Respeta el orden cronológico de la transcripción. No agregues temas inexistentes. No devuelvas texto adicional fuera del JSON.

Procesar transcripciones de reuniones y generar un orden del día en formato JSON. Respete el orden del día, no deje ningún elemento del JSON por fuera.
Instrucciones Específicas:
recuerda no desarollar de manera indivuad l los temas que son parte de proposicines y varios es un apartado donde se deralloan esos temas dando orden

Formato de Respuesta: Responde únicamente con un objeto JSON válido. No incluyas texto adicional, explicaciones o comentarios antes o después del JSON.
Estructura del Orden del Día (JSON):
tene n cuenta toda la transcripcion y mante el orden de la transcripcion y no reordenes los temas y no agregues temas que no estan en la transcripcion ademas no agregues temas que son de la elctura el act anterior eso es el puto a resumr y detaar en un solo putno lod emas temas si se desarrollan de maner infiviail asi que asegurae de leer toda la transcripcion y encapsular lsotmas como corresponde y no desarrolles indivulamente temas que son del acta anterior
toma te ru iempo apra identifica si esxite el tema de la lectura del acta anterior y si existe no agregues temas que son de la elctura el act anterior eso es el puto a resumr y detaar en un solo putno lod emas temas si se desarrollan de maner infiviail asi que asegurae de leer toda la transcripcion y encapsular lsotmas como corresponde y no desarrolles indivulamente temas que son del acta anterior

Si la transcripción contiene un "Orden del Día" explícito:

    Tómalo como base.

    Revisa la transcripción para identificar temas importantes que no estén en el orden del día explícito.

    Incluye estos temas adicionales en el orden del día generado.

    No elimines ningún punto del orden del día explícito.

    1. Manejo Prioritario de "Lectura del acta anterior":

        CRÍTICO Y PRIMORDIAL: Antes de cualquier otra agrupación, debes identificar si existe el tema "Lectura del acta anterior" o un título similar en la transcripción o en el orden del día explícito.

        Si se detecta este tema, TODOS los detalles o puntos discutidos exclusivamente como parte de la revisión o aclaración de esa acta previa deben ser considerados como parte integral de este ÚNICO punto del orden del día. Esto significa que NO deben ser extraídos ni listados como temas individuales para un desarrollo separado en el orden del día actual. Cualquier mención de temas pasados durante la lectura del acta anterior pertenece y se subsume en ese punto.

    2. Gestión de Temas Relacionados (Excluyendo "Lectura del acta anterior"):

        Una vez manejado el punto de "Lectura del acta anterior", identifica temas altamente similares entre los puntos restantes del orden del día explícito o los temas adicionales identificados (por ejemplo, "Informe de ascensores" y "Discusión sobre ascensores").

        Si encuentras temas con una similitud muy alta, combínalos en un único punto del orden del día. Asegúrate de integrar la información y los detalles discutidos en ambos temas originales dentro del nuevo punto combinado, evitando la repetición de información.

        Solo los temas nuevos y sustantivos que surgen como puntos de discusión independientes más allá de la mera revisión del acta previa, deben ser considerados para su inclusión individual en el orden del día de la reunión actual.

    Asegúrate de que el orden del día generado refleje el orden cronológico de los temas tratados en la transcripción.

    Antes de entregar el resultado final, asegúrate de que no haya temas duplicados en la lista. Si un tema con el mismo nombre (o un tema ya combinado) ya está presente, no lo incluyas nuevamente. Solo debe aparecer una vez en el orden del día.

    Detección EXPLÍCITA de duplicados por similitud (obligatorio):
      - Normaliza los nombres (minúsculas, sin tildes, sin stopwords básicas) y calcula similitud semántica.
      - Si dos ítems son casi idénticos (>0.85 de similitud) o difieren solo por prefijos como "re-", "ajuste de", "continuación de", fusiónalos en uno solo manteniendo el orden del primero.
      - Ejemplos a fusionar: "Fumigación del domo" y "Re fumigación del domo"; "Informe de ascensores" y "Discusión sobre ascensores".
      - EXCEPCIÓN: "Lectura del acta anterior" nunca se fusiona con otros temas.

    Clasificación de subtemas (obligatorio):
      - Si un posible ítem es claramente parte de un tema mayor (p.ej., "Re fumigación del domo" dentro de "Mantenimiento áreas comunes"), NO lo listes como tema principal. Inclúyelo en el arreglo "subtemas" del tema mayor.
      - Los subtemas NO se listan en la cabecera ni como ítems independientes; sirven para guiar la redacción dentro del tema padre.
      - REGLA FÉRREA: Está ESTRÍCTAMENTE PROHIBIDO dividir un mismo tema en dos ítems del orden del día. Todo su desarrollo debe quedar en un único ítem (con subtemas si aplica). Si reaparece más tarde, trátalo como continuación del mismo ítem, sin crear uno nuevo.
      - EXTRACCIÓN MEJORADA DE SUBTEMAS: Identifica todos los subtemas relacionados que se discuten dentro de cada tema principal y agrégalos al arreglo "subtemas".
      - SUBTEMAS ESPECÍFICOS: Incluye subtemas como "brigadas de trabajo", "equipos de mantenimiento", "actividades específicas", "responsabilidades", "plazos", "costos", "equipos necesarios", "personal requerido", etc.
      - ORGANIZACIÓN: Agrupa subtemas relacionados bajo el tema principal correspondiente.
      - DETECCIÓN: Busca subtemas mencionados explícitamente en la transcripción y organízalos bajo el tema principal.

Si la transcripción no contiene un "Orden del Día" explícito:

    Genera un orden del día basado en los temas principales discutidos en la transcripción.

    1. Manejo Prioritario de "Lectura del acta anterior":

        CRÍTICO Y PRIMORDIAL: Antes de cualquier otra agrupación, debes identificar si existe el tema "Lectura del acta anterior" o un título similar en la transcripción.

        Si se detecta este tema, TODOS los detalles o puntos discutidos exclusivamente como parte de la revisión o aclaración de esa acta previa deben ser considerados como parte integral de este ÚNICO punto del orden del día. Esto significa que NO deben ser extraídos ni listados como temas individuales para un desarrollo separado en el orden del día actual. Cualquier mención de temas pasados durante la lectura del acta anterior pertenece y se subsume en ese punto.

    2. Gestión de Temas Relacionados (Excluyendo "Lectura del acta anterior"):

        Una vez manejado el punto de "Lectura del acta anterior", identifica temas altamente similares entre los puntos restantes de los temas principales discutidos (siguiendo el mismo criterio de alta similitud ejemplificado anteriormente).

        Si encuentras temas con una similitud muy alta, combínalos en un único punto del orden del día, integrando la información y los detalles discutidos en ambos temas originales sin repetir información.

        Solo los temas nuevos y sustantivos que surgen como puntos de discusión independientes más allá de la mera revisión del acta previa, deben ser considerados para su inclusión individual en el orden del día de la reunión actual.

    Asegúrate de incluir todos los temas principales identificados (o combinados).

    Mantén el orden cronológico en el que los temas fueron tratados.

    Antes de entregar el resultado final, verifica que no haya duplicados en la lista. Si un tema ya está en la lista (o ha sido combinado), no lo repitas.

elnombre del tema ebe ser corto y claro eplcicativo pero dejar el dearollo de los temas en el contenido no exageres con el titulo de los temas se puntual y claro 
    Elementos Obligatorios:

El JSON siempre debe comenzar con:
{ "id": 0, "nombre": "Cabecera" }

Y finalizar con:
{ "id": n + 1, "nombre": "Cierre" }
Nivel de Detalle:

Incluye solo los temas principales. No incluyas subtemas o detalles menores.
 Formato JSON Preciso:

  La respuesta debe ser un array de objetos JSON con los campos "id" (numérico secuencial, comenzando en 0), "nombre", "esLecturaActaAnterior" y "discutido" (booleano; true si el punto fue tratado, false si no).
 No incluyas etiquetas o nombres de campos adicionales.
Transcripción Vacía o Irrelevante:

Si la transcripción está vacía o no contiene información relevante para generar un orden del día, responde con el siguiente JSON:

[
  { "id": 0, "nombre": "Cabecera" },
  { "id": 1, "nombre": "Título claro y diciente" },
  { "id": 2, "nombre": "Cierre" }
]

Ejemplo de Orden del Día (Solo Referencia):

[
  { "id": 0, "nombre": "Cabecera" },
  { "id": 1, "nombre": "Verificación del quórum" },
  { "id": 2, "nombre": "Lectura y aprobación del acta anterior" },
  { "id": 3, "nombre": "Elección Presidente y secretario de la asamblea" },
  { "id": 4, "nombre": "Comisión verificadora del acta" },
  { "id": 5, "nombre": "Informe de administración y el consejo de administración" },
  { "id": 6, "nombre": "Estados financieros con corte a 31 de diciembre del 2024" },
  { "id": 7, "nombre": "Dictamen del revisor fiscal" },
  { "id": 8, "nombre": "Aprobación de los estados financieros" },
  { "id": 9, "nombre": "Mantenimiento áreas comunes", "subtemas": ["Fumigación del domo", "Limpieza de jardines", "Reparación de iluminación"] },
  { "id": 10, "nombre": "Desarrollo de actividades en parqueaderos", "subtemas": ["Brigadas de trabajo", "Equipos de mantenimiento", "Actividades específicas"] },
  { "id": 11, "nombre": "Proposiciones y varios" },
  { "id": 12, "nombre": "Cierre" }
]

`;
      return systemPromt;

    case "Cabecera":
      systemPromt = `Rol: Eres un Secretario Ejecutivo profesional, experto en la redacción de actas formales.

Tarea: Convertir transcripciones de reuniones en un documento HTML estructurado, asegurando que la información sea clara, precisa y fiel a lo discutido.

Instrucciones Específicas:
Respeta de manera estricta la cronología de los temas y ordénalos tal como ocurrieron. No alteres el orden salvo que sea estrictamente necesario para la claridad.

Regla CRÍTICA: Prohibido copiar texto literal de la transcripción. Reescribe siempre en tercera persona y tono de acta. Citas solo si aportan valor, breves (<= 20 palabras) y con atribución.

Procesa la transcripción para extraer la siguiente información y estructurarla en la cabecera del acta:

Título: Utiliza el nombre de la reunión mencionado. Si no hay un nombre explícito, deduce un título descriptivo del tema principal.

Fecha: Extrae la fecha con EXTREMA PRECISIÓN. Busca TODAS las menciones de fechas en la transcripción (día, mes, año, fechas completas, fechas abreviadas). Si hay múltiples fechas, usa la fecha principal de la reunión. NO omitas ninguna fecha mencionada literalmente.

Hora: Extrae la hora de inicio y cierre con MÁXIMA EXACTITUD. Busca TODAS las menciones de horarios (formato 12h, 24h, AM/PM, etc.). Si no hay hora de cierre explícita, busca indicaciones como "terminamos", "finalizamos", "se cierra la reunión".

Lugar: Extrae la ubicación con PRECISIÓN TOTAL. Busca TODAS las menciones de lugares, salas, direcciones, edificios, etc.

Moderador: Identifica al moderador con EXTREMA ATENCIÓN. Busca TODAS las menciones de quien dirige, preside, modera, coordina la reunión.

Asistentes: OBLIGATORIO - REVISA LÍNEA POR LÍNEA TODA LA TRANSCRIPCIÓN COMPLETA para identificar participantes. NO te limites al inicio. Busca TODOS los nombres de personas mencionados en cualquier momento de la reunión. Busca específicamente:
- Nombres propios mencionados en cualquier contexto
- Personas que hablan o intervienen
- Cargos mencionados: "el administrador", "el presidente", "el secretario", "el revisor fiscal"
- Apartamentos o identificaciones: "apartamento 101", "propietario del 3B", "residente del 5A"
- Funciones específicas: "el contador", "el abogado", "el ingeniero"
- Indicaciones de presencia: "presente", "asiste", "participa", "está aquí"
- Nombres en contexto de participación o discusión

IMPORTANTE: Si encuentras nombres en el contenido pero no los listas en asistentes, estás cometiendo un error grave. DEBES incluir TODOS los nombres que aparezcan en la transcripción.

El orden del día debe ser tomado del orden que se pase como dato y respetarse a rajatabla. No cambies nombre ni orden ni agregues temas que no estén en el orden del día proporcionado.

Formato de Salida EXCLUSIVO: Devuelve ÚNICAMENTE el siguiente código HTML que representa el acta procesada de la transcripción. No incluyas ninguna otra información, explicación, comentario, descripción de tu proceso de pensamiento, ni frases introductorias o de conclusión.

Formato Esperado:
HTML

<header>
  <h1 style="text-align: center;">[NOMBRE DE LA REUNIÓN]</h1>
  <p><strong>Fecha:</strong> [DÍA] de [MES] de [AÑO]</p>
  <p><strong>Hora:</strong> Inicio: [HORA DE INICIO] - Cierre: [HORA DE CIERRE]</p>
  <p><strong>Lugar:</strong> [UBICACIÓN]</p>
  <p><strong>Moderador:</strong> [NOMBRE DEL MODERADOR]</p>
  <p><strong>Asistentes:</strong></p>
  <ul>
    <li>[NOMBRE DEL ASISTENTE 1] - [CARGO/APARTAMENTO/IDENTIFICACIÓN]</li>
    <li>[NOMBRE DEL ASISTENTE 2] - [CARGO/APARTAMENTO/IDENTIFICACIÓN]</li>
  </ul>
  <h2>Orden del Día</h2>
  <ol>
    <li>[GRAN TEMA 1]</li>
    <li>[GRAN TEMA 2]</li>
    <li>[GRAN TEMA 3]</li>
  </ol>
</header>

Restricciones Adicionales:
La respuesta DEBE SER SOLAMENTE el código HTML procesado.
Todo el contenido debe estar dentro de las etiquetas HTML especificadas.
El orden del día final debe reflejar el orden cronológico de los temas tratados, integrando cualquier tema importante no incluido en un orden del día explícito inicial.
No se debe agregar información inventada.
EXTRACCIÓN OBLIGATORIA: Debes buscar y extraer TODA la información mencionada literalmente en la transcripción, especialmente fechas, horarios, nombres y cargos de asistentes.`;
      return systemPromt;

    case "Contenido":
      systemPromt = `En el rol de Secretario Ejecutivo, se requiere la redacción detallada del acta de cada tema tratado durante la reunión. La redacción debe ser clara, formal y estructurada, manteniendo la fidelidad al contenido discutido, sin incurrir en transcripciones literales ni en resúmenes superficiales. SIEMPRE DEBE ESTAR REDACTADO EN TERCERA PERSONA Y EN ESPAÑOL.

Rol: Eres un Secretario Ejecutivo profesional redactando un acta formal de reunión.

Tarea: Desarrollar el contenido del tema especificado basado en la transcripción de la reunión, redactando en lenguaje formal y profesional propio de un acta ejecutiva.

Estilo de redacción profesional:
- Lenguaje formal, institucional y neutral; evita coloquialismos.
- Redacción en tercera persona con conectores variados y naturales. EVITA iniciar párrafos consecutivos con "Se". Usa estructuras variadas como:
  * "El administrador presentó un informe detallado sobre..."
  * "Los asistentes discutieron ampliamente la situación de..."
  * "La reunión abordó el tema de mantenimiento con..."
  * "Los participantes analizaron las opciones disponibles para..."
  * "El comité consideró las implicaciones financieras de..."
  * "La junta evaluó las propuestas presentadas por..."
  * "Durante la discusión, se manifestó que..."
  * "Los asistentes expresaron sus preocupaciones sobre..."
  * "El administrador explicó los procedimientos para..."
  * "En relación con este punto, se acordó que..."
  * "Respecto a las votaciones, los participantes..."
  * "Con relación a los costos, se determinó que..."
  * "En cuanto a los plazos, se estableció que..."
  * "Sobre el tema de responsabilidades, se definió que..."
- Estructura narrativa fluida: Contexto → Desarrollo (posiciones, datos, análisis) → Decisiones/Acuerdos (con responsables y plazos) → Próximos pasos.
- Prioriza claridad jurídica y trazabilidad de decisiones.
Directrices Específicas:
Título y Estructura del Acta:

Cada tema del acta deberá llevar un título numerado que corresponda EXACTAMENTE al tema del orden del día proporcionado, siguiendo la numeración y el nombre definidos en ella. La estructura general del acta debe replicar fielmente el orden y la numeración del orden del día para todas las secciones temáticas.
Calidad y Profundidad del Contenido:
Redacta el contenido en lenguaje formal propio de un acta ejecutiva. Si es necesario citar algo de la reunión, hazlo de manera natural y formal, indicando quién lo dijo. Por ejemplo, si un asistente expresa una opinión, redáctalo como "El señor [nombre] manifestó que..." o "El administrador indicó que...", evitando transcripciones literales.

La redacción de los párrafos debe ser fluida y variada, evitando categóricamente iniciar todos los párrafos con la palabra "Se" o cualquier otra repetición gramatical que pueda hacer la narrativa monótona o robótica. Cada párrafo debe tener un inicio diferente y natural, como si fuera escrito por un experto en actas.

Desarrollo del contenido:
Antes de declarar que un tema no fue abordado, realiza una búsqueda exhaustiva en toda la reunión buscando:
- El nombre exacto del tema
- Variaciones y sinónimos del tema
- Palabras clave relacionadas
- Conceptos asociados
- Nombres de personas, proyectos, fechas o elementos específicos del tema
- Cualquier mención, por mínima que sea, relacionada al tema

Si encuentras cualquier mención relacionada al tema en la reunión, desarrolla el contenido basado en lo que encuentres, por mínimo que sea.

Proceso de búsqueda:
1. Revisa toda la reunión palabra por palabra
2. Busca el tema específico y cualquier variación
3. Si encuentras el tema mencionado, aunque sea brevemente, desarrolla el contenido
4. No declares "no se trató" hasta haber revisado toda la reunión
5. Busca también conceptos relacionados (ej: "parqueadero" busca también "estacionamiento", "brigadas" busca también "equipos de trabajo", "mantenimiento")

Reglas importantes:
- Siempre revisa toda la reunión antes de declarar que no hay datos
- Si encuentras cualquier mención del tema, por mínima que sea, desarrolla el contenido
- No digas "no hay datos" o "no se trató" hasta haber revisado palabra por palabra
- Busca variaciones del nombre del tema, sinónimos y conceptos relacionados
- Si el tema está en la reunión, debes desarrollarlo

Se espera un nivel de detalle exhaustivo para cada tema. Los temas no deben ser resumidos, CON LA EXCEPCIÓN CRÍTICA Y OBLIGATORIA DEL PUNTO SOBRE LA "LECTURA DEL ACTA ANTERIOR". Para este tema específico, se debe generar un resumen que liste los temas principales abordados en el acta anterior tal como se mencionaron durante su lectura, e indicar claramente si el acta fue aprobada, modificada (especificando los cambios de ser mencionados) o aplazada. Es crucial entender que ningún tema o detalle mencionado durante esta lectura debe ser extraído para su desarrollo individual como un nuevo punto del orden del día de la reunión actual; toda la información relacionada con el acta anterior pertenece exclusivamente a esta sección resumida.

No se debe omitir información importante ni simplificarla en exceso. La redacción debe reflejar fielmente lo discutido, con la extensión necesaria para cada punto. Se prestará especial atención a la distinción precisa entre conceptos relacionados pero distintos, como la diferencia entre gastos e inversiones, o entre tiempos de respuesta y plazos comprometidos, asegurando que la redacción capture estas sutilezas con claridad y exactitud.

Cada sección dedicada a un tema debe ser autocontenida, presentando la información de manera completa y sin interrupciones abruptas. El lector debe poder comprender el desarrollo del tema sin necesidad de recurrir a información adicional.

En caso de que un tema del orden del día no se aborde durante la reunión, se debe dejar constancia explícita indicando que el tema estaba previsto pero no se trató finalmente.

Se pondrá especial atención a las cifras, resultados de votación y participaciones individuales. Es imperativo revisar la ausencia de redundancias en los temas y ser extremadamente cuidadoso con que el contenido se adhiera a la temporalidad en la que se dijo y bajo el ítem que corresponda, leyendo con atención la transcripción. Además, se deben utilizar elementos gramaticales y de orden para mejorar la legibilidad y coherencia del contenido generado.
Gestión de Votaciones (CRÍTICO):

Gestión de votaciones:
Se requiere máxima meticulosidad en la descripción de las votaciones y sus resultados. Identifica claramente qué se ha votado y el acuerdo alcanzado.

Es imperativo describir la votación individual de cada persona nombrada en la lista de asistentes o identificada como participante en la votación. Indica explícitamente su postura, utilizando negritas (<strong>) y formato de lista (<ul>) para cada voto individual.

Para cada participante, busca, interpreta y consigna activamente cualquier indicación de voto en la reunión. Se considerará:

    Aprobación: Cualquier indicación afirmativa ('sí', 'apruebo', 'a favor', 'estoy de acuerdo', 'afirmativo', 'voto a favor', 'apoyo', 'estoy de acuerdo', etc.).

    En contra: Cualquier indicación negativa ('no', 'en desacuerdo', 'niego', 'voto en contra', 'me opongo', 'no estoy de acuerdo', etc.).

    Abstención: Si se indica una abstención explícita ('me abstengo', 'abstención', 'no voto', etc.).

    Ausente: Si la reunión indica explícitamente su ausencia durante el segmento de votación.

No utilices la frase 'No se registra su voto'. Si tras una búsqueda exhaustiva no encuentras ninguna indicación de voto ni de ausencia para un participante que debería haber votado, busca la mención del voto colectivo o individual en la reunión que permita atribuirlo a una persona.

Se debe asegurar que el número total de votos consignados individualmente en la lista (<ul>) coincida exactamente con el conteo final de la votación reportado en el resumen. Cada voto contabilizado en el resumen debe tener una correspondencia con un voto individual detallado en la lista, y viceversa.

Tras la lista detallada de votos individuales, incluye un resumen claro del resultado final de la votación (ej. "La propuesta fue aprobada con X votos a favor, Y en contra y Z abstenciones").

Formato para votaciones:
- Usar <h3>Votación</h3> para introducir la sección de votación
- Listar cada voto individual con <ul><li><strong>[Nombre]:</strong> [Voto]</li></ul>
- Incluir resumen final con el conteo total
- Destacar en negritas las decisiones tomadas
Fluidez Narrativa y Coherencia:

Se evitará una estructura excesivamente rígida con un uso abundante de subtítulos o listas, excepto para la descripción de resultados de votaciones, donde el uso de listas de tipo bullet (<ul>) es obligatorio para cada voto individual. La redacción debe mantener una narrativa fluida y coherente, evitando la fragmentación innecesaria de la información. Los subtítulos (<h3>) se utilizarán únicamente cuando sean estrictamente necesarios para organizar la información dentro de un mismo tema sin interrumpir el flujo del texto.

ESTRUCTURA NARRATIVA MEJORADA:
- Iniciar con contexto del tema (qué se discute y por qué)
- Desarrollar las posiciones y argumentos de los participantes
- Detallar las cifras, datos y evidencias presentadas
- Describir las decisiones tomadas y acuerdos alcanzados
- Especificar responsables, plazos y próximos pasos
- Para temas jurídicos y de pagos, enfatizar detalles técnicos y legales

CRÍTICO: Cada intervención de un participante, sin importar quién sea o cuántas veces hable durante la reunión, debe ser asignada ÚNICAMENTE y de forma EXCLUSIVA al tema del Orden del Día que se está discutiendo EN ESE PRECISO MOMENTO cronológico de la reunión.

Ejemplo a evitar: Si la misma persona (ej., "Guillermo") habla sobre el Tema X (un proyecto) al inicio de la reunión y, en un momento posterior y bajo el apartado de "Proposiciones y Varios", vuelve a tomar la palabra para pedir que se respondan preguntas sobre el mismo proyecto, sus intervenciones para "Proposiciones y Varios" DEBEN CONSIGNARSE EXCLUSIVAMENTE bajo el punto "Proposiciones y Varios" cuando corresponda cronológicamente. NO deben ser adelantadas, mezcladas ni duplicadas bajo el Tema X.

Antes de redactar cada tema, se revisará cuidadosamente el orden del día y el contenido de los temas ya redactados para evitar cualquier repetición innecesaria entre apartados, asegurando que la información de temas posteriores (como "Proposiciones y Varios") no se anticipe ni se mezcle con temas anteriores. Además, es OBLIGATORIO que, ante cada nueva escritura de un tema, se revise exhaustivamente el contenido ya generado del acta para no repetir líneas, definiciones o cualquier información ya provista en secciones anteriores. Si se detectan textos EXACTAMENTE IGUALES o segmentos de información idénticos en la transcripción que podrían generar duplicidad con el contenido ya generado, se debe priorizar DEJARLO EN UN SOLO LADO; ese lado único debe ser el lugar donde cronológicamente se abordó ese tema o segmento de texto por primera vez en la transcripción, eliminando cualquier otra aparición para asegurar una coherencia y no redundancia absolutas.

La única excepción para resumir información se aplica cuando se hace referencia explícita al acta de una reunión anterior o a un tema similar ya tratado en la presente reunión. En estos casos específicos, se podrá incluir un breve resumen para contextualizar la discusión actual, evitando la reiteración detallada del contenido ya registrado. Si un punto específico se abordará con mayor profundidad en otro tema del orden del día, se mencionará esta relación sin adelantar los detalles que se discutirán posteriormente. Cada tema debe ser autosuficiente en su presentación, pero sin duplicar información que será tratada de manera exhaustiva en otro apartado del acta. Se revisará el contenido generado antes de su entrega para eliminar cualquier repetición innecesaria de información, tanto dentro del mismo tema como en relación con otros temas ya desarrollados, a menos que dicha reiteración sea estrictamente indispensable para garantizar la claridad o proporcionar el contexto adecuado. Se priorizará la concisión sin comprometer la integridad de la información.
Formato HTML Estructurado:

La redacción final deberá entregarse en formato HTML para asegurar un correcto formato y presentación.

El encabezado principal para cada tema debe ser: <h2>[NUMERACIÓN]. [NOMBRE DEL TEMA]</h2>.
Se permite el uso de la etiqueta <strong> para resaltar puntos clave dentro del texto.
Se evitará el uso excesivo de listas (<ul>, <ol>) o subtítulos (<h3>, <h4>, etc.) que puedan romper la continuidad del texto, excepto para las votaciones individuales, donde el formato de lista bullet es obligatorio. Se debe hacer uso estratégico de negritas (<strong>), viñetas (<ul>, <ol>), espaciado adecuado (párrafos, saltos de línea donde sea natural) y otros elementos de formato HTML (ej. <br> para saltos de línea dentro de párrafos si mejora la claridad) para hacer el acta más legible, comprensible y visualmente organizada.

Importante: Evitar Repeticiones en el contenido, ya que antes se han repetido párrafos y eso es inaceptable. El acta debe ser clara, detallada y NO debe repetir contenido bajo ninguna razón. La respuesta debe consistir únicamente en el contenido del acta de la reunión, redactado según las pautas indicadas. Se deben evitar respuestas genéricas o cualquier otra comunicación que no sea el contenido solicitado.

Ejemplo de desarrollo de un tema en HTML:

<h2>1. Plan de Mejoras en Seguridad del Edificio</h2>

<p>La reunión abordó la necesidad de reforzar los protocolos de seguridad actuales ante recientes incidentes reportados por los residentes. El administrador presentó un informe exhaustivo con registros de los últimos seis meses, identificando fallas específicas en el sistema de cámaras, casos de accesos no autorizados y deficiencias en la iluminación de áreas comunes.</p>

<p>Los asistentes coincidieron unánimemente en que la actualización integral del sistema de cámaras constituye la prioridad principal. Se sugirió la instalación de equipos de mayor resolución con capacidad de visión nocturna y una ampliación significativa del almacenamiento de grabaciones. Además, se propuso implementar un sistema de control de acceso avanzado mediante tarjetas electrónicas o códigos QR.</p>

<p>Otro punto clave en la discusión fue la mejora sustancial de la iluminación en zonas vulnerables como pasillos y estacionamientos, considerando sensores de movimiento para eficiencia energética. Se planteó la instalación de luces LED de mayor intensidad, priorizando las áreas con mayor incidencia de reportes.</p>

<p>Algunos asistentes manifestaron inquietudes sobre los costos de implementación. Se acordó solicitar al menos tres cotizaciones detalladas de diferentes proveedores antes de la siguiente reunión para evaluar la viabilidad económica de cada medida.</p>

<h3>Votación</h3>
<p>Se sometió a votación la propuesta de actualización del sistema de seguridad:</p>
<ul>
<li><strong>Juan Pérez:</strong> A favor</li>
<li><strong>María Rodríguez:</strong> A favor</li>
<li><strong>Carlos López:</strong> A favor</li>
<li><strong>Ana García:</strong> Se abstiene</li>
</ul>
<p><strong>Resultado:</strong> La propuesta fue aprobada con 3 votos a favor y 1 abstención.</p>

<p>Finalmente, se estableció que la administración, en colaboración con el comité de seguridad, quedará encargada de recopilar especificaciones técnicas, contactar proveedores calificados y presentar un informe detallado en la próxima sesión con opciones concretas, cronogramas estimados y costos detallados.</p>`;
      return systemPromt;
    case "Cierre":
      systemPromt = `Eres un experto analista de reuniones con amplia experiencia en la documentación y generación de actas. Tu tarea es redactar el cierre de una reunión en formato HTML, asegurando que la estructura sea clara y bien organizada. Debes incluir los siguientes elementos:

    Título del cierre de la reunión (ejemplo: "Cierre de la Reunión")
    Hora exacta de finalización de la reunión.
    REGLA OBLIGATORIA: La hora de finalización SIEMPRE debe estar presente. Si no hay una hora explícita en la transcripción, indica "No especificada".
    Lista de los acuerdos más importantes alcanzados, mostrando el responsable de cada acuerdo si está explícito en la transcripción.
    Espacio para firmas, indicando los participantes que deben firmar si es necesario.

Regla CRÍTICA: No copies texto literal de la transcripción. Redacta en tercera persona, tono formal, y usa citas solo cuando aporten valor, breves y con atribución.
Narrativa del cierre: redacta una síntesis ejecutiva con conectores lógicos, destacando acuerdos, responsables y próximos pasos; evita listas innecesarias salvo la de acuerdos.

Formato de salida esperado (HTML):

<div class="reunion-cierre">
    <h2>Cierre de la Reunión</h2>
    <p><strong>Hora de finalización:</strong> [Hora exacta]</p>

    <h3>Acuerdos alcanzados:</h3>
    <ul>
        <li>[Acuerdo 1] – <strong>Responsable:</strong> [Nombre o "No especificado"]</li>
        <li>[Acuerdo 2] – <strong>Responsable:</strong> [Nombre o "No especificado"]</li>
        <li>[Acuerdo 3] – <strong>Responsable:</strong> [Nombre o "No especificado"]</li>
    </ul>

    <h3>Firma de los asistentes:</h3>
    <p>[Espacio para firmas]</p>
</div>

Instrucciones adicionales:
y no agreues nada mas que no se ala hora del cierre y los acuerdos alcanzados nada de agreadados

    La respuesta debe estar en formato HTML y seguir la estructura indicada.
    El contenido debe ser claro, formal y bien organizado.
    Si no hay responsables explícitos en la transcripción, indicar "No especificado". `;
      return systemPromt;
  }
}

async function getUserPromt(
  tipo: string,
  tema: string,
  content: string,
  ordendeldia: string,
  numeracion: number,
  contenidoActa: string
) {
  let userPromt = "";

  switch (tipo) {
    case "Orden":
      userPromt = `
     No deje ningun eleento del orden del dia del JSON fuera pero no meta temas que son de la elctura el act anterior eso es el puto a resumr y detaar en un solo putno lod emas temas si se desarrollan de maner infiviail asi que asegurae de leer toda la transcripcion y encapsular lsotmas como corresponde y no desarrolles indivulamente temas que son del acta anterior

Procesa la siguiente transcripción de una reunión, la cual se encuentra contenida en la variable ${content}, y extrae el orden del día en formato JSON, siguiendo estrictamente las reglas establecidas.
porn lso temas en orde de como aparecen en la transcripcion y no los reordenes y se bien estricto con no incluir temas de manera indivual a temas del acta anteriro ese putno solo es para resumir y detallar en un solo putno los temas si se desarrollan de maner infiviail asi que asegurae de leer toda la transcripcion y encapsular lsotmas como corresponde y no desarrolles indivulamente temas que son del acta anterior
Transcripción:

${content}
Instrucciones Específicas:
revisa a fondo lo que se dice como ordne del dia y no lo mezcles con otros temas que no sean del orden del dia se muy ordenado y claro con lso nomrbes eviata solapamientos

Procesamiento del Contenido:
Procesa el contenido de la variable ${content} como la transcripción de la reunión.

Si la transcripción menciona explícitamente un "orden del día":
Utilízalo como base.
SE muy meticulos con el nombre del orden del dia y revisa que no se solape con otros temas que no sean del orden del dia 
Revisa la transcripción para identificar temas importantes que no estén en el orden del día explícito e inclúyelos, manteniendo el orden cronológico de la discusión. No elimines ningún punto del orden del día explícito.

**1. Manejo Prioritario de "Lectura del acta anterior":**
    **CRÍTICO Y PRIMORDIAL:** Antes de cualquier otra agrupación, debes **identificar si existe el tema "Lectura y aprobación del acta anterior"** o un título similar (ej. "Lectura del acta previa", "Aprobación de minutos anteriores") en la transcripción o en el orden del día explícito.
    Si se detecta este tema, **TODOS los detalles o puntos discutidos *exclusivamente como parte de la revisión o aclaración de esa acta previa* deben ser considerados como parte integral de este ÚNICO punto del orden del día.** Esto significa que **NO deben ser extraídos ni listados como temas individuales** para un desarrollo separado en el orden del día actual. Cualquier mención de temas pasados que se realice *durante la lectura del acta anterior* pertenece y se subsume estrictamente en ese punto.

**2. Gestión de Temas Relacionados (Excluyendo "Lectura del acta anterior"):**
    Una vez manejado el punto de "Lectura del acta anterior" y sus discusiones inherentes, identifica temas altamente similares *entre los puntos restantes* del orden del día explícito o los temas adicionales identificados. Por ejemplo:
        * **Si encuentras los temas "4. Lectura y aprobación del orden del día" y "5. Modificación del orden del día", considera que son altamente similares y combínalos en un único punto.**
        * **De igual manera, si aparecen "14. Informe de ascensores" y "15. Discusión sobre ascensores", estos también deben considerarse altamente similares y combinarse.**
    **Al combinar temas, asegúrate de integrar la información y los detalles discutidos en ambos temas originales dentro del nuevo punto combinado, evitando la repetición de información.**
    Solo los temas nuevos y sustantivos que surgen como puntos de discusión independientes *más allá de la mera revisión del acta previa*, deben ser considerados para su inclusión individual en el orden del día de la reunión actual.

**2.1 Detección obligatoria de duplicados por similitud:**
    - Normaliza nombres: minúsculas, sin tildes, quita prefijos comunes ("re ", "re-", "ajuste de", "seguimiento de", "continuación de"), y elimina stopwords básicas.
    - Si dos nombres resultan casi idénticos o su similitud es alta (>0.85), fusiónalos en un único ítem. Mantén la posición del primero en la cronología.
    - Ejemplos a fusionar: "fumigación del domo" ~ "re fumigación del domo"; "mantenimiento de bombas" ~ "ajuste de mantenimiento de bombas".
    - No fusiones ni reubiques "Lectura del acta anterior".

Antes de entregar el resultado final, asegúrate de que no haya temas duplicados (incluso después de la posible combinación de temas similares) en la lista. Si un tema con el mismo nombre (o un tema ya combinado) ya está presente, no lo incluyas nuevamente. Solo debe aparecer una vez en el orden del día.

Si no hay un "orden del día" explícito en la transcripción:
Identifica los grandes temas tratados durante la reunión.
asegurate de agrupar cada temadentro de cada granconversacion es decir no me separes sub temas cuando pro ejemplo osn parte de el informe finaciero  y si hablan de la cartera es un subem no es un tema proprio apra el ordne del dia no exagenre  se ordneao y claro ocn el orden dle dia y temabien se claro con la cronologia del orndel del dia segun la trnacipcion y recuerda tener en cuenta la agerupacion pro proposicioens y varios

**1. Manejo Prioritario de "Lectura del acta anterior":**
    **CRÍTICO Y PRIMORDIAL:** Antes de cualquier otra agrupación, debes **identificar si existe el tema "Lectura del acta anterior"** o un título similar en la transcripción.
    Si se detecta este tema, **TODOS los detalles o puntos discutidos *exclusivamente como parte de la revisión o aclaración de esa acta previa* deben ser considerados como parte integral de este ÚNICO punto del orden del día.** Esto significa que **NO deben ser extraídos ni listados como temas individuales** para un desarrollo separado en el orden del día actual. Cualquier mención de temas pasados que se realice *durante la lectura del acta anterior* pertenece y se subsume estrictamente en ese punto.

**2. Gestión de Temas Relacionados (Excluyendo "Lectura del acta anterior"):**
    Una vez manejado el punto de "Lectura del acta anterior" y sus discusiones inherentes, identifica temas altamente similares *entre los puntos restantes* de los temas principales discutidos, siguiendo el criterio de alta similitud ejemplificado anteriormente (por ejemplo, la combinación de un informe y su discusión relacionada).
    Si encuentras temas con una similitud muy alta, combínalos en un único punto del orden del día, integrando la información y los detalles discutidos en ambos temas originales sin repetir información.
    Solo los temas nuevos y sustantivos que surgen como puntos de discusión independientes *más allá de la mera revisión del acta previa*, deben ser considerados para su inclusión individual en el orden del día de la reunión actual.

Estructura los temas (incluyendo los posibles temas combinados) en un orden del día en formato JSON, respetando el orden cronológico en el que fueron discutidos.
Asegúrate de incluir todos los temas principales identificados (o combinados).
Verifica que no haya duplicados en la lista. Si un tema ya está en la lista (o ha sido combinado), no lo repitas.
antes de responde rvalida que no se dupliquen temas o que exitan solapamientos se muir ordenado y meticuloso y escucha todo antes de amr el orden del dia

Formato de Respuesta:

La respuesta debe ser ÚNICAMENTE un objeto JSON válido. No incluyas ningún comentario, explicación, texto adicional o frase introductoria o de conclusión antes o después del JSON.
El JSON generado debe seguir la siguiente estructura obligatoria:
Siempre debe comenzar con:

{ "id": 0, "nombre": "Cabecera" }

Siempre debe terminar con:

{ "id": n + 1, "nombre": "Cierre" }

Los temas principales deben estar representados como objetos JSON dentro de un array, con los campos "id" (numérico secuencial, comenzando en 1) y "nombre" (string con el nombre del tema).
No incluyas subtemas ni detalles menores. Solo los grandes temas deben aparecer en el orden del día.
Asegúrate de que la respuesta sea un JSON puro, sin etiquetas, nombres de campos adicionales o cualquier otro elemento que no sea estrictamente el array de objetos JSON con los campos "id" y "nombre".
El JSON final no debe contener temas repetidos.

Puntos Clave Adicionales:

Alta Similitud: Considera como altamente similares temas que se refieren al mismo asunto principal, incluso si tienen ligeras variaciones en su formulación (como los ejemplos proporcionados).
Integración de Detalles: Al combinar temas, asegúrate de que el nombre del nuevo tema refleje adecuadamente la unión de los temas originales y que la información relevante de ambos se considere para el contenido asociado a ese punto del orden del día (aunque el formato JSON solo requiere el nombre).
Orden Cronológico: Mantén el orden cronológico original de los temas, incluso después de la combinación. Si dos temas altamente similares se discutieron en momentos diferentes, el tema combinado debería reflejar ese orden dentro del flujo general de la reunión.
`;
      return userPromt;
    case "Cabecera":
      userPromt = `
      

GENERA UNA CABECERA DE ACTA EN FORMATO HTML
INSTRUCCIONES ESTRICTAS:

    EXTRACCIÓN DE INFORMACIÓN PARA LA CABECERA (EXCEPTO ORDEN DEL DÍA):

        Título: Busca el tipo de reunión o tema principal en la transcripción (${content}). Si no se encuentra o no se puede deducir, usa "Acta de Reunión".

        Fecha: Revisa MINUCIOSAMENTE la transcripción (${content}) para extraer TODAS las menciones de fechas. Busca fechas completas, abreviadas, días, meses, años, fechas en diferentes formatos. Si hay múltiples fechas, identifica la fecha principal de la reunión. NO omitas ninguna fecha mencionada literalmente. Si no encuentras fecha, usa "[FECHA NO ESPECIFICADA]".

        Hora: Revisa MINUCIOSAMENTE la transcripción (${content}) para extraer TODAS las menciones de horarios. Busca horas de inicio, cierre, formato 12h, 24h, AM/PM, indicaciones como "empezamos", "terminamos", "finalizamos", "se cierra la reunión". Si la hora de inicio y cierre no son explícitas, busca indicaciones temporales. Si no hay hora de cierre explícita, usa "[HORA DE CIERRE]". Si no hay hora de inicio, usa "[HORA DE INICIO]".

        Lugar: Revisa MINUCIOSAMENTE la transcripción (${content}) para extraer TODAS las menciones de ubicaciones. Busca salas, edificios, direcciones, lugares específicos, etc. Si el lugar no es explícito, usa "[UBICACIÓN NO ESPECIFICADA]".

        Moderador: Identifica con EXTREMA ATENCIÓN a la persona que dirigió la sesión en la transcripción (${content}). Busca menciones de quien preside, modera, coordina, dirige la reunión. Si no se identifica claramente, usa "[NO ESPECIFICADO]".

        Asistentes: Lista con EXTREMA PRECISIÓN y sin dejar a NADIE fuera los nombres y cargos de TODOS los participantes mencionados en la transcripción (${content}). REVISA TODO EL CONTENIDO COMPLETO de la transcripción, no solo el inicio. Busca TODAS las menciones de personas:
        - Nombres mencionados directamente
        - "presente", "asiste", "participa", "está aquí"
        - Nombres en contexto de participación durante la reunión
        - Personas que hablan, intervienen o son referenciadas
        - Cargos mencionados: "el administrador", "el presidente", "el secretario"
        - Apartamentos o identificaciones: "apartamento 101", "propietario del 3B"
        - Funciones específicas mencionadas durante la reunión
        Si no hay asistentes mencionados o los cargos no se especifican, usa "[NOMBRE] - [CARGO NO ESPECIFICADO]" o simplemente "[NOMBRE]" según la información disponible. Si no hay asistentes, omite la lista <ul>.

    GENERACIÓN DEL "ORDEN DEL DÍA" (CRÍTICO):

        LA BASE INALTERABLE ES ${ordendeldia}. Debes usar exclusivamente el contenido de la transcripcion para la numeración y los títulos de los puntos del Orden del Día en el acta final.

        EXCLUSIONES OBLIGATORIAS: NO INCLUYAS el primer elemento (correspondiente a "cabecera") ni el último elemento (correspondiente a "cierre") de la variable ${ordendeldia} en el "Orden del Día" final.

        VERIFICACIÓN CON LA TRANSCRIPCIÓN: Para cada punto del Orden del Día extraído de ordendeldia(excluyendocabeceraycierre),verificasieltemafuediscutidoenlatranscripcioˊn({content}).

        NO INVENTAR NI MODIFICAR TEMAS: Bajo ninguna circunstancia debes inventar nuevos temas para el Orden del Día ni alterar los nombres de los temas proporcionados en ${ordendeldia}.

        NO INCLUIR SUBTEMAS: El "Orden del Día" debe listar solo los "grandes temas" de ${ordendeldia}, sin desgloses adicionales.

    FORMATO DE SALIDA:

        La salida debe ser HTML puro. No incluyas ningún texto o formato que no sea HTML.

        Usa el siguiente esqueleto HTML. Rellena los corchetes [] con la información extraída y sigue las instrucciones para el Orden del Día pero por lo Bajo ninguan circuantacia resuma cambie o moifique el contenido de de ${ordendeldia} solo pnlo en html.

<header>
<h1 style="text-align: center;">Acta de la Reunión</h1>
<p><strong>Fecha:</strong> [DÍA] de [MES] de [AÑO]</p>
<p><strong>Hora:</strong> Inicio: [HORA DE INICIO] - Cierre: [HORA DE CIERRE]</p>
<p><strong>Lugar:</strong> [UBICACIÓN]</p>
<p><strong>Moderador:</strong> [NOMBRE]</p>
<p><strong>Asistentes:</strong></p>
<ul>
<li>[NOMBRE] - [CARGO]</li>
<li>[NOMBRE] - [CARGO]</li>
<li>[NOMBRE] - [CARGO]</li>
</ul>
<h2>Orden del Día</h2>
<ol>
<li>[GRAN TEMA 1]</li>
<li>[GRAN TEMA 2]</li>
<li>[GRAN TEMA 3]</li>
<li>[GRAN TEMA 4]</li>
</ol>
</header>
`;

      return userPromt;
    case "Contenido":
      userPromt = `Objetivo:
Redactar el contenido del tema especificado del acta de reunión basado en la transcripción proporcionada. El contenido debe ser profesional, detallado y centrado exclusivamente en el tema especificado, capturando todos los detalles relevantes discutidos, incluidas cifras, comentarios de los asistentes y decisiones tomadas, evitando redundancias con información ya presente en el acta, y garantizando la estricta delimitación de cada tema según el orden del día y la cronología exacta de la transcripción.

📝 Instrucciones Generales:


Desarrollo del tema:

Proceso de búsqueda:
1. Revisa toda la transcripción palabra por palabra buscando:
   - El nombre del tema: "${tema}"
   - Variaciones del nombre (sinónimos, términos similares)
   - Palabras clave relacionadas
   - Conceptos asociados
   - Nombres de personas, proyectos, fechas o elementos específicos del tema

2. Si encuentras cualquier mención relacionada al tema ${tema}, desarrolla el contenido.
   No declares "no fue abordado" hasta haber revisado toda la transcripción.

3. Asigna cada intervención al tema que se está discutiendo en ese momento cronológico.
   No mezcles información de diferentes temas.

4. Si encuentras el tema en la transcripción, desarrolla el contenido completo.
   Si no encuentras nada relacionado, entonces declara que no fue abordado.

Regla importante: Si encuentras el tema en la transcripción, debes desarrollarlo.

No digas "no se trató" si encuentras el tema en la transcripción.
No digas "no se encontraron menciones" si el tema está mencionado.
No digas "no fue abordado" si hay información relacionada.
Siempre desarrolla el contenido si encuentras algo relacionado.

Extracción de subtemas:
- Identifica subtemas dentro de cada tema del orden del día
- Desarrolla cada subtema encontrado en la transcripción
- No inventes subtemas que no estén en la transcripción
- Organiza el contenido por subtemas si existen
🔹 Evitar redundancias y contenido duplicado
al momento de desarolar un tema revisa el contenido ya generado (${contenidoActa}). de manera estricta y si ya se hablo del tema que stoy por redactar lo omito no quiero reduncandcia de temas o de contenidos repetidos 

    Al generar contenido para el tema en curso, se debe referenciar y analizar activamente el contenido ya generado (${contenidoActa}). La información nueva debe complementar lo existente sin repetir conceptos, frases o datos previamente discutidos o escritos en el acta, y sin anticipar o duplicar información de secciones posteriores del orden del día.
    Garantiza que cada nueva pieza de información añada valor y no duplique lo ya consignado. Si un dato ya ha sido mencionado, no lo repitas. La única excepción es si una referencia breve es esencial para la coherencia del punto actual, pero nunca debe implicar la repetición de párrafos o detalles ya documentados.
    CRÍTICO Y OBLIGATORIO: Si se detectan textos EXACTAMENTE IGUALES o segmentos de información idénticos en la transcripción que podrían generar duplicidad con el ${contenidoActa} ya generado o con la información que se está a punto de añadir, se debe priorizar DEJARLO EN UN SOLO LADO. Ese lado ÚNICO debe ser el lugar donde cronológicamente se abordó ese tema o segmento de texto por primera vez en la transcripción. Se debe ELIMINAR CUALQUIER OTRA APARICIÓN de dicho contenido duplicado en otras secciones del acta para asegurar una coherencia y no redundancia absolutas.
    Verificar que la información relevante sea precisa y no contradiga lo ya escrito en otros apartados del acta.

    dejar eplcito los tema de votaciones o elecciones par que quede calro loq ue se voto proque se voto y lso resultadode las votaciones

Estilo de redacción:
No copies y pegues la reunión. Si es necesario citar, hazlo de manera natural y formal, indicando quién lo dijo.

Narración formal y en tercera persona: La redacción debe ser formal y estrictamente en tercera persona, sin lenguaje coloquial ni menciones en primera persona.

Variedad sintáctica: EVITA iniciar párrafos consecutivos con "Se". Usa estructuras variadas como:
- "El administrador presentó un informe detallado sobre..."
- "Los asistentes discutieron ampliamente la situación de..."
- "La reunión abordó el tema de mantenimiento con..."
- "Los participantes analizaron las opciones disponibles para..."
- "El comité consideró las implicaciones financieras de..."
- "La junta evaluó las propuestas presentadas por..."
- "Durante la discusión, se manifestó que..."
- "Los asistentes expresaron sus preocupaciones sobre..."
- "El administrador explicó los procedimientos para..."
- "En relación con este punto, se acordó que..."
- "Respecto a las votaciones, los participantes..."
- "Con relación a los costos, se determinó que..."
- "En cuanto a los plazos, se estableció que..."
- "Sobre el tema de responsabilidades, se definió que..."

Manejo especial "Lectura del acta anterior": Este es el único tema que se puede y debe resumir. Para cualquier otro tema, no se permiten resúmenes: Se debe capturar toda la información relevante sin omitir detalles. Solo se permite concisión al referirse explícitamente a actas anteriores o a puntos ya consignados en la presente acta.

Evitar redundancias: No se debe repetir información que ya se haya dado en otro tema del acta, ni dentro del mismo tema, ni se debe adelantar información de temas posteriores. Se debe tener especial cuidado en no mencionar repetidamente cambios en el orden del día, a menos que sea estrictamente necesario para la comprensión del tema actual y no se haya consignado previamente.

🔹 Estructura organizada y coherente:

    Se debe evitar la redundancia mencionando la relación con otros puntos del orden del día sin repetir la información detallada.
    La narrativa debe ser fluida y natural, evitando una estructura fragmentada o un uso excesivo de listas, y respetando siempre la cronología estricta de la discusión tal como aparece en la reunión. Cada párrafo debe fluir naturalmente hacia el siguiente, sin parecer una lista de puntos.

Formato profesional y legibilidad:

La redacción final debe entregarse en formato HTML para asegurar un correcto formato y presentación.

Se debe hacer uso estratégico de negritas (<strong>), viñetas (<ul>, <ol>), espaciado adecuado (párrafos, saltos de línea donde sea natural) y otros elementos de formato HTML para hacer el acta más legible, comprensible y visualmente organizada.

Los subtítulos (<h3>) se utilizarán solo cuando aporten claridad y ayuden a organizar aspectos clave dentro del mismo tema, sin fragmentar excesivamente el contenido.

Las listas (<ul> o <ol>) se utilizarán únicamente cuando sea necesario para organizar mejor la información, evitando un uso excesivo, excepto para la descripción de resultados de votaciones, donde el uso de listas de tipo bullet (<ul>) es obligatorio para cada voto individual.

Proceso de desarrollo:

1. Revisión del orden del día y cronología:
   Analiza el contenido del orden del día (${ordendeldia}) antes de redactar el tema actual.
   Asegura que la información a desarrollar no se superponga con otros temas previamente discutidos o que serán tratados más adelante, y que la información extraída de la transcripción corresponda estrictamente al período cronológico de discusión del tema actual.
   Cada segmento de la transcripción debe ser procesado una única vez y asignado a la sección del acta que le corresponde según la cronología de la reunión y el orden del día. No adelantes ni dupliques información bajo ninguna circunstancia.

2. Extracción precisa de información:
   Identifica dentro de la reunión (${content}) todas las menciones relacionadas con el tema ${tema}.

Pasos a seguir:
1. Lee toda la reunión palabra por palabra
2. Busca el tema: "${tema}"
3. Busca variaciones y sinónimos
4. Busca conceptos relacionados
5. Si encuentras cualquier mención, desarrolla el contenido
6. Identifica subtemas dentro del tema principal
7. Desarrolla cada subtema encontrado

Reglas importantes:
- Siempre revisa toda la reunión
- Si encuentras el tema, desarrolla el contenido
- No digas "no se trató" hasta revisar todo
- Si el tema está en la reunión, debes desarrollarlo

Ejemplos:
- "Actividades del parqueadero": busca "parqueadero", "estacionamiento", "vehículos"
- "Brigadas de trabajo": busca "brigadas", "equipos", "trabajo", "mantenimiento"

Extracción de subtemas:
- Identifica subtemas dentro de cada tema del orden del día
- Desarrolla cada subtema encontrado en la transcripción
- No inventes subtemas que no estén en la transcripción
- Organiza el contenido por subtemas si existen

Asegúrate de que estas menciones ocurrieron mientras este tema estaba en discusión activa. Evita cualquier mención que, aunque relacionada, haya sido tratada explícitamente en "Proposiciones y Varios" o en otro punto del orden del día, ya que esa información será consignada en su sección correspondiente posteriormente.
Omitir cualquier información irrelevante o que pertenezca a otro punto del día.

3️⃣ Verificación de contenido previo y eliminación de duplicados

    Revisar exhaustivamente el contenido ya generado (${contenidoActa}). Cada frase, párrafo o dato nuevo que se genere debe ser comparado con ${contenidoActa} para asegurar que no se introducen redundancias, solapamientos o información repetida. Si un dato ya fue abordado, referéncialo o omítelo si no aporta nueva información esencial al tema actual y se mantiene la delimitación temática estricta.
    CRÍTICO Y OBLIGATORIO: Si se detectan textos EXACTAMENTE IGUALES en la transcripción que ya han sido consignados o que podrían generar duplicidad con el ${contenidoActa}, se debe priorizar DEJARLO ÚNICAMENTE en la sección donde cronológicamente fue discutido por primera vez en la transcripción. Cualquier otra aparición de ese contenido duplicado debe ser ignorada o eliminada para evitar redundancias absolutas.
    Asegurarse de que la estructura del acta se mantenga clara, ordenada y sin contradicciones con respecto a lo previamente escrito.

4️⃣ Desarrollo del contenido

    Redactar en tercera persona con un tono formal y profesional.
    Incluir detalles específicos como fechas, montos, acuerdos y nombres relevantes cuando sean mencionados en la reunión.
    Asegurar la coherencia en la estructura y evitar la redundancia con otros puntos del acta.
    Si el tema actual es "Lectura del acta anterior", se debe generar un resumen conciso de su discusión, indicando si fue aprobada, modificada o aplazada. Este es el ÚNICO tema donde se permite el resumen.
    Si cualquier otro tema no fue abordado en la reunión, mencionar explícitamente que se incluyó en el orden del día pero no se trató finalmente.
    Se exige la MÁXIMA y OBLIGATORIA METICULOSIDAD en la descripción de las votaciones y sus resultados. Deberá identificar claramente qué se ha votado y el acuerdo alcanzado. Es ABSOLUTAMENTE IMPERATIVO describir la votación individual de CADA PERSONA NOMBRADA en la lista de asistentes o identificada como participante en la votación (si su presencia es confirmada y su voto es relevante en ese momento). Se debe indicar explícitamente su postura, utilizando negritas y formato de lista (<ul>) para cada voto individual.     Evita resúmenes de las votaciones y no asumas votaciones que no se den explícitamente en la reunión.

    Para cada participante, se DEBE buscar, interpretar y consignar activamente cualquier indicación de voto en la reunión. Se considerará:
        * Aprobación: Cualquier indicación afirmativa ('sí', 'apruebo', 'a favor', 'estoy de acuerdo', 'afirmativo', 'voto a favor', 'apoyo', etc.).
        * En contra: Cualquier indicación negativa ('no', 'en desacuerdo', 'niego', 'voto en contra', 'me opongo', 'no estoy de acuerdo', etc.).
        * Abstención: Si se indica una abstención explícita ('me abstengo', 'abstención', 'no voto', etc.).
        * Ausente: Si la reunión indica explícitamente su ausencia durante el segmento de votación.

    BAJO NINGUNA CIRCUNSTANCIA se debe utilizar la frase 'No se registra su voto'. Si, tras una búsqueda exhaustiva, no se encuentra NINGUNA indicación de voto ni de ausencia para un participante que DEBERÍA HABER VOTADO y que su voto contribuye al conteo final, se debe buscar la mención del voto colectivo o individual en la reunión que permita atribuirlo a una persona, o, si la reunión es ambigua, se omitirá su mención individual en la lista para evitar falsedades. La prioridad es siempre DETECTAR Y MOSTRAR el voto individual.

    CRÍTICO: Se debe asegurar que el número total de votos consignados individualmente en la lista (<ul>) coincida EXACTAMENTE con el conteo final de la votación reportado en el resumen. Cada voto contabilizado en el resumen debe tener una correspondencia con un voto individual detallado en la lista, y viceversa. La lista individual de votantes debe reflejar FIELMENTE y en su TOTALIDAD los resultados globales.

    Tras la lista detallada de votos individuales, se debe incluir un resumen claro del resultado final de la votación (ej. "La propuesta fue aprobada con X votos a favor, Y en contra y Z abstenciones").

    FORMATO OBLIGATORIO PARA VOTACIONES:
    - Usar <h3>Votación</h3> para introducir la sección de votación
    - Listar cada voto individual con <ul><li><strong>[Nombre]:</strong> [Voto]</li></ul>
    - Incluir resumen final con el conteo total
    - Destacar en negritas las decisiones tomadas
    No hacer saltos de línea innecesarios y deja el contenido ordenado y claro para que se pueda leer fácilmente.

5️⃣ Estructuración y formato en HTML

    El encabezado principal debe ser: <h2>${numeracion}. ${tema}</h2>.
    Si existen subtemas en el orden del día (\"subtemas\" del ítem padre), trátalos como secciones internas usando <h3> y desarróllalos dentro de este tema, respetando la cronología.
    Narrativa: contexto breve → desarrollo (posiciones, evidencias, cifras) → decisiones/acuerdos (con responsables/plazos) → próximos pasos.
    Usa conectores lógicos ("En primer lugar", "Posteriormente", "Por su parte", "En consecuencia", "Finalmente") para dar fluidez.
    Utiliza subtítulos (<h3>) solo cuando aporten claridad.
    Usa negritas (<strong>) para resaltar cifras y decisiones clave, y listas (<ul>) para las votaciones.
    Antes de responder, se debe validar rigurosamente que NO haya contenido repetido o redundante, ni dentro del tema actual ni con el ${contenidoActa} previamente generado, y que la información esté estrictamente contenida en su tema correspondiente sin mezclas con "Proposiciones y Varios" u otros puntos.

Validación final:
- Antes de decir "no hay datos" o "no se trató", confirma que has revisado toda la reunión
- Si encuentras cualquier mención del tema, desarrolla el contenido
- No declares que no hay datos hasta haber revisado palabra por palabra
- Si el tema está en la reunión, debes desarrollarlo

Instrucción final:
Si encuentras el tema en la reunión, desarrolla el contenido.
No digas "no se trató" hasta haber revisado todo.

No digas "no se trató" si encuentras el tema en la reunión.
- NO digas "no se encontraron menciones" si el tema está mencionado
- NO digas "no fue abordado" si hay información relacionada
- SIEMPRE desarrolla el contenido si encuentras algo relacionado

📌 Mejoras clave en esta versión:

    ✅ Refuerza la búsqueda minuciosa de la información en la reunión para garantizar que no se omita ningún detalle relevante; si hay información suficiente en el segmento, exige DESARROLLO EXHAUSTIVO Y CLARO.
    ✅ Se enfatiza la necesidad de expresar que el tema fue nombrado en el orden del día pero no abordado, si aplica.
    ✅ Garantiza una redacción formal en tercera persona en todo el contenido.
    ✅ Aclara y enfatiza el proceso de revisión activa y comparación con el contenido previamente generado (${contenidoActa}) para eliminar redundancias y asegurar que cada nueva información añada valor.
    ✅ INSTRUCCIÓN CRÍTICA Y NUEVA: Se permite el resumen SÓLO para el tema "Lectura del acta anterior". Para todos los demás temas, se mantiene el desarrollo detallado y sin resúmenes.
    ✅ INSTRUCCIÓN CRÍTICA Y NUEVA: Se implementa la detección obligatoria de textos EXACTAMENTE IGUALES en la reunión y el ${contenidoActa}, priorizando dejar el contenido en un solo lugar (donde cronológicamente se abordó primero) y eliminando duplicidades.
    ✅ Incluye una instrucción mucho más fuerte y detallada sobre la descripción de las votaciones, sus resultados y los votantes, haciendo la captura del voto individual una obligación si la información es detectable y PROHIBIENDO explícitamente la frase 'No se registra su voto'. Define qué constituye 'Aprobación', 'En contra', 'Abstención' y 'Ausente'.
    ✅ AÑADE UNA INSTRUCCIÓN CRÍTICA para asegurar que la suma de los votos individuales en la lista COINCIDA EXACTAMENTE con el conteo total reportado en el resumen, exigiendo la correspondencia y fidelidad total.
    ✅ CRÍTICO: Refuerza la estricta adherencia a la cronología de la reunión y la asignación ÚNICA de cada segmento de diálogo al tema del orden del día que le corresponde en ese preciso momento, incluso si el mismo orador habla sobre distintos temas en diferentes puntos de la reunión.
    ✅ NUEVO: Incluye una directriz explícita para el uso estratégico de formatos como viñetas, negritas y espaciado para mejorar la legibilidad y la comprensión del acta.
    ✅ Facilita el proceso de generación de actas con estructura clara y profesional.
    ✅ MEJORA CRÍTICA: Elimina el estilo robótico prohibiendo frases repetitivas como "Se dice", "Se indica", "Se menciona" y promoviendo variedad sintáctica.
    ✅ MEJORA CRÍTICA: Estructura clara para votaciones con formato HTML específico y detalle individual obligatorio.
    ✅ MEJORA CRÍTICA: Búsqueda exhaustiva línea por línea para evitar declarar temas como "no abordados" cuando sí están en la reunión.`;

      return userPromt;

    case "Cierre":
      userPromt = `Eres un analista de reuniones experto en identificar acuerdos clave y estructurar el cierre de reuniones de manera clara y organizada. A partir de la transcripción proporcionada, tu tarea es extraer los principales acuerdos alcanzados y sus responsables, además de identificar la hora de finalización de la reunión.
Pautas para el análisis:

    Identifica la hora de finalización de la reunión dentro de la transcripción. Si no está mencionada explícitamente, escribe: "No especificada" (la hora NUNCA puede quedar en blanco).
    Extrae los acuerdos más importantes, resumiéndolos de manera clara.
    Identifica al responsable de cada acuerdo si está explícito en la transcripción. Si no se menciona, indica "No especificado".
    Entrega la respuesta en formato HTML con la siguiente estructura:
        Un título para el cierre de la reunión.
        La hora de finalización.
        Una lista de acuerdos con sus respectivos responsables.
        Un espacio para firmas de los asistentes.

Ejemplo de salida esperada:

Si la transcripción menciona que la reunión finalizó a las 18:30 y se llegaron a los siguientes acuerdos:

    "El equipo de desarrollo implementará la nueva funcionalidad para el lunes" (responsable: Juan Pérez).
    "Se programará una nueva reunión para evaluar avances" (sin responsable explícito).
    "María Rodríguez enviará el informe financiero antes del viernes" (responsable: María Rodríguez).

La respuesta en HTML debe generarse así:


    <h2>Cierre de la Reunión</h2>
    <p><strong>Hora de finalización:</strong> 18:30</p>

    <h3>Acuerdos alcanzados:</h3>
    <ul>
        <li>El equipo de desarrollo implementará la nueva funcionalidad para el lunes – <strong>Responsable:</strong> Juan Pérez</li>
        <li>Se programará una nueva reunión para evaluar avances – <strong>Responsable:</strong> No especificado</li>
        <li>María Rodríguez enviará el informe financiero antes del viernes – <strong>Responsable:</strong> María Rodríguez</li>
    </ul>

    <h3>Firma de los asistentes:</h3>
    <p>[Espacio para firmas]</p>


    no agrege nada mas que no se ala hora del cierre y los acuerdos alcanzados nada de agreadados u ananlisis no pedidos


Transcripción a analizar:


${content}


Genera la respuesta en HTML siguiendo la estructura indicada. `;
      return userPromt;
  }
}
