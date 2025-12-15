"use server";

import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import {
  manejarError,
  writeLog,
  obtenerContenidoArchivo,
  guardarArchivo,
  verificarArchivoExistente,
} from "./utilsActions";

interface RefineResult {
  status: "success" | "error";
  message: string;
  content?: string;
}

/**
 * Compara el contenido del acta generada con la transcripción original para
 * eliminar redundancias y asegurar que la información esté correctamente ubicada.
 * @param folder - La carpeta del acta.
 * @param file - El nombre base del archivo del acta.
 * @returns Un objeto con el estado del proceso y el contenido refinado.
 */
export async function refineContentAction(
  folder: string,
  file: string,
): Promise<RefineResult> {
  const nombreContenido = `${file.replace(/\.[^/.]+$/, "")}_Contenido.txt`;
  const nombreTranscripcion = `${file.replace(/\.[^/.]+$/, "")}_Transcripcion.txt`;
  const nombreContenidoRefinado = `${file.replace(
    /\.[^/.]+$/,
    "",
  )}_Contenido_Refinado.txt`;

  try {
    writeLog(`[REFINAMIENTO] Iniciando proceso para: ${file}`);

    // 1. Verificar y obtener el contenido del acta generada
    const contenidoActaExiste = await verificarArchivoExistente(nombreContenido, folder);
    if (!contenidoActaExiste) {
 return { status: "error", message: `El archivo de contenido '${nombreContenido}' no existe.` };
    }
    const contenidoActa = await obtenerContenidoArchivo(folder, nombreContenido);
    if (!contenidoActa) {
 return { status: "error", message: `El archivo de contenido '${nombreContenido}' está vacío.` };
    }

    // 2. Verificar y obtener la transcripción original
    const contenidoTranscripcionExiste = await verificarArchivoExistente(
 nombreTranscripcion,
 folder,
 );
    if (!contenidoTranscripcionExiste) {
 return { status: "error", message: `El archivo de transcripción '${nombreTranscripcion}' no existe.` };
    }
    const contenidoTranscripcion = await obtenerContenidoArchivo(
      folder,
      nombreTranscripcion,
    );
    if (!contenidoTranscripcion) {
 return { status: "error", message: `El archivo de transcripción '${nombreTranscripcion}' está vacío.` };
    }

    writeLog(`[REFINAMIENTO] Contenido y transcripción leídos. Enviando a IA para comparación.`);

    // 3. Enviar a la IA para refinar
    const { text: contenidoRefinado } = await generateText({
      model: google("gemini-1.5-pro-latest"),
      system: `Eres un editor experto y analista de contenido. Tu tarea es comparar dos documentos: una transcripción de reunión y un borrador de acta generado a partir de ella. Debes refinar el borrador del acta para eliminar todas las redundancias, corregir la ubicación de la información y asegurar que cada detalle esté en la sección temática correcta, siguiendo el flujo lógico y cronológico de la transcripción original. El resultado final debe ser un acta impecable, coherente y sin información duplicada, en formato HTML.`,
      prompt: `Por favor, refina el siguiente borrador de acta usando la transcripción como la fuente de verdad.

### TRANSCRIPCIÓN ORIGINAL (Fuente de Verdad):
---
${contenidoTranscripcion}
---

### BORRADOR DE ACTA A REFINAR:
---
${contenidoActa}
---

Tu tarea es:
1.  **Eliminar Redundancias:** Si un mismo punto se menciona en varias secciones del borrador, consolídalo en la sección más apropiada según la transcripción.
2.  **Reubicar Información:** Si un detalle está en un tema incorrecto, muévelo a donde corresponde cronológicamente.
3.  **Asegurar Coherencia:** El acta refinada debe leerse de forma fluida y lógica.
4.  **Mantener el Formato:** Devuelve el resultado final únicamente en formato HTML, sin añadir comentarios ni texto introductorio.`,
    });

    if (!contenidoRefinado || contenidoRefinado.trim() === "") {
 return { status: "error", message: "La IA devolvió un contenido refinado vacío." };
    }

    writeLog(`[REFINAMIENTO] Contenido refinado recibido. Guardando en: ${nombreContenidoRefinado}`);

    // 4. Guardar el nuevo contenido refinado
    await guardarArchivo(folder, nombreContenidoRefinado, contenidoRefinado);

    return {
      status: "success",
      message: "El contenido del acta ha sido refinado y guardado exitosamente.",
      content: contenidoRefinado,
    };
  } catch (error) {
 return { status: "error", message: `Error al refinar el contenido del acta: ${error instanceof Error ? error.message : String(error)}` };
  }
}