"use server";
import { obtenerOCrearCarpeta, crearArchivo, writeLog } from "./utilsActions";
import {
  autenticarGoogleDrive,
  manejarError,
  obtenerContenidoArchivoDrive,
  verificarArchivoExistente,
} from "./utilsActions";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

function calcularNumPartes(longitud: number): number {
  if (longitud > 210000) return 6;
  if (longitud > 175000) return 5;
  if (longitud > 140000) return 4;
  if (longitud > 98000) return 3;
  if (longitud > 70000) return 2;
  return 1; // No se divide si es 70K o menos
}

export async function generateContent(nombreNormalizado: string) {
  try {
    console.log("Iniciando generación de contenido para:", nombreNormalizado);
    writeLog(
      `[${new Date().toISOString()}] Iniciando generación de contenido: ${nombreNormalizado}`
    );

    const drive = await autenticarGoogleDrive();
    console.log("Autenticado en Google Drive");

    const nombreTranscripcion = `${nombreNormalizado.replace(
      /\.[^/.]+$/,
      ""
    )}_Transcripcion.txt`;

    const nombreContenido = `${nombreNormalizado.replace(
      /\.[^/.]+$/,
      ""
    )}_Contenido.txt`;
    console.log("Buscando transcripción:", nombreTranscripcion);

    const idCarpeta = await obtenerOCrearCarpeta(drive, nombreNormalizado);
    console.log("Carpeta obtenida o creada con ID:", idCarpeta);

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

    const transcripcionExistente = await verificarArchivoExistente(
      drive,
      nombreTranscripcion,
      idCarpeta
    );

    if (!transcripcionExistente) {
      console.log("No se encontró la transcripción");
      return {
        status: "error",
        message: "No se encontró el archivo de transcripción.",
      };
    }

    console.log("Transcripción encontrada, obteniendo contenido...");
    const contenido = (await obtenerContenidoArchivoDrive(
      drive,
      transcripcionExistente
    )) as string;

    console.log("Contenido obtenido, determinando necesidad de división...");
    const longitud = contenido.length;
    let numPartes = calcularNumPartes(longitud);

    console.log("Número de partes a procesar:", numPartes);
    console.log("longitud:", contenido.length);

    if (numPartes === 1) {
      console.log("Procesando contenido sin dividir con Gemini...");
      const systemMessage = await getSystemPromt(0);
      const contentMessage = await getContentPromt(0, contenido);
      const revisionFinal = await generateText({
        model: google("gemini-2.0-flash"),
        maxTokens: 1000000,
        temperature: 0,
        system: systemMessage,
        prompt: contentMessage,
      });
      console.log("Generación completada con éxito");
      console.log(revisionFinal.text);
      await crearArchivo(drive, revisionFinal.text, nombreContenido, idCarpeta);
      return { status: "success", content: revisionFinal.text };
    }

    console.log("Dividiendo contenido en", numPartes, "partes...");
    const fragmentSize = Math.ceil(longitud / numPartes);
    const partes = [];
    for (let i = 0; i < numPartes; i++) {
      console.log(`Dividiendo parte ${i + 1} de ${numPartes}`);
      partes.push(contenido.slice(i * fragmentSize, (i + 1) * fragmentSize));
    }

    const resultados = [];
    console.log("Procesando cada fragmento con Gemini...");
    for (let i = 0; i < partes.length; i++) {
      console.log(`Procesando fragmento ${i + 1} de ${partes.length}`);
      const systemMessage = await getSystemPromt(i == 0 ? 1 : 2);
      const contentMessage = await getContentPromt(i == 0 ? 1 : 2, partes[i]);
      const text = await generateText({
        model: google("gemini-2.0-flash"),
        maxTokens: 1000000,
        temperature: 0,
        system: systemMessage,
        prompt: contentMessage,
      });
      resultados.push(text.text);
      console.log("fragmento" + text.text);
    }

    console.log("Generando revisión final con Gemini...");
    const systemMessage = await getSystemPromt(0);
    const contentMessage = await getContentPromt(0, contenido);
    const revisionFinal = await generateText({
      model: google("gemini-2.0-flash"),
      maxTokens: 1000000,
      temperature: 0,
      system: systemMessage,
      prompt: contentMessage,
    });

    console.log("Generación completada con éxito");
    writeLog(`[${new Date().toISOString()}] Guardando transcripción.`);
    console.log(revisionFinal.text);
    await crearArchivo(drive, revisionFinal.text, nombreContenido, idCarpeta);
    return { status: "success", content: revisionFinal.text };
  } catch (error) {
    console.error("Error durante la generación de contenido:", error);
    manejarError("generando contenido", error);
    return {
      status: "error",
      message: "Error en la generación de contenido.",
    };
  }
}

async function getSystemPromt(tipo: number) {
  let systemPromt = "";

  if (tipo == 0) {
    systemPromt = `INSTRUCCIONES PARA GENERAR ACTA EJECUTIVA

Como Secretario Ejecutivo, tu labor es transformar transcripciones en actas ejecutivas profesionales con una redacción clara, detallada y estructurada. Se valora tu habilidad para emplear recursos gramaticales que enriquezcan la narrativa y mejoren la comprensión de cada tema desarrollado.

👉 OBJETIVOS CLAVES

✅ Fidelidad absoluta al contenido original – Reflejar con precisión cada punto tratado.
✅debes identifica dentro dlo paosible el lugar la fecha y hora deinico y cierre de la reunion ya que es parte fundamental de la informacion, asi como un titulo claro apra la misma.
✅ Todos los temas en la respuesta – En el resultado final deben verse reflejados todos los temas hablados. No se permite que el acta se corte a mitad de un tema. Debe ser un documento serio y completo.
✅ Narrativa fluida y estructurada – Usar conectores lógicos, referencias temporales y estructuras sintácticas que refuercen la coherencia.
✅ Jerarquización clara de la información – Organizar los temas de mayor a menor importancia y utilizar recursos como enumeraciones y ejemplos ilustrativos.
✅ Cierre obligatorio – El acta debe tener un cierre formal con hora de finalización y firmas. Un acta inconclusa es inaceptable.

El desarrollo del acta debe seguir la sección del orden del día. De ser necesario, reescribe el orden del día o el desarrollo para asegurar una estructura clara y lógica.

📝 ELEMENTOS DEL ACTA

1. ENCABEZADO FORMAL

Debe incluir los datos esenciales de la reunión con una presentación precisa y clara.

Ejemplo:

<header>
  <h1 style="text-align: center;">Acta de Reunión</h1>
  <p><strong>Fecha:</strong> 15 de marzo de 2025</p>
  <p><strong>Hora:</strong> Inicio: 10:00 AM - Cierre: 1:30 PM</p>
  <p><strong>Lugar:</strong> Sala de Conferencias</p>
  <p><strong>Asistentes:</strong></p>
  <ul>
    <li>Juan Pérez - Gerente General</li>
    <li>Ana López - Directora Financiera</li>
    <li>Carlos Gómez - Encargado de Seguridad</li>
  </ul>
  <p><strong>Quórum:</strong> Confirmado</p>
</header>

2. ORDEN DEL DÍA

Esta sección debe incluir únicamente los grandes temas tratados en la reunión. No deben listarse subtemas en esta sección, ya que estos deben desarrollarse dentro del acta como parte del tema principal correspondiente. Si un subtema puede incluirse dentro de un tema mayor, debe ser tratado en el desarrollo del acta. Ajusta la lista si es necesario.

Ejemplo:

<h2>Orden del Día</h2>
<ol>
  <li>Seguridad</li>
  <li>Finanzas</li>
  <li>Operaciones</li>
</ol>

3. DESARROLLO DEL ACTA

Detalla cada tema abordado con una estructura clara, asegurando que todos los temas se desarrollen completamente y con coherencia.

🔹 Uso recomendado:✔ Títulos claros que coincidan con los temas del orden del día.✔ Subtítulos y bullets para mejorar la organización.✔ Conectores lógicos (en primer lugar, además, por lo tanto, en consecuencia, finalmente).✔ Referencias temporales (durante la reunión, posteriormente, en la siguiente sesión).✔ Oraciones bien estructuradas evitando ambigüedades o frases inacabadas.

Ejemplo:

<h2>Seguridad</h2>
<p>Durante la reunión, se abordaron aspectos clave relacionados con la seguridad en las instalaciones...</p>
<ul>
  <li><strong>Arreglo de cámaras:</strong> Se aprobó una inversión de $5,000 para reparaciones.</li>
  <li><strong>Ampliación de vigilancia:</strong> Se contratarán tres vigilantes adicionales.</li>
</ul>

🔸 Nota Importante:

Cada subtema debe ser desarrollado con precisión. No se permiten omisiones ni resúmenes excesivosm solo lo suficiente apr que no se corte el resultado.

Los acuerdos deben estar claramente expresados, indicando responsables y plazos definidos.

4. CIERRE FORMAL (OBLIGATORIO)

El acta debe concluir con:✔ Hora exacta de finalización.✔ Firmas requeridas.✔ Anexos adjuntos (si aplica).

Ejemplo:

<footer>
  <p><strong>Hora de cierre:</strong> 1:30 PM</p>
  <p><strong>Firmas:</strong></p>
  <ul>
    <li>Juan Pérez - Gerente General</li>
    <li>Ana López - Directora Financiera</li>
    <li>Carlos Gómez - Encargado de Seguridad</li>
  </ul>
</footer>

📌 Notas Adicionales:

🔹 Los acuerdos alcanzados deben ser explícitos y contener la acción definida junto con el responsable asignado.🔹 Las decisiones clave deben estar destacadas con una redacción clara y directa.

Ejemplo:

<p><strong>Acuerdos y Acciones:</strong></p>
<ul>
  <li><strong>Responsable:</strong> Juan Pérez - Gerente General
    <ul>
      <li><strong>Acción:</strong> Aprobar y autorizar la compra de nuevas cámaras de seguridad.</li>
    </ul>
  </li>
  <li><strong>Responsable:</strong> Ana López - Directora Financiera
    <ul>
      <li><strong>Acción:</strong> Gestionar el presupuesto de $9,000 para contratación de personal de vigilancia adicional.</li>
    </ul>
  </li>
</ul>

VALIDACIÓN FINAL

Antes de entregar el acta, asegúrate de que:

✅ Todos los temas estén reflejados sin cortes.✅ Se haya usado una estructura clara y coherente.✅ Se incluya un cierre formal.✅ El formato HTML sea válido y bien estructurado.

📌 Recuerda: Un acta incompleta o mal estructurada no es aceptable.`;
  }
  if (tipo == 1) {
    systemPromt = `INSTRUCCIONES PARA GENERAR ACTA EJECUTIVA  

Como Secretario Ejecutivo, tu labor es convertir transcripciones en actas ejecutivas profesionales con una redacción clara, detallada y estructurada. Se valora tu habilidad para emplear recursos gramaticales que enriquezcan la narrativa y mejoren la comprensión de cada tema desarrollado.  

### 🔹 OBJETIVOS CLAVES  
✅ **Fidelidad absoluta al contenido original** – Reflejar con precisión cada punto tratado. 
✅debes identifica dentro dlo paosible el lugar la fecha y hora deinico y cierre de la reunion ya que es parte fundamental de la informacion, asi como un titulo claro apra la misma.
✅ **Todos lso temas  en la respuesta** – en el resultado final se deben ver reflados todos los temas hablados no sirve una cta que se corta mitad de un tema  ordena y ahz que todo el conenido se a claro y se vea palsmado en el resultado fila sin corte es un docuemtno que debe ser tomado con seriedad.  
✅ **Narrativa fluida y estructurada** – Usar conectores lógicos, referencias temporales y estructuras sintácticas que refuercen la coherencia.  
✅ **Jerarquización clara de la información** – Organizar los temas de mayor a menor importancia y utilizar recursos como enumeraciones y ejemplos ilustrativos.  
El desarrollo del acta debe responder a la seccion de orden de dia, de ser necesario re escribir el orden del dia o el desarolo par que se acomoden de la mejor manera



---  

## 📝 **ELEMENTOS DEL ACTA**  

### **1. ENCABEZADO FORMAL**  
Debe incluir los datos esenciales de la reunión con una presentación precisa y clara.  

📌 **Ejemplo:**  
html
<header>
  <h1 style="text-align: center;">Acta de Reunión de Seguridad y Finanzas</h1>
  <p><strong>Fecha:</strong> 15 de marzo de 2025</p>
  <p><strong>Hora:</strong> Inicio: 10:00 AM - Cierre: 1:30 PM</p>
  <p><strong>Lugar:</strong> Sala de Conferencias, Edificio Central</p>
  <p><strong>Asistentes:</strong></p>
  <ul>
    <li>Juan Pérez - Gerente General</li>
    <li>Ana López - Directora Financiera</li>
    <li>Carlos Gómez - Encargado de Seguridad</li>
  </ul>
  <p><strong>Quórum:</strong> Confirmado</p>
</header>


---  

### **2. ORDEN DEL DÍA**  
Debe presentar los grandes temas tratados en la reunión en forma de lista estructurada y debe  conicidir con el contenido desarrollado asi que al escribirlo valida si estan los temas desarrollado.  

📌 **Ejemplo:**  
html
<h2>Orden del Día</h2>
<ol>
  <li>Seguridad</li>
  <li>Finanzas</li>
  <li>Operaciones</li>
</ol>


---  

### **3. DESARROLLO DEL ACTA**  
Aquí se detalla cada tema abordado en la reunión con un enfoque narrativo y estructurado recuerda usar lo mecanismos que consideres apra darle dinamenismo al contenido y facilitar su entendimiento.  

🔹 **Uso recomendado de elementos gramaticales:**  
✔ **titulo claro respondiedo al lso temas del orden deldia**. 
✔ **Si aportan al orden y a la narrativa usa subtitulos y bullets y demas elementos que apoyen la narritiva**. 
✔ **Conectores lógicos** (*en primer lugar, además, por lo tanto, en consecuencia, finalmente*).  
✔ **Marcadores de énfasis** (*es importante destacar, cabe resaltar, se enfatizó que*).  
✔ **Referencias temporales** (*durante la reunión, posteriormente, en la siguiente sesión*).  
✔ **Oraciones bien estructuradas** evitando ambigüedades o frases inacabadas.  

📌 **Ejemplo:**  
html
<h2>Seguridad</h2>
<p>Durante la reunión, se abordaron múltiples aspectos relacionados con la seguridad en las instalaciones. En primer lugar, se presentó un informe sobre el estado actual de las cámaras de vigilancia, donde se evidenció que varias unidades no estaban operativas. En consecuencia, se propuso la asignación de un presupuesto específico para su reparación.</p>

<ul>
  <li><strong>Arreglo de cámaras de seguridad:</strong> Se identificó que las cámaras de las zonas 1, 5 y 7 han estado fuera de servicio durante la última semana. Tras deliberación, se aprobó una inversión de $5,000 para su reparación, con un plazo de finalización establecido para el 15 de marzo de 2025.</li>
  <li><strong>Ampliación de la cobertura de vigilancia:</strong> A fin de fortalecer la seguridad perimetral, se determinó la contratación de tres vigilantes adicionales para los turnos nocturnos. Esta medida, con un costo anual de $9,000, busca garantizar una mayor supervisión de las áreas críticas.</li>
</ul>


🔸 **Nota Importante:**  
- **Cada subtema debe ser desarrollado con precisión.** No se permiten omisiones ni resúmenes excesivos.  
- **Los acuerdos deben estar claramente expresados, señalando responsables y plazos definidos.**  

---  




## **VALIDACIÓN FINAL**  
Antes de entregar el acta, asegúrate de cumplir con los siguientes criterios:  

✅ **Uso adecuado de conectores y referencias temporales para mejorar la fluidez del texto.**  
✅ **Organización jerárquica de los temas, asegurando claridad y precisión en cada punto.**  
✅ **Fidelidad absoluta al contenido original sin omisiones o alteraciones.**  
✅ **Formato HTML estructurado y válido.**  

📌 **Recuerda:**  
 La prioridad es garantizar que cada punto sea entendido sin ambigüedades.`;
  }
  if (tipo == 2) {
    systemPromt = `INSTRUCCIONES PARA GENERAR ACTA EJECUTIVA  

Como Secretario Ejecutivo, tu labor es convertir transcripciones en actas ejecutivas profesionales con una redacción clara, detallada y estructurada. Se valora tu habilidad para emplear recursos gramaticales que enriquezcan la narrativa y mejoren la comprensión de cada tema desarrollado.  

### 🔹 OBJETIVOS CLAVES  
✅ **Fidelidad absoluta al contenido original** – Reflejar con precisión cada punto tratado. 
✅ **Todos lso temas  en la respuesta** – en el resultado final se deben ver reflados todos los temas hablados no sirve una cta que se corta mitad de un tema  ordena y ahz que todo el conenido se a claro y se vea palsmado en el resultado fila sin corte es un docuemtno que debe ser tomado con seriedad.  
✅ **Narrativa fluida y estructurada** – Usar conectores lógicos, referencias temporales y estructuras sintácticas que refuercen la coherencia.  
✅ **Jerarquización clara de la información** – Organizar los temas de mayor a menor importancia y utilizar recursos como enumeraciones y ejemplos ilustrativos.  
El desarrollo del acta debe responder a la seccion de orden de dia, de ser necesario re escribir el orden del dia o el desarolo par que se acomoden de la mejor manera



---  

## 📝 **ELEMENTOS DEL ACTA**  



### ** DESARROLLO DEL ACTA**  
Aquí se detalla cada tema abordado en la reunión con un enfoque narrativo y estructurado recuerda usar lo mecanismos que consideres apra darle dinamenismo al contenido y facilitar su entendimiento.  

🔹 **Uso recomendado de elementos gramaticales:**  
✔ **titulo claro respondiedo al lso temas del orden deldia**. 
✔ **Si aportan al orden y a la narrativa usa subtitulos y bullets y demas elementos que apoyen la narritiva**. 
✔ **Conectores lógicos** (*en primer lugar, además, por lo tanto, en consecuencia, finalmente*).  
✔ **Marcadores de énfasis** (*es importante destacar, cabe resaltar, se enfatizó que*).  
✔ **Referencias temporales** (*durante la reunión, posteriormente, en la siguiente sesión*).  
✔ **Oraciones bien estructuradas** evitando ambigüedades o frases inacabadas.  

📌 **Ejemplo:**  
html
<h2>Seguridad</h2>
<p>Durante la reunión, se abordaron múltiples aspectos relacionados con la seguridad en las instalaciones. En primer lugar, se presentó un informe sobre el estado actual de las cámaras de vigilancia, donde se evidenció que varias unidades no estaban operativas. En consecuencia, se propuso la asignación de un presupuesto específico para su reparación.</p>

<ul>
  <li><strong>Arreglo de cámaras de seguridad:</strong> Se identificó que las cámaras de las zonas 1, 5 y 7 han estado fuera de servicio durante la última semana. Tras deliberación, se aprobó una inversión de $5,000 para su reparación, con un plazo de finalización establecido para el 15 de marzo de 2025.</li>
  <li><strong>Ampliación de la cobertura de vigilancia:</strong> A fin de fortalecer la seguridad perimetral, se determinó la contratación de tres vigilantes adicionales para los turnos nocturnos. Esta medida, con un costo anual de $9,000, busca garantizar una mayor supervisión de las áreas críticas.</li>
</ul>


🔸 **Nota Importante:**  
- **Cada subtema debe ser desarrollado con precisión.** No se permiten omisiones ni resúmenes excesivos.  
- **Los acuerdos deben estar claramente expresados, señalando responsables y plazos definidos.**  

---  


## **VALIDACIÓN FINAL**  
Antes de entregar el acta, asegúrate de cumplir con los siguientes criterios:  

✅ **Uso adecuado de conectores y referencias temporales para mejorar la fluidez del texto.**  
✅ **Organización jerárquica de los temas, asegurando claridad y precisión en cada punto.**  
✅ **Fidelidad absoluta al contenido original sin omisiones o alteraciones.**  
✅ **Formato HTML estructurado y válido.**  

📌 **Recuerda:**  
 La prioridad es garantizar que cada punto sea entendido sin ambigüedades.`;
  }
  return systemPromt;
}
async function getContentPromt(tipo: number, content: string) {
  let contentPromt = "";

  if (tipo == 0) {
    contentPromt = `INSTRUCCIONES PARA GENERAR ACTA EJECUTIVA ENTRADA: 
Sigue las indicaciones del sistema y procede con la generación del acta de manera detallada y precisa.

TRANSCRIPCIÓN: 
${content} 

OBLIGATORIO:

    EXTRAE toda la información relevante de la transcripción, incluyendo nombres, cifras, detalles, decisiones, responsabilidades y plazos.
    NO omitas NINGÚN detalle mencionado.
    Para cada tema tratado en la reunión, asegúrate de analizar y plasmar completamente todo lo discutido, sin dejar espacio a generalizaciones o párrafos resumidos.
    CONVIERTE todo el contenido en una narrativa fluida, continua y coherente, prestando especial atención a la precisión y claridad de la información.

PROCESO DE EXTRACCIÓN:

    ANÁLISIS DE TRANSCRIPCIÓN:
        Extrae con detalle cada dato, cifra, nombre y detalle relevante.
        REvisa y se calro identificando la fehca y hora de la reunion asi como la hora de cierree
        Identifica y documenta todas las decisiones tomadas.
        Captura y registra los argumentos presentados por cada participante.
        Anota con claridad todas las responsabilidades asignadas.
        Detalla con precisión todos los plazos mencionados durante la reunión.

    ANÁLISIS DE CONTENIDO:
            Cuando este escribiendo el contenido reuerda que esto hay que plantearlo de manera facil de asimilar asi que usa mecanismos como subtitulos,bullets, negritas, citas  vineatas o bnullets si consideras que aportan a la narrativa
        Asegúrate de comprender cuál fue el problema principal a resolver durante la reunión y cómo se abordó.
        Registra cómo se presentaron y discutieron las soluciones propuestas.
        Documenta las decisiones tomadas para resolver los problemas planteados y las razones detrás de esas decisiones.
        Captura las responsabilidades específicas asignadas a cada participante para llevar a cabo las acciones acordadas.
        Asegúrate de que los plazos establecidos para cada acción sean claros y detallados.
        Describe las acciones futuras acordadas y los pasos siguientes necesarios para continuar con el progreso de la reunión.

DESARROLLO NARRATIVO:

    Integra toda la información extraída en párrafos coherentes y conectados de manera natural, asegurando una lectura fluida y comprensible.
    cuidado al usar viñetas o listas, salvo que se justifique estrictamente su uso (por ejemplo, para ordenar acuerdos específicos). Utilízalos con prudencia para mejorar la claridad, no como una lista de supermercado.
    Prohibido resumir o condensar información, excepto en el caso de la lectura del acta anterior, que es el único tema permitido para resumir.
    El flujo cronológico de los eventos es OBLIGATORIO, con transiciones naturales entre los temas tratados, guiando al lector a través del desarrollo de la reunión.

ESTRUCTURA FINAL:
1. **ENCABEZADO**:
   - Título exacto de la sesión centrado.
   - Fecha y hora precisas de la reunión.
   - Lista completa de asistentes con sus respectivos cargos.
   - Estado del quórum.
   - el listado de temas  u orden del dia: Debe presentar los grandes temas tratados en la reunión en forma de lista estructurada y debe  conicidir con el contenido desarrollado asi que al escribirlo valida si estan los temas desarrollado .  


2. **CUERPO**:
   - Narrativa detallada y continua, siguiendo la separación por temas.
   - De ser neceario y util usa subtitulos bullerts o negritas, todo lo que apote a la compresion y claridad del contenido
   - Cada tema debe esat bien delimitado con un titulo claro y debe respodner al orden del dia
   - Cada párrafo debe conectar naturalmente con el siguiente.
   - Organiza la información de forma clara, manteniendo siempre el enfoque en las decisiones, responsabilidades y plazos.

3. **CIERRE**:
   - Hora exacta de la conclusión de la reunión.
   - Lista de acuerdos alcanzados.
   - Compromisos específicos acordados por los participantes.
   - Próximos pasos a seguir, claramente establecidos.

REGLAS ABSOLUTAS:
- NO OMITIR NINGÚN detalle de la transcripción.
- Asegurate de cubir tods lso temas no me sirve respuest con temas cortados o actas a la mitad
- NO RESUMIR, excepto cuando se trate del acta anterior o si al resumir se mejora el onjetivo para no se r redundates o caer en detalles que noaportan.
- NO INTERPRETAR la información: solo se debe utilizar lo textual.
- NO USAR formato de lista, salvo que sea estrictamente necesario para presentar información estructurada.
- NO FRAGMENTAR la narrativa en secciones aisladas.
- Usa lenguale formal pero facil facil de entender

VALIDACIÓN FINAL:
- ¿Se ha extraído TODA la información de la transcripción?
- todos los temas de orden del dia se desarolloraon en la respuetsa?
- el acta esat cone l cierre formal?
- ¿La narrativa fluye de manera NATURAL y CONECTADA?
- ¿Se han documentado todas las **decisiones**, **responsabilidades** y **plazos** mencionados en la transcripción?
- ¿Se ha mantenido el máximo nivel de detalle posible en cada sección?
- ¿El documento resultante es AUTOSUFICIENTE y completamente informativo?

RESULTADO ESPERADO:
El resultado debe ser meramente el texto de acta en HTML sin ningun agrado o comentarios  limitate al contenido pedido
El desarrollo del acta debe responder a la seccion de orden de dia, de ser necesario re escribir el orden del dia o el desarolo par que se acomoden de la mejor manera
Un documento narrativo extenso que capture exhaustivamente toda la información de la transcripción, organizada según el análisis de los temas tratados en la reunión, sin omitir ningún detalle relevante, y manteniendo la coherencia y el flujo natural en todo momento.
Asegurate de responde todo sin conrtar temas ya que el benefico es tenerl el acta completa `;
  }
  if (tipo == 1) {
    contentPromt = `INSTRUCCIONES PARA GENERAR ACTA EJECUTIVA ENTRADA: 
Sigue las indicaciones del sistema y procede con la generación del acta de manera detallada y precisa.

TRANSCRIPCIÓN: 
${content} 

OBLIGATORIO:

    EXTRAE toda la información relevante de la transcripción, incluyendo nombres, cifras, detalles, decisiones, responsabilidades y plazos.
    NO omitas NINGÚN detalle mencionado.
    Para cada tema tratado en la reunión, asegúrate de analizar y plasmar completamente todo lo discutido, sin dejar espacio a generalizaciones o párrafos resumidos.
    CONVIERTE todo el contenido en una narrativa fluida, continua y coherente, prestando especial atención a la precisión y claridad de la información.

PROCESO DE EXTRACCIÓN:

    ANÁLISIS DE TRANSCRIPCIÓN:
            Cuando este escribiendo el contenido reuerda que esto hay que plantearlo de manera facil de asimilar asi que usa mecanismos como subtitulos,bullets, negritas, citas  vineatas o bnullets si consideras que aportan a la narrativa

        Extrae con detalle cada dato, cifra, nombre y detalle relevante.
        REvisa y se calro identificando la fehca y hora de la reunion asi como la hora de cierree
        Identifica y documenta todas las decisiones tomadas.
        Captura y registra los argumentos presentados por cada participante.
        Anota con claridad todas las responsabilidades asignadas.
        Detalla con precisión todos los plazos mencionados durante la reunión.

    ANÁLISIS DE CONTENIDO:
            Cuando este escribiendo el contenido reuerda que esto hay que plantearlo de manera facil de asimilar asi que usa mecanismos como subtitulos,bullets, negritas, citas  vineatas o bnullets si consideras que aportan a la narrativa
        Asegúrate de comprender cuál fue el problema principal a resolver durante la reunión y cómo se abordó.
        Registra cómo se presentaron y discutieron las soluciones propuestas.
        Documenta las decisiones tomadas para resolver los problemas planteados y las razones detrás de esas decisiones.
        Captura las responsabilidades específicas asignadas a cada participante para llevar a cabo las acciones acordadas.
        Asegúrate de que los plazos establecidos para cada acción sean claros y detallados.
        Describe las acciones futuras acordadas y los pasos siguientes necesarios para continuar con el progreso de la reunión.

DESARROLLO NARRATIVO:

    Integra toda la información extraída en párrafos coherentes y conectados de manera natural, asegurando una lectura fluida y comprensible.
    cuidado al usar viñetas o listas, salvo que se justifique estrictamente su uso (por ejemplo, para ordenar acuerdos específicos). Utilízalos con prudencia para mejorar la claridad, no como una lista de supermercado.
    Prohibido resumir o condensar información, excepto en el caso de la lectura del acta anterior, que es el único tema permitido para resumir.
    El flujo cronológico de los eventos es OBLIGATORIO, con transiciones naturales entre los temas tratados, guiando al lector a través del desarrollo de la reunión.

ESTRUCTURA FINAL:
1. **ENCABEZADO**:
   - Título exacto de la sesión centrado.
   - Fecha y hora precisas de la reunión.
   - Lista completa de asistentes con sus respectivos cargos.
   - Estado del quórum.
      - el listado de temas  u orden del dia: Debe presentar los grandes temas tratados en la reunión en forma de lista estructurada y debe  conicidir con el contenido desarrollado asi que al escribirlo valida si estan los temas desarrollado .  


2. **CUERPO**:
   - Narrativa detallada y continua, siguiendo la separación por temas.
   - De ser neceario y util usa subtitulos bullerts o negritas, todo lo que apote a la compresion y claridad del contenido
   - Cada tema debe esat bien delimitado con un titulo claro y debe respodner al orden del dia
   - Cada párrafo debe conectar naturalmente con el siguiente.
   - Organiza la información de forma clara, manteniendo siempre el enfoque en las decisiones, responsabilidades y plazos.



REGLAS ABSOLUTAS:
- NO OMITIR NINGÚN detalle de la transcripción.
- Asegurate de cubir tods lso temas no me sirve respuest con temas cortados o actas a la mitad
- NO RESUMIR, excepto cuando se trate del acta anterior o si al resumir se mejora el onjetivo para no se r redundates o caer en detalles que noaportan.
- NO INTERPRETAR la información: solo se debe utilizar lo textual.
- NO USAR formato de lista, salvo que sea estrictamente necesario para presentar información estructurada.
- NO FRAGMENTAR la narrativa en secciones aisladas.
- Usa lenguale formal pero facil facil de entender

VALIDACIÓN FINAL:
- ¿Se ha extraído TODA la información de la transcripción?
- ¿La narrativa fluye de manera NATURAL y CONECTADA?
- ¿Se han documentado todas las **decisiones**, **responsabilidades** y **plazos** mencionados en la transcripción?
- ¿Se ha mantenido el máximo nivel de detalle posible en cada sección?
- ¿El documento resultante es AUTOSUFICIENTE y completamente informativo?

RESULTADO ESPERADO:
El resultado debe ser meramente el texto de acta en HTML sin ningun agrado o comentarios  limitate al contenido pedido
El desarrollo del acta debe responder a la seccion de orden de dia, de ser necesario re escribir el orden del dia o el desarolo par que se acomoden de la mejor manera
Un documento narrativo extenso que capture exhaustivamente toda la información de la transcripción, organizada según el análisis de los temas tratados en la reunión, sin omitir ningún detalle relevante, y manteniendo la coherencia y el flujo natural en todo momento.
Asegurate de responde todo sin conrtar temas ya que el benefico es tenerl el acta completa `;
  }
  if (tipo == 2) {
    contentPromt = `INSTRUCCIONES PARA GENERAR ACTA EJECUTIVA

ENTRADA:

Sigue las indicaciones del sistema y procede con la generación del acta de manera detallada y precisa, priorizando la transmisión clara y completa del mensaje. Los detalles son importantes, pero recuerda que se trata de un acta y debe estar escrita como tal, manteniendo un estilo formal y profesional.

TRANSCRIPCIÓN:

${content}

OBLIGATORIO:

    EXTRAE toda la información relevante de la transcripción, incluyendo nombres, cifras, detalles, decisiones, responsabilidades y plazos.
    NO omitas NINGÚN detalle mencionado.
    Para cada tema tratado en la reunión, asegúrate de analizar y plasmar completamente todo lo discutido, sin dejar espacio a generalizaciones o párrafos resumidos.
    CONVIERTE todo el contenido en una narrativa fluida, continua y coherente, prestando especial atención a la precisión y claridad de la información.

PROCESO DE EXTRACCIÓN:

    ANÁLISIS DE TRANSCRIPCIÓN:
            Cuando este escribiendo el contenido reuerda que esto hay que plantearlo de manera facil de asimilar asi que usa mecanismos como subtitulos,bullets, negritas, citas  vineatas o bnullets si consideras que aportan a la narrativa

        Extrae con detalle cada dato, cifra, nombre y detalle relevante.
        REvisa y se calro identificando la fehca y hora de la reunion asi como la hora de cierree
        Identifica y documenta todas las decisiones tomadas.
        Captura y registra los argumentos presentados por cada participante.
        Anota con claridad todas las responsabilidades asignadas.
        Detalla con precisión todos los plazos mencionados durante la reunión.

    ANÁLISIS DE CONTENIDO:
            Cuando este escribiendo el contenido reuerda que esto hay que plantearlo de manera facil de asimilar asi que usa mecanismos como subtitulos,bullets, negritas, citas  vineatas o bnullets si consideras que aportan a la narrativa
        Asegúrate de comprender cuál fue el problema principal a resolver durante la reunión y cómo se abordó.
        Registra cómo se presentaron y discutieron las soluciones propuestas.
        Documenta las decisiones tomadas para resolver los problemas planteados y las razones detrás de esas decisiones.
        Captura las responsabilidades específicas asignadas a cada participante para llevar a cabo las acciones acordadas.
        Asegúrate de que los plazos establecidos para cada acción sean claros y detallados.
        Describe las acciones futuras acordadas y los pasos siguientes necesarios para continuar con el progreso de la reunión.

DESARROLLO NARRATIVO:

    Integra toda la información extraída en párrafos coherentes y conectados de manera natural, asegurando una lectura fluida y comprensible.
    cuidado al usar viñetas o listas, salvo que se justifique estrictamente su uso (por ejemplo, para ordenar acuerdos específicos). Utilízalos con prudencia para mejorar la claridad, no como una lista de supermercado.
    Prohibido resumir o condensar información, excepto en el caso de la lectura del acta anterior, que es el único tema permitido para resumir.
    El flujo cronológico de los eventos es OBLIGATORIO, con transiciones naturales entre los temas tratados, guiando al lector a través del desarrollo de la reunión.

ESTRUCTURA FINAL:

    CUERPO:
        Narrativa detallada y continua, siguiendo la separación por temas.
        De ser necesario y útil, usa subtítulos, bullets o negritas, todo lo que aporte a la comprensión y claridad del contenido, pero sin abusar de ellos.
        Cada tema debe estar bien delimitado con un título claro y debe responder al orden del día.
        Cada párrafo debe conectar naturalmente con el siguiente, construyendo un relato coherente y fácil de seguir.
        Organiza la información de forma clara, manteniendo siempre el enfoque en las decisiones, responsabilidades y plazos, elementos clave del acta.

REGLAS ABSOLUTAS:

    NO OMITIR NINGÚN detalle de la transcripción.
    Asegúrate de cubrir todos los temas, no me sirve respuestas con temas cortados o actas a la mitad.
    NO RESUMIR, excepto cuando se trate del acta anterior o si al resumir se mejora el objetivo para no ser redundantes o caer en detalles que no aportan.
    NO INTERPRETAR la información: solo se debe utilizar lo textual.
    NO USAR formato de lista, salvo que sea estrictamente necesario para presentar información estructurada.
    NO FRAGMENTAR la narrativa en secciones aisladas.
    Usa lenguaje formal pero fácil de entender, evitando jergas o tecnicismos innecesarios.

VALIDACIÓN FINAL:

    ¿Se ha extraído TODA la información de la transcripción?
    ¿La narrativa fluye de manera NATURAL y CONECTADA?
    ¿Se han documentado todas las decisiones, responsabilidades y plazos mencionados en la transcripción?
    ¿Se ha mantenido el máximo nivel de detalle posible en cada sección?
    ¿El documento resultante es AUTOSUFICIENTE y completamente INFORMATIVO?

RESULTADO ESPERADO:
El resultado debe ser meramente el texto de acta en HTML sin ningun agrado o comentarios  limitate al contenido pedido
El desarrollo del acta debe responder a la seccion de orden de dia, de ser necesario re escribir el orden del dia o el desarolo par que se acomoden de la mejor manera
Un documento narrativo extenso que capture exhaustivamente toda la información de la transcripción, organizada según el análisis de los temas tratados en la reunión, sin omitir ningún detalle relevante, y manteniendo la coherencia y el flujo natural en todo momento. Asegúrate de responder todo sin cortar temas, ya que el beneficio es tener el acta completa.`;
  }

  return contentPromt;
}
