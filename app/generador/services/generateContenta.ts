"use server";

import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import {
  autenticarGoogleDrive,
  obtenerContenidoArchivoDrive,
  verificarArchivoExistente,
  obtenerOCrearCarpeta,
  crearArchivo,
} from "./utilsActions";
//@ts-expect-error revisar despues
export async function generateContenta(nombreNormalizado) {
  try {
    console.log("Iniciando generación de contenido para:", nombreNormalizado);

    const drive = await autenticarGoogleDrive();
    console.log("Autenticado en Google Drive");

    const nombreTranscripcion = `${nombreNormalizado.replace(
      /\.[^/.]+$/,
      ""
    )}_Transcripcion.txt`;

    console.log("Buscando transcripción:", nombreTranscripcion);

    const idCarpeta = await obtenerOCrearCarpeta(drive, nombreNormalizado);
    console.log("Carpeta obtenida o creada con ID:", idCarpeta);

    const transcripcionExistente = await verificarArchivoExistente(
      drive,
      nombreTranscripcion,
      idCarpeta
    );
    if (!transcripcionExistente) {
      console.log("No se encontró la transcripción");
      return;
    }

    const nombreContenido = `${nombreNormalizado.replace(
      /\.[^/.]+$/,
      ""
    )}_Contenido.txt`;

    // Verifica si el archivo de contenido ya existe
    const contenidoExistente = await verificarArchivoExistente(
      drive,
      nombreContenido,
      idCarpeta
    );

    if (contenidoExistente) {
      console.log("El archivo de contenido ya existe.");
      return {
        status: "success",
        message: "Contenido ya existente.",
      };
    }

    console.log("Transcripción encontrada, obteniendo contenido...");
    const contenidoTranscripcion = (await obtenerContenidoArchivoDrive(
      drive,
      transcripcionExistente
    )) as string;

    console.log(
      "Contenido de transcripción obtenido. Generando Orden del Día..."
    );

    const responseGeminiOrdenDelDia = await generateText({
      model: google("gemini-2.0-flash"),
      maxTokens: 1000000,
      temperature: 0,
      system: await getSystemPromt("Orden"),
      prompt: await getUserPromt(
        "Orden",
        "Orden",
        contenidoTranscripcion,
        "test"
      ),
    });

    const jsonText = responseGeminiOrdenDelDia.text.trim();

    // Eliminar posibles delimitadores de código como ```json y ```
    const jsonCleaned = jsonText.replace(/^```json\s*|\s*```$/g, "");

    const ordenDelDiaJSON = JSON.parse(jsonCleaned);

    console.log("Orden del día generado:", JSON.stringify(ordenDelDiaJSON));
    let contenido = "";

    for (const tema of ordenDelDiaJSON) {
      console.log("Generando contenido para tema:", tema.nombre);

      const responseTema = await generateText({
        model: google("gemini-2.0-flash-thinking-exp-01-21"),
        maxTokens: 1000000,
        temperature: 0,
        system: await getSystemPromt(
          tema.nombre == "Cabecera"
            ? "Cabecera"
            : tema.nombre == "Cierre"
            ? "Cierre"
            : "Contenido"
        ),
        prompt: await getUserPromt(
          tema.nombre == "Cabecera"
            ? "Cabecera"
            : tema.nombre == "Cierre"
            ? "Cierre"
            : "Contenido",
          tema.nombre,
          contenidoTranscripcion,
          ordenDelDiaJSON
        ),
      });

      const textoGenerado = responseTema.text.trim();
      console.log("Contenido generado:", textoGenerado);

      contenido += textoGenerado; // Concatenamos directamente sin saltos de línea
    }

    console.log("Contenido final generado:", contenido);
    const contenidoFormato = contenido
      .replace(/```html/g, "")
      .replace(/html/g, "")
      .replace(/```/g, "")
      .replace(/< lang="es">/g, "")
      .replace(/<\/?>/g, "")
      .replace(/\[Text Wrapping Break\]/g, "")
      .trim();
    await crearArchivo(drive, contenidoFormato, nombreContenido, idCarpeta);
    return { status: "success", content: contenidoFormato };
  } catch (error) {
    console.error("Error durante la generación del orden del día:", error);
  }
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
   - Si hay un "Orden del Día" explícito en la transcripción, respétalo.  
   - Si no hay un "Orden del Día", genera uno basado en los grandes temas tratados, manteniendo el orden cronológico.  
   - Siempre debe empezar con { "id": 0, "nombre": "Cabecera" } y terminar con { "id": n + 1, "nombre": "Cierre" }.  
3. **No incluyas subtemas ni detalles menores**. Solo los grandes temas.  
4. **La respuesta debe ser un JSON puro, sin etiquetas, ni nombres adicionales, solo un array de objetos JSON con los id y nombres**.  
5. **Si la transcripción está vacía o no tiene información relevante, responde con:**  
   

[
  { "id": 0, "nombre": "Cabecera" },
  { "id": 1, "nombre": "Sin información relevante" },
  { "id": 2, "nombre": "Cierre" }
]

Ejemplo de respuesta correcta:

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

    Título: Acta de la reunión.
    Fecha, hora y lugar: Extraer estos datos de la transcripción.
    Asistentes: Listar los nombres y cargos mencionados.
    Moderador o presidente de la reunión: Indicar quién dirigió la sesión.
    Orden del Día:
        Si en la transcripción se menciona un orden del día explícito, usarlo.
        Si no está claro, deducir los grandes temas tratados, sin subtemas ni detalles específicos.

✅ Salida estrictamente en HTML. No incluir texto fuera de etiquetas HTML.
🔹 FORMATO ESPERADO

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

✅ Todo el contenido debe generarse en HTML.
✅ Si el orden del día no está claro en la transcripción, se deben deducir los grandes temas tratados.
✅ Formato limpio, bien estructurado y sin agregar información inventada.`;
      return systemPromt;

    case "Contenido":
      systemPromt = `INSTRUCCIONES PARA EL DESARROLLO DE UN TEMA DEL ACTA EJECUTIVA

Como Secretario Ejecutivo, debes redactar cada tema tratado en la reunión de manera clara, formal y estructurada, asegurando fidelidad al contenido sin caer en transcripciones literales ni en resúmenes superficiales.
🔹 Pautas generales:

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

<h2>Plan de Mejoras en Seguridad del Edificio</h2>

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
  ordendeldia: string
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

    Título: Acta de la Reunión.
    Fecha, hora y lugar: Extrae esta información de la transcripción.
    Moderador o presidente: Identifica quién dirigió la sesión.
    Asistentes: Lista los nombres y cargos de quienes participaron.
    Orden del Día:
        Si se menciona un orden del día en la transcripción, usarlo.
        Si no está explícito, analizar la transcripción y deducir los grandes temas tratados, sin subtemas ni detalles excesivos.

FORMATO DE SALIDA (SOLO HTML):

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


🔹 Estilo de redacción

✅ Narración formal y en tercera persona: No debe haber lenguaje coloquial ni menciones en primera persona.
✅ No se permiten resúmenes: Se debe capturar toda la información relevante sin omitir detalles. Solo se permite concisión al referirse a actas anteriores.
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

    Encabezado principal: <h2>${tema}</h2>
    Subtítulos: <h3> solo para separar aspectos clave del mismo tema.
    Negritas: Para cifras, decisiones clave y puntos de relevancia.
    Listas: Solo cuando ayuden a organizar mejor la información sin fragmentarla innecesariamente.

Ejemplo de Acta Generada

Tema: Mantenimiento de Instalaciones

<h2>Mantenimiento de Instalaciones</h2>

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
✅ Se enfatiza la necesidad de una narrativa fluida, sin abuso de subtítulos o listas que interrumpan la lectura natural.
✅ Se mantiene un balance entre claridad y estructura, asegurando una redacción profesional sin fragmentaciones innecesarias.
✅ Se detalla el proceso paso a paso, facilitando la generación de actas más organizadas y precisas.`;
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
