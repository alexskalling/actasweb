"use server";

import { google } from "@ai-sdk/google";
import { generateText } from "ai";
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
    const maxRetriesOrdenDelDia = 5;
    let modelNameOrdenDelDia = "gemini-2.0-flash-thinking-exp-01-21"; // Puedes mantener este modelo inicial

    while (retryCountOrdenDelDia < maxRetriesOrdenDelDia) {
      try {
        responseGeminiOrdenDelDia = await generateText({
          model: google(modelNameOrdenDelDia),
          maxTokens: 100000,
          temperature: 0,
          system: await getSystemPromt("Orden"),
          prompt: await getUserPromt(
            "Orden",
            "Orden",
            contenidoTranscripcion,
            "test",
            0
          ),
        });
        break; // Si la llamada es exitosa, sal del bucle
      } catch (error) {
        console.error(
          `Error al generar el Orden del Día (intento ${
            retryCountOrdenDelDia + 1
          }):`,
          error
        );
        retryCountOrdenDelDia++;
        if (retryCountOrdenDelDia > 1) {
          modelNameOrdenDelDia = "gemini-2.0-flash"; // Mantener el mismo modelo o cambiar si lo prefieres
          console.log("Cambio de modelo (Orden del Día) a gemini-2.0-flash");
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
      socketBackendReal.emit("upload-status", {
        roomName: folder,
        statusData: {
          message: `[Contenido] Orden del dia listo `,
        },
      });
      console.log(ordenDelDiaJSON);
      const contenido = await procesarOrdenDelDia(
        ordenDelDiaJSON,
        folder,
        socketBackendReal,
        contenidoTranscripcion
      );

      const contenidoFormato = contenido
        .replace(/```html/g, "")
        .replace(/html/g, "")
        .replace(/```/g, "")
        .replace(/< lang="es">/g, "")
        .replace(/<\/?>/g, "")
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
  contenidoTranscripcion
) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let contenido = "";

  let index = 0;
  let modelName = "gemini-2.0-flash-thinking-exp-01-21";
  const maxRetries = 5;
  let retryCount = 0;

  for (const tema of ordenDelDiaJSON) {
    console.log(tema);
    if (tema.nombre != "Cabecera" && tema.nombre != "Cierre") {
      socketBackendReal.emit("upload-status", {
        roomName: folder,
        statusData: {
          message: `[Contenido] ${index}/${ordenDelDiaJSON.length - 2}   ${
            tema.nombre
          }   `,
        },
      });
    }
    console.log(index);
    const promptType =
      tema.nombre === "Cabecera"
        ? "Cabecera"
        : tema.nombre === "Cierre"
        ? "Cierre"
        : "Contenido";

    let responseTema;
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        responseTema = await generateText({
          model: google(modelName),
          maxTokens: 100000,
          temperature: 0,
          system: await getSystemPromt(promptType),
          prompt: await getUserPromt(
            promptType,
            tema.nombre,
            contenidoTranscripcion,
            ordenDelDiaJSON,
            index
          ),
        });
        console.log(responseTema.text.trim());
        contenido += responseTema.text.trim();
        break;
      } catch (error) {
        console.error(
          `Error al procesar tema ${tema.nombre} (intento ${retryCount + 1}):` +
            error
        );

        retryCount++;
        if (retryCount > 1) {
          modelName = "gemini-2.0-flash";
          console.log("Cambio de modelo a gemini-2.0-flash");
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

async function getSystemPromt(tipo: string) {
  let systemPromt = "";

  switch (tipo) {
    case "Orden":
      systemPromt = `
Eres un asistente experto en análisis de reuniones. Tu única tarea es procesar transcripciones de reuniones y generar un **orden del día** en formato JSON, siguiendo estrictamente la estructura establecida.

Reglas estrictas:
1. **Solo responde con JSON válido**. No agregues explicaciones, comentarios ni texto adicional antes o después del JSON.
2. **Estructura JSON obligatoria:**  
   - Si hay un "Orden del Día" explícito en la transcripción, respétalo  pero aun asi revisa la trasncipcion por temas improtantes que no se nombren  e incluyelso para aunemtar la calidad del orden del dia.
a   SI EN LA TRASNCRIPCION   dicen un orden del diatomalo como base y  agrega cosas si es que es necesario pero no quites cosas revisa lso grandes temas y  dam ele meojro orden del dia psoible enornde cornologico
   - Si no hay un "Orden del Día", genera uno basado en los grandes temas tratados pero igua asegurate de que no hay  pro qeu si hay debe ser la bse minima de trabajo y creciendo desde ahi, manteniendo el orden cronológico. 
   asegurate de que lso temas seran plasmados en el otrden del dia generado y qeu no vas a cambiar el roden bajo ninguan razon 
   - Siempre debe empezar con { "id": 0, "nombre": "Cabecera" } y terminar con { "id": n + 1, "nombre": "Cierre" }.  
3. **No incluyas subtemas ni detalles menores**. Solo los grandes temas.  
4. **La respuesta debe ser un JSON puro, sin etiquetas, ni nombres adicionales, solo un array de objetos JSON con los id y nombres**.  
5. **Si la transcripción está vacía o no tiene información relevante, responde con:**  
   

[
  { "id": 0, "nombre": "Cabecera" },//obligatorio
  { "id": 1, "nombre": "titulo claro y diciente" },
  { "id": 2, "nombre": "Cierre" }//obligatorio
]

Ejemplo de respuesta correcta ES SOLO REFERENCIAL NO DEBE SER COPIADO:

[
  { "id": 0, "nombre": "Cabecera" },
  { "id": 1, "nombre": "Verificación del quórum" },
  { "id": 2, "nombre": "Lectura y aprobación del orden del día" },
  { "id": 3, "nombre": "Elección Presidente y secretario de la asamblea" },
  { "id": 4, "nombre": "Comisión verificadora del acta" },
  { "id": 5, "nombre": "Informe de administración y el consejo de administración" },
  { "id": 6, "nombre": "Estados financieros con corte a 31 de diciembre del 2024" },
  { "id": 7, "nombre": "Dictamen del revisor fiscal" },
  { "id": 8, "nombre": "Aprobación de los estados financieros" },
  { "id": 9, "nombre": "Proposiciones y varios" },
  { "id": 10, "nombre": "Cierre" }
]
    `;
      return systemPromt;

    case "Cabecera":
      systemPromt = `PROMPT PARA GENERAR ACTA EN FORMATO HTML Eres un Secretario Ejecutivo profesional, experto en la redacción de actas formales. Tu tarea es convertir transcripciones en un documento HTML estructurado, asegurando que la información sea clara y fiel a lo discutido en la reunión.🔹 INSTRUCCIONES
✅ Genera la cabecera del acta con los siguientes datos:

    Título: // debes bsucarn en la trasncipocion si se dice que tipo de reunion es o qua que se ahce alusion pro eleplo reunionde consejo o asablema general.
    Fecha, hora y lugar: Extraer estos datos de la transcripción.
    Asistentes: Listar los nombres y cargos mencionados.
    Moderador o presidente de la reunión: Indicar quién dirigió la sesión.
    Orden del Día:
        Si en la transcripción se menciona un orden del día explícito, usarlo.
        Si no está claro, deducir los grandes temas tratados, sin subtemas ni detalles específicos.

✅ Salida estrictamente en HTML. No incluir texto fuera de etiquetas HTML.
🔹 FORMATO ESPERADO

<header>
  <h1 style="text-align: center;">ACA ira el nomrbe de la reunion que se encuentre en la trnascipcion</h1>//
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

✅ Todo el contenido debe generarse en HTML.
✅ Si el orden del día no está claro en la transcripción, se deben deducir los grandes temas tratados.
✅ Formato limpio, bien estructurado y sin agregar información inventada.`;
      return systemPromt;

    case "Contenido":
      systemPromt = `INSTRUCCIONES PARA EL DESARROLLO DE UN TEMA DEL ACTA EJECUTIVA

Como Secretario Ejecutivo, debes redactar cada tema tratado en la reunión de manera clara, formal y estructurada, asegurando fidelidad al contenido sin caer en transcripciones literales ni en resúmenes superficiales.
🔹 Pautas generales:

titulo: de ser el qeu esta en el tema y debe estar numerado segun el indice que llega como parametro

✅ Calidad y profundidad

    No omitas información relevante ni simplifiques en exceso.
    Asegura que la redacción refleje con fidelidad lo discutido, con la extensión adecuada para cada tema.

✅ Narrativa fluida

    Evita una estructura rígida con demasiados subtítulos o listas excesivas.
    La redacción debe leerse con naturalidad, sin parecer un guion segmentado.
    Usa subtítulos solo cuando realmente ayuden a organizar mejor la información dentro de un mismo tema.

✅ Evitar redundancias y asegurar coherencia

    Antes de desarrollar un tema, revisa el orden del día para asegurarte de que la información no se repite innecesariamente en otros apartados.
    Si un punto se abordará con mayor profundidad en otro tema, menciona la relación sin adelantar detalles.
    Cada tema debe ser autosuficiente, pero sin duplicar información que ya será tratada en otro apartado.

✅ Formato HTML estructurado

    La redacción debe estar en HTML para asegurar un correcto formato.
    Se permite el uso de negritas para resaltar puntos clave.
    Evitar abuso de listas o subtítulos innecesarios que rompan la continuidad del texto.

Ejemplo de desarrollo de un tema en HTML:

<h2>1. Plan de Mejoras en Seguridad del Edificio</h2>

<p>En respuesta a la creciente preocupación de los residentes por recientes incidentes de seguridad, se abordó en la reunión la necesidad de reforzar los protocolos actuales y evaluar soluciones viables. Se presentaron informes sobre la situación actual y se discutieron diversas estrategias de mejora.</p>

<p>El administrador expuso un informe con registros de los últimos seis meses, donde se identificaron fallas en el sistema de cámaras, accesos no autorizados y deficiencias en la iluminación de ciertas áreas comunes. A partir de este diagnóstico, se abrieron las intervenciones para evaluar posibles soluciones.</p>

<p>Los asistentes coincidieron en que la actualización del sistema de cámaras es prioritaria. Se sugirió la instalación de equipos de mayor resolución y una ampliación del almacenamiento de grabaciones. Además, se propuso implementar un sistema de control de acceso mediante tarjetas electrónicas o códigos QR, lo que permitiría un mejor monitoreo de ingresos y salidas.</p>

<p>Otro punto clave en la discusión fue la iluminación de zonas vulnerables, como pasillos y estacionamientos. Se planteó la instalación de luces LED de mayor intensidad, priorizando las áreas con mayor incidencia de reportes.</p>

<p>Si bien las propuestas fueron bien recibidas, algunos asistentes manifestaron inquietudes sobre los costos de implementación. Se acordó solicitar cotizaciones antes de la siguiente reunión para evaluar la viabilidad económica de cada medida.</p>

<p>Finalmente, se estableció que la administración quedará encargada de recopilar la información necesaria y presentar un informe detallado en la próxima sesión, con opciones concretas de proveedores y costos estimados.</p>

Diferencias clave con la versión anterior:

✅ Se especifica revisar el orden del día antes de desarrollar un tema para evitar redundancias entre apartados.
✅ Se mantiene una narrativa fluida sin fragmentar en exceso la información con listas o subtítulos innecesarios.
✅ Cada tema se redacta con la extensión adecuada, sin perder precisión ni caer en transcripciones o resúmenes superficiales.
identifica bien los temas  no es lo mismo hablar de gastos que de inversion, o de tiempos de respuesta a plazos compromentidos 

`;
      return systemPromt;
    case "Cierre":
      systemPromt = `Eres un experto analista de reuniones con amplia experiencia en la documentación y generación de actas. Tu tarea es redactar el cierre de una reunión en formato HTML, asegurando que la estructura sea clara y bien organizada. Debes incluir los siguientes elementos:

    Título del cierre de la reunión (ejemplo: "Cierre de la Reunión")
    Hora exacta de finalización de la reunión.
    Lista de los acuerdos más importantes alcanzados, mostrando el responsable de cada acuerdo si está explícito en la transcripción.
    Espacio para firmas, indicando los participantes que deben firmar si es necesario.

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
  numeracion: number
) {
  let userPromt = "";

  switch (tipo) {
    case "Orden":
      userPromt = `Procesa la siguiente transcripción de una reunión y extrae el orden del día en formato JSON.  

Transcripción:  

"""  
${content}  
"""  

Recuerda:  
- Si la transcripción menciona un "orden del día", respétalo.  
- Si no, identifica los grandes temas tratados y estructúralos en JSON.  
- No agregues comentarios ni explicaciones, solo responde con JSON válido.
-respeta la estructura del json sin agregar eqitquetas ni nada que no sea pedido  

    `;
      return userPromt;
    case "Cabecera":
      userPromt = `INSTRUCCIONES DEFINITIVAS PARA GENERAR ACTAS EJECUTIVAS PROFESIONALES
ENTRADA OBLIGATORIA:

✅ TRANSCRIPCIÓN COMPLETA Y DETALLADA:
Utiliza la transcripción proporcionada como única fuente de información. No inventes ni agregues datos que no estén en la transcripción. La precisión y claridad del acta dependerán directamente de la calidad de la transcripción de entrada.
GENERACIÓN DE LA CABECERA:

La cabecera del acta debe contener los siguientes elementos:

    Título: Busca en la transcripción si se menciona el tipo de reunión o el tema principal.si no se dice uno o no se sume ninguno por "acta de reunion
    Fecha, hora y lugar: Extrae esta información de la transcripción.
    Moderador o presidente: Identifica quién dirigió la sesión.
    Asistentes: Lista los nombres y cargos de quienes participaron.
    Orden del Día:
        Si se menciona un orden del día en la transcripción, usarlo.
        Si no está explícito, analizar la transcripción y deducir los grandes temas tratados, sin subtemas ni detalles excesivos.

FORMATO DE SALIDA (SOLO HTML):

<header>
  <h1 style="text-align: center;">Acta de la Reunión</h1>// recuerda bsucar en la transcriopcion se se dice que tipo de reunion es y eso usarloc omo titulo
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

REGLAS ESTRICTAS:

✅ Salida en HTML puro. No responder en texto plano ni en otro formato.
✅ No inventar datos. Si falta información clave, dejar un espacio vacío o indicar "[NO ESPECIFICADO]".
✅ El "Orden del Día" debe derivarse de los grandes temas de la transcripción si no está explícito.
✅ No incluir subtemas en el orden del día.
TRANSCRIPCIÓN:

${content} `;
      return userPromt;
    case "Contenido":
      userPromt = `INSTRUCCIONES DEFINITIVAS PARA GENERAR ACTAS EJECUTIVAS PROFESIONALES
📌 Objetivo:

Generar un acta de reunión profesional y detallada basada en la transcripción de la reunión. El contenido debe centrarse exclusivamente en el tema especificado, capturando todos los detalles relevantes discutidos, incluidas cifras, comentarios de los asistentes y decisiones tomadas, evitando redundancias innecesarias.
📝 Instrucciones Generales:
🔹 Enfoque preciso en el tema

    Se debe extraer y desarrollar contenido exclusivamente relacionado con el tema ${tema}, sin incluir información que pertenezca a otros puntos del orden del día.
    Antes de desarrollar el contenido, se debe revisar el orden del día ${ordendeldia} para asegurarse de que el tema en cuestión no se solape con otros puntos.
    ten en cuanta los comentarios de los asistente y de ser posibles integralso  comonaraccion dentro de lso contenidos
    Trata


    Numeracion del tema:${numeracion}
    Nombre del tema:${tema}
    los valors anteeriores se deben respetar y se deben poner como titulo de cada desarrollo del tema

🔹 Estilo de redacción

identifica bien los temas  no es lo mismo hablar de gastos que de inversion, o de tiempos de respuesta a plazos compromentidos quiero que tomes el tema  como base a respetar para buscar contenido
✅ Narración formal y en tercera persona: No debe haber lenguaje coloquial ni menciones en primera persona.
✅ No se permiten resúmenes: Se debe capturar toda la información relevante sin omitir detalles. Solo se permite concisión al referirse a actas anteriores.
La redaccion debe estar de manera estrica en modo de terceera persona y no se debe repetir informacion que ya se dio en otro tema
ten cuidado con ser muy redundate con el tema de lso cambios en el orden de dia apra no esta  a cada rato mencionando que se cambio el orden del dia
✅ Estructura organizada y coherente:

    Evitar redundancias: Si un aspecto se desarrollará en otro punto del orden del día, se menciona la relación sin repetir información.
    Fluidez narrativa: Evitar una estructura fragmentada o con exceso de listas que le resten naturalidad al acta.

🔹 Formato profesional y estructurado

✅ Negritas para resaltar cifras y decisiones clave.
✅ Subtítulos solo cuando aporten claridad: No deben fragmentar en exceso el contenido.
✅ Listas únicamente cuando sea necesario: No abusar de ellas para evitar un formato de "lista de supermercado".
🔎 Proceso de Desarrollo
1️⃣ Revisión del orden del día

    Analizar el contenido del orden del día (${ordendeldia}) antes de redactar.
    Asegurar que la información no se superponga con otros temas previamente discutidos o que serán tratados más adelante.

2️⃣ Extracción precisa de información

    Identificar dentro de la transcripción ${content} todas las menciones y detalles relacionados exclusivamente con el tema ${tema}.
    Omitir cualquier información irrelevante o que pertenezca a otro punto del orden del día.

3️⃣ Desarrollo del contenido

    Redactar en tercera persona con un tono formal y profesional.
    Incluir detalles específicos como fechas, montos, acuerdos y nombres relevantes cuando sean mencionados.
    Asegurar coherencia en la estructura y evitar redundancias con otros puntos del acta.

4️⃣ Estructuración y formato en HTML

    Encabezado principal: <h2>${numeracion}. ${tema}</h2> debe tener el valor de ${numeracion}. y del ${tema}
    Subtítulos: <h3> solo para separar aspectos clave del mismo tema.
    Negritas: Para cifras, decisiones clave y puntos de relevancia.
    Listas: Solo cuando ayuden a organizar mejor la información sin fragmentarla innecesariamente.
    resalta  en bullets los resultados de las votaciones 

Ejemplo de Acta Generada

Tema: Mantenimiento de Instalaciones

<h2> 1. Fiananzas</h2>//la  y el nombre del tema y el indice

<p>Durante la reunión del 19 de febrero de 2025, se abordó el estado del mantenimiento de las instalaciones, centrándose en los problemas recurrentes en el sistema eléctrico y el drenaje. Se destacaron las preocupaciones de los asistentes sobre las fallas reportadas.</p>

<h3>Diagnóstico de Problemas</h3>

<p>El equipo de mantenimiento presentó un informe con las siguientes áreas críticas:</p>

<ul>
    <li><strong>Sistema eléctrico:</strong> Se registraron fallos intermitentes en la iluminación, principalmente en los pasillos principales, con <strong>5 incidentes en enero</strong>, afectando la seguridad de los residentes.</li>
    <li><strong>Sistema de drenaje:</strong> Bloqueos recurrentes causaron <strong>inundaciones menores en el sótano</strong> en varias ocasiones durante el último trimestre.</li>
</ul>

<h3>Medidas Aprobadas</h3>

<p>Tras la evaluación, se aprobaron las siguientes acciones:</p>

<ul>
    <li><strong>Contratación de especialistas:</strong> Se asignó un presupuesto de <strong>$2,500</strong> para un diagnóstico integral de los sistemas afectados.</li>
    <li><strong>Reparaciones inmediatas:</strong> Se destinarán <strong>$1,500</strong> para solucionar fallos eléctricos urgentes.</li>
</ul>

<h3>Conclusiones</h3>

<p>Se aprobó la contratación de expertos y la ejecución de reparaciones prioritarias. Adicionalmente, se implementará un <strong>plan de mantenimiento preventivo</strong> con un presupuesto anual específico.</p>

📌 Mejoras clave en esta versión:

✅ Se incorpora la revisión del orden del día (${ordendeldia}) antes de desarrollar un tema, evitando solapamientos o redundancias.
asegurate que elos titulo s de cada tema tengan  los  valores  de numeracion ${numeracion}  y tema ${tema} que se reciben 
✅ Se enfatiza la necesidad de una narrativa fluida, sin abuso de subtítulos o listas que interrumpan la lectura natural.
✅ Se mantiene un balance entre claridad y estructura, asegurando una redacción profesional sin fragmentaciones innecesarias.
✅ Se detalla el proceso paso a paso, facilitando la generación de actas más organizadas y precisas.
asegurate que todo el contenido si o si este en tercera persona y que no se repita informacion que ya se dio en otro tema`;
      return userPromt;

    case "Cierre":
      userPromt = `Eres un analista de reuniones experto en identificar acuerdos clave y estructurar el cierre de reuniones de manera clara y organizada. A partir de la transcripción proporcionada, tu tarea es extraer los principales acuerdos alcanzados y sus responsables, además de identificar la hora de finalización de la reunión si está explícita en el texto.
Pautas para el análisis:

    Identifica la hora de finalización de la reunión dentro de la transcripción. Si no está mencionada, déjala vacía.
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


Transcripción a analizar:


${content}


Genera la respuesta en HTML siguiendo la estructura indicada. `;
      return userPromt;
  }
}
