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
    const maxRetriesOrdenDelDia = 3;
    let modelNameOrdenDelDia = "gemini-2.0-flash"; // Puedes mantener este modelo inicial

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
            0,
            ""
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
          modelNameOrdenDelDia = "gemini-2.0-flash-lite"; // Mantener el mismo modelo o cambiar si lo prefieres
          console.log("Cambio de modelo (Orden del Día) a gemini-2.0-flash-lite");
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
        .replace(/HTML/g, "")
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
  let modelName = "gemini-2.0-flash";
  const maxRetries = 3;
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
            index,
            contenido
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
          modelName = "gemini-2.0-flash-lite";
          console.log("Cambio de modelo a gemini-2.0-flash-lite");
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
      systemPromt = `Procesar transcripciones de reuniones y generar un orden del día en formato JSON.
Instrucciones Específicas:

Formato de Respuesta: Responde únicamente con un objeto JSON válido. No incluyas texto adicional, explicaciones o comentarios antes o después del JSON.

Estructura del Orden del Día (JSON):

Si la transcripción contiene un "Orden del Día" explícito:
    Tómalo como base.
    Revisa la transcripción para identificar temas importantes que no estén en el orden del día explícito.
    Incluye estos temas adicionales en el orden del día generado.
    No elimines ningún punto del orden del día explícito.
    **Identifica temas altamente similares dentro del orden del día explícito o entre los puntos añadidos y el orden del día explícito (por ejemplo, "Lectura y aprobación del orden del día" y "Modificación del orden del día", o "Informe de ascensores" y "Discusión sobre ascensores"). Si encuentras temas con una similitud muy alta, combínalos en un único punto del orden del día. Asegúrate de integrar la información y los detalles discutidos en ambos temas originales dentro del nuevo punto combinado, evitando la repetición de información.**
    Asegúrate de que el orden del día generado refleje el orden cronológico de los temas tratados en la transcripción.
    Antes de entregar el resultado final, asegúrate de que no haya temas duplicados en la lista. Si un tema con el mismo nombre (o un tema ya combinado) ya está presente, no lo incluyas nuevamente. Solo debe aparecer una vez en el orden del día.

Si la transcripción no contiene un "Orden del Día" explícito:
    Genera un orden del día basado en los temas principales discutidos en la transcripción.
    **Identifica temas altamente similares entre los temas identificados (siguiendo el mismo criterio de alta similitud ejemplificado anteriormente). Si encuentras temas con una similitud muy alta, combínalos en un único punto del orden del día, integrando la información y los detalles discutidos en ambos temas originales sin repetir información.**
    Asegúrate de incluir todos los temas principales identificados (o combinados).
    Mantén el orden cronológico en el que los temas fueron tratados.
    Antes de entregar el resultado final, verifica que no haya duplicados en la lista. Si un tema ya está en la lista (o ha sido combinado), no lo repitas.

Elementos Obligatorios:

El JSON siempre debe comenzar con:

{ "id": 0, "nombre": "Cabecera" }

Y finalizar con:

{ "id": n + 1, "nombre": "Cierre" }

Nivel de Detalle:

Incluye solo los temas principales. No incluyas subtemas o detalles menores.

Formato JSON Preciso:

La respuesta debe ser un array de objetos JSON con los campos "id" (numérico secuencial, comenzando en 0) y "nombre" (string con el nombre del tema).
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
      systemPromt = `Rol: Eres un Secretario Ejecutivo profesional, experto en la redacción de actas formales.

Tarea: Convertir transcripciones de reuniones en un documento HTML estructurado, asegurando que la información sea clara, precisa y fiel a lo discutido.

Instrucciones Específicas:

    Procesa la transcripción para extraer la siguiente información y estructurarla en la cabecera del acta:
        Título: Utiliza el nombre de la reunión mencionado. Si no hay un nombre explícito, deduce un título descriptivo del tema principal.
        Fecha: Extrae la fecha.
        Hora: Extrae la hora de inicio y cierre.
        Lugar: Extrae la ubicación.
        Moderador: Identifica al moderador.
        Asistentes: Lista los nombres y cargos.

    Genera la sección del Orden del Día a partir de la transcripción:
        Si la transcripción incluye un orden del día explícito:
            Utilízalo como base.
            Analiza la transcripción en busca de otros grandes temas importantes que se hayan discutido pero que no estén incluidos en el orden del día explícito.
            Integra estos temas adicionales en el orden del día generado, ubicándolos en la secuencia que mejor se ajuste al orden cronológico en que fueron tratados durante la reunión. El objetivo es generar un orden del día final completo y cronológicamente coherente.
        Si la transcripción no incluye un orden del día explícito:
            Deduce los temas principales tratados durante la reunión y ordénalos cronológicamente.

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
    <li>[NOMBRE DEL ASISTENTE 1] - [CARGO DEL ASISTENTE 1]</li>
    <li>[NOMBRE DEL ASISTENTE 2] - [CARGO DEL ASISTENTE 2]</li>
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
    No se debe agregar información inventada.`;
      return systemPromt;

    case "Contenido":
      systemPromt = `En el rol de Secretario Ejecutivo, se requiere la redacción detallada del acta de cada tema tratado durante la reunión. La redacción debe ser clara, formal y estructurada, manteniendo la fidelidad al contenido discutido, sin incurrir en transcripciones literales ni en resúmenes superficiales. SIEMPRE DEBE ESTAR REDACTADO EN TERCERA PERSONA Y EN ESPAÑOL.

Directrices Específicas:

    Título:

    Cada tema del acta deberá llevar un título numerado que corresponda exactamente al tema del orden del día, siguiendo la numeración proporcionada en el índice.

    Calidad y Profundidad del Contenido:
        Se espera un nivel de detalle exhaustivo para cada tema, asegurando la inclusión de todos los aspectos relevantes de la discusión. Los temas no deben ser resumidos.
        No se debe omitir información importante ni simplificarla en exceso.
        La redacción debe reflejar fielmente lo discutido, con la extensión necesaria para cada punto.
        Se prestará especial atención a la distinción precisa entre conceptos relacionados pero distintos, como la diferencia entre gastos e inversiones, o entre tiempos de respuesta y plazos comprometidos, asegurando que la redacción capture estas sutilezas con claridad y exactitud.
        Cada sección dedicada a un tema debe ser autocontenida, presentando la información de manera completa y sin interrupciones abruptas. El lector debe poder comprender el desarrollo del tema sin necesidad de recurrir a información adicional.
        En caso de que un tema del orden del día no se aborde durante la reunión, se debe dejar constancia explícita indicando que el tema estaba previsto pero no se trató finalmente.

    Fluidez Narrativa:
        Se evitará una estructura excesivamente rígida con un uso abundante de subtítulos o listas.
        La redacción debe mantener una narrativa fluida y coherente, evitando la fragmentación innecesaria de la información mediante listas o subtítulos que interrumpan el flujo del texto. Los subtítulos se utilizarán únicamente cuando sean estrictamente necesarios para organizar la información dentro de un mismo tema.

    Coherencia y Evitación de Redundancias:
        Antes de redactar cada tema, se revisará cuidadosamente el orden del día y el contenido de los temas ya redactados para evitar cualquier repetición innecesaria entre apartados.
        La única excepción para resumir información se aplica cuando se hace referencia explícita al acta de una reunión anterior o a un tema similar ya tratado en la presente reunión. En estos casos específicos, se podrá incluir un breve resumen para contextualizar la discusión actual, evitando la reiteración detallada del contenido ya registrado.
        Si un punto específico se abordará con mayor profundidad en otro tema del orden del día, se mencionará esta relación sin adelantar los detalles que se discutirán posteriormente.
        Cada tema debe ser autosuficiente en su presentación, pero sin duplicar información que será tratada de manera exhaustiva en otro apartado del acta.
        Se revisará el contenido generado antes de su entrega para eliminar cualquier repetición innecesaria de información, tanto dentro del mismo tema como en relación con otros temas ya desarrollados, a menos que dicha reiteración sea estrictamente indispensable para garantizar la claridad o proporcionar el contexto adecuado. Se priorizará la concisión sin comprometer la integridad de la información.

    Formato HTML Estructurado:
        La redacción final deberá entregarse en formato HTML para asegurar un correcto formato y presentación.
        Se permite el uso de la etiqueta <b> para resaltar puntos clave dentro del texto.
        Se evitará el uso excesivo de listas (<ul>, <ol>) o subtítulos (<h3>, <h4>, etc.) que puedan romper la continuidad del texto.

Importante: Evitar Repeticiones en el contenido, ya antes me repites parrafos y eso esta mal quieroq eu sea claro detallado y que NO repitas contenido bajo ninguna  razon

Se insiste en la importancia de no repetir párrafos ni contenido ya presentado. La respuesta debe consistir únicamente en el contenido del acta de la reunión, redactado según las pautas indicadas. Se deben evitar respuestas genéricas como "Perfecto, ahora generaré el acta de la reunión" o cualquier otra comunicación que no sea el contenido solicitado.
Ejemplo de desarrollo de un tema en HTML:

<h2>1. Plan de Mejoras en Seguridad del Edificio</h2>

<p>En respuesta a la creciente preocupación de los residentes por recientes incidentes de seguridad, se abordó en la reunión la necesidad de reforzar los protocolos actuales y evaluar soluciones viables. Se presentaron informes detallados sobre la situación actual, incluyendo estadísticas de incidentes y análisis de vulnerabilidades, y se discutieron diversas estrategias de mejora con un enfoque en la prevención y la respuesta efectiva.</p>

<p>El administrador expuso un informe exhaustivo con registros de los últimos seis meses, donde se identificaron fallas específicas en el sistema de cámaras (detallando modelos y ubicaciones problemáticas), casos de accesos no autorizados (con fechas y descripciones) y deficiencias en la iluminación de ciertas áreas comunes (especificando ubicaciones y niveles de iluminación actuales). A partir de este diagnóstico detallado, se abrieron las intervenciones para evaluar posibles soluciones concretas.</p>

<p>Los asistentes coincidieron unánimemente en que la actualización integral del sistema de cámaras es prioritaria. Se sugirió la instalación de equipos de mayor resolución (con especificaciones técnicas como megapíxeles y capacidad de visión nocturna) y una ampliación significativa del almacenamiento de grabaciones (indicando el tiempo de retención deseado). Además, se propuso implementar un sistema de control de acceso avanzado mediante tarjetas electrónicas o códigos QR, detallando los beneficios en términos de seguridad y trazabilidad de ingresos y salidas.</p>

<p>Otro punto clave en la discusión fue la mejora sustancial de la iluminación de zonas vulnerables, como pasillos (especificando los niveles de lux recomendados) y estacionamientos (considerando sensores de movimiento para eficiencia energética y seguridad). Se planteó la instalación de luces LED de mayor intensidad (indicando lúmenes y temperatura de color), priorizando las áreas con mayor incidencia de reportes y aquellas identificadas como puntos ciegos.</p>

<p>Si bien las propuestas fueron bien recibidas por la mayoría, algunos asistentes manifestaron inquietudes específicas sobre los costos detallados de implementación de cada medida. Se acordó solicitar al menos tres cotizaciones detalladas de diferentes proveedores antes de la siguiente reunión para evaluar la viabilidad económica de cada medida con datos concretos y poder tomar decisiones informadas.</p>

<p>Finalmente, se estableció que la administración, en colaboración con el comité de seguridad, quedará encargada de recopilar la información necesaria (especificaciones técnicas de equipos, planos de instalación y requisitos de software), contactar a proveedores calificados y presentar un informe detallado en la próxima sesión, con opciones concretas de proveedores, cronogramas estimados de implementación y costos detallados para cada solución propuesta.</p>

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
  numeracion: number,
  contenidoActa: string
) {
  let userPromt = "";

  switch (tipo) {
    case "Orden":
      userPromt = `Claro, aquí tienes el prompt con los ejemplos integrados dentro de las instrucciones:

Procesa la siguiente transcripción de una reunión, la cual se encuentra contenida en la variable ${content}, y extrae el orden del día en formato JSON, siguiendo estrictamente las reglas establecidas.

Transcripción:

${content}
Instrucciones Específicas:

Procesamiento del Contenido:
    Procesa el contenido de la variable ${content} como la transcripción de la reunión.

Si la transcripción menciona explícitamente un "orden del día":
    Utilízalo como base.
    Revisa la transcripción para identificar temas importantes que no estén en el orden del día explícito e inclúyelos, manteniendo el orden cronológico de la discusión. No elimines ningún punto del orden del día explícito.
    **Identifica temas altamente similares dentro del orden del día explícito o entre los puntos añadidos y el orden del día explícito. Por ejemplo:**
        * **Si encuentras los temas "4. Lectura y aprobación del orden del día" y "5. Modificación del orden del día", considera que son altamente similares y combínalos en un único punto.**
        * **De igual manera, si aparecen "14. Informe de ascensores" y "15. Discusión sobre ascensores", estos también deben considerarse altamente similares y combinarse.**
    **Al combinar temas, asegúrate de integrar la información y los detalles discutidos en ambos temas originales dentro del nuevo punto combinado, evitando la repetición de información.**
    Antes de entregar el resultado final, asegúrate de que no haya temas duplicados (incluso después de la posible combinación de temas similares) en la lista. Si un tema con el mismo nombre (o un tema ya combinado) ya está presente, no lo incluyas nuevamente. Solo debe aparecer una vez en el orden del día.

Si no hay un "orden del día" explícito en la transcripción:
    Identifica los grandes temas tratados durante la reunión.
    **Identifica temas altamente similares entre los temas identificados, siguiendo el criterio de alta similitud ejemplificado anteriormente (por ejemplo, la combinación de un informe y su discusión relacionada). Si encuentras temas con una similitud muy alta, combínalos en un único punto del orden del día, integrando la información y los detalles discutidos en ambos temas originales sin repetir información.**
    Estructura los temas (incluyendo los posibles temas combinados) en un orden del día en formato JSON, respetando el orden cronológico en el que fueron discutidos.
    Asegúrate de incluir todos los temas principales identificados (o combinados).
    Verifica que no haya duplicados en la lista. Si un tema ya está en la lista (o ha sido combinado), no lo repitas.

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
      userPromt = `INSTRUCCIONES DEFINITIVAS PARA GENERAR ACTAS EJECUTIVAS PROFESIONALES

ENTRADA OBLIGATORIA:

✅ TRANSCRIPCIÓN COMPLETA Y DETALLADA:
Utiliza la transcripción proporcionada en la variable ${content} como única fuente de información sobre los temas discutidos. No inventes ni agregues datos que no estén en la transcripción. La precisión y claridad del acta dependerán directamente de la calidad de la transcripción de entrada.

✅ ORDEN DEL DÍA DE REFERENCIA y base que no se debe modificar a menso de que sea estricatamente necesario:
Considera el orden del día proporcionado en la variable ${ordendeldia} como una guía o un borrador inicial. Este orden del día debe ser revisado y comparado con los temas que surjan directamente de la transcripción para generar el orden del día final.

GENERACIÓN DE LA CABECERA:

La cabecera del acta debe contener los siguientes elementos, extraídos de la transcripción (${content}):

* **Título:** Busca en la transcripción si se menciona el tipo de reunión o el tema principal. Si no se indica explícitamente o no se puede deducir, utiliza "Acta de Reunión" como título.
* **Fecha, hora y lugar:** Extrae esta información directamente de la transcripción.
* **Moderador o presidente:** Identifica quién dirigió la sesión, basándote en la transcripción.
* **Asistentes:** Lista los nombres y cargos de quienes participaron, según se mencionan en la transcripción.
* **Orden del Día:**
    * **Revisa el orden del día proporcionado en la variable ${ordendeldia} esta debe se tu base a  poner el el contendio del orden de dia.**
    * **Analiza la transcripción (${content}) para identificar los grandes temas tratados.**
    * * el orden y los nombres deben ser los del${ordendeldia} y los temas identificados en la transcripción para generar el orden del día final.** Asegúrate de que este orden del día refleje con precisión los grandes temas discutidos en la reunión.

FORMATO DE SALIDA (SOLO HTML):
HTML

<header>
  <h1 style="text-align: center;">Acta de la Reunión</h1><p><strong>Fecha:</strong> [DÍA] de [MES] de [AÑO]</p>
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

✅ ORDEN DEL DÍA FINAL: El orden del día final para el acta se generará combinando y revisando el contenido de la variable ${ordendeldia} y los temas identificados en la transcripción (${content}), asegurando que los temas se presenten en orden cronológico según la discusión en la transcripción.

✅ Salida en HTML puro. No responder en texto plano ni en otro formato.
✅ No inventar datos. Si falta información clave, dejar un espacio vacío o indicar "[NO ESPECIFICADO]".
✅ El "Orden del Día" debe tomar comobase casi oblicgatoria el ${ordendeldia}.
✅ No incluir subtemas en el orden del día.`;
      return userPromt;
    case "Contenido":
      userPromt = `📝 INSTRUCCIONES DEFINITIVAS PARA GENERAR ACTAS EJECUTIVAS PROFESIONALES
📌 Objetivo:

Generar un acta de reunión profesional y detallada basada en la transcripción de la reunión. El contenido debe centrarse exclusivamente en el tema especificado, capturando todos los detalles relevantes discutidos, incluidas cifras, comentarios de los asistentes y decisiones tomadas, evitando redundancias innecesarias.
📝 Instrucciones Generales:

🔹 Enfoque preciso en el tema

    Se debe extraer y desarrollar contenido exclusivamente relacionado con el tema ${tema}, sin incluir información que pertenezca a otros puntos del orden del día.
    Antes de desarrollar el contenido, se debe revisar el orden del día ${ordendeldia} para asegurarse de que el tema en cuestión no se solape con otros puntos.
    Se debe realizar una búsqueda exhaustiva y minuciosa dentro de la transcripción para encontrar todos los detalles específicos relacionados con el tema ${tema}.
    En caso de no encontrar información relevante, se debe expresar claramente que el tema fue nombrado en el orden del día pero no fue abordado durante el desarrollo de la reunión.
    Se deben integrar los comentarios de los asistentes en la narración del contenido, cuando sea pertinente y aporte valor al acta.
    El desarrollo del tema debe estar encabezado por la numeración ${numeracion} y el nombre del tema ${tema}.

🔹 Evitar redundancias y contenido duplicado

    A medida que se genera contenido nuevo basado en el tema en curso, se debe revisar el contenido previamente generado ${contenidoActa} para evitar solapamientos, redundancias o información repetida.
    Se debe garantizar que el contenido generado esté claro y ordenado, evitando repeticiones o superposiciones con temas previamente desarrollados.
    Verificar que la información relevante sea precisa y no contradiga lo ya escrito en otros apartados del acta.

🔹 Estilo de redacción

    ✅ Narración formal y en tercera persona: La redacción debe ser formal y estrictamente en tercera persona, sin lenguaje coloquial ni menciones en primera persona.
    ✅ No se permiten resúmenes: Se debe capturar toda la información relevante sin omitir detalles. Solo se permite concisión al referirse explícitamente a actas anteriores.
    ✅ Evitar redundancias: No se debe repetir información que ya se haya dado en otro tema del acta. Se debe tener especial cuidado en no mencionar repetidamente cambios en el orden del día, a menos que sea estrictamente necesario para la comprensión del tema actual.

🔹 Estructura organizada y coherente:

    Se debe evitar la redundancia mencionando la relación con otros puntos del orden del día sin repetir la información detallada.
    La narrativa debe ser fluida y natural, evitando una estructura fragmentada o un uso excesivo de listas.

🔹 Formato profesional y estructurado

    ✅ Se deben usar negritas para resaltar cifras y decisiones clave.
    ✅ Los subtítulos (<h3>) se utilizarán solo cuando aporten claridad y ayuden a organizar aspectos clave dentro del mismo tema, sin fragmentar excesivamente el contenido.
    ✅ Las listas (<ul> o <ol>) se utilizarán únicamente cuando sea necesario para organizar mejor la información, evitando un uso excesivo. Los resultados de las votaciones se deben resaltar en listas de tipo bullet (<ul>).

🔎 Proceso de Desarrollo

1️⃣ Revisión del orden del día

    Analizar el contenido del orden del día (${ordendeldia}) antes de redactar el tema actual.
    Asegurar que la información a desarrollar no se superponga con otros temas previamente discutidos o que serán tratados más adelante.

2️⃣ Extracción precisa de información

    Identificar dentro de la transcripción (${content}) todas las menciones y detalles relacionados exclusivamente con el tema ${tema}.
    Omitir cualquier información irrelevante o que pertenezca a otro punto del orden del día.

3️⃣ Verificación de contenido previo

    Revisar el contenido ya generado (${contenidoActa}) para evitar redundancias, solapamientos o información repetida.
    Asegurarse de que la estructura del acta se mantenga clara, ordenada y sin contradicciones con respecto a lo previamente escrito.

4️⃣ Desarrollo del contenido

    Redactar en tercera persona con un tono formal y profesional.
    Incluir detalles específicos como fechas, montos, acuerdos y nombres relevantes cuando sean mencionados en la transcripción.
    Asegurar la coherencia en la estructura y evitar la redundancia con otros puntos del acta.
    Si el tema no fue abordado en la reunión, mencionar explícitamente que se incluyó en el orden del día pero no se trató finalmente.

5️⃣ Estructuración y formato en HTML

    El encabezado principal debe ser: <h2>${numeracion}. ${tema}</h2>.X
    Utilizar subtítulos (<h3>) solo para separar aspectos clave del mismo tema.
    Usar negritas (<strong>) para cifras, decisiones clave y puntos de relevancia.
    Utilizar listas (<ul>) para resaltar los resultados de las votaciones.
    Antes de responder, se debe validar que NO haya contenido repetido.

    Revisa que NO REPITAS PARRAFOS O CONTENIDOS DENTRE DE UN TEMA ES MUY MALA PRACTICA QUE EXITAN PARRAFOS QUE DIGAN LOS MISMO

📌 Mejoras clave en esta versión:

    ✅ Refuerza la búsqueda minuciosa de la información en la transcripción para garantizar que no se omita ningún detalle relevante.
    ✅ Se enfatiza la necesidad de expresar que el tema fue nombrado en el orden del día pero no abordado, si aplica.
    ✅ Garantiza una redacción formal en tercera persona en todo el contenido.
    ✅ Evita redundancias y garantiza que no se repita información ya cubierta en otros temas.
    ✅ Facilita el proceso de generación de actas con estructura clara y profesional.
    ✅ Incluye la verificación previa de contenido generado para evitar redundancias y asegurar la coherencia del acta.`;
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