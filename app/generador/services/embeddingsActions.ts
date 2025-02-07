"use server";

import { createClient } from "@/utils/server";
import { obtenerOCrearCarpeta, writeLog } from "./utilsActions";
import {
  autenticarGoogleDrive,
  manejarError,
  obtenerContenidoArchivoDrive,
  verificarArchivoExistente,
  obtenerOpenAI,
} from "./utilsActions";

export async function generateEmbeddings(nombreNormalizado: string) {
  try {
    writeLog(
      `[${new Date().toISOString()}] Iniciando generación de embeddings. ${nombreNormalizado}`
    );

    const drive = await autenticarGoogleDrive();
    const nombreTranscripcion = `${nombreNormalizado.replace(
      /\.[^/.]+$/,
      ""
    )}_Transcripcion.txt`;
    const idCarpeta = await obtenerOCrearCarpeta(drive, nombreNormalizado);

    const transcripcionExistente = await verificarArchivoExistente(
      drive,
      nombreTranscripcion,
      idCarpeta
    );

    if (transcripcionExistente) {
      const contenido = await obtenerContenidoArchivoDrive(
        drive,
        transcripcionExistente
      );
      //@ts-expect-error revisar despues

      const fragmentos = dividirTranscripcion(contenido);
      const embeddings = [];

      for (const fragmento of fragmentos) {
        const embedding = await generarEmbedding(fragmento);
        embeddings.push({ texto: fragmento, embedding });

        const result = await saveEmbedding(
          nombreNormalizado,
          fragmento,
          embedding
        );
        if (result.status === "error") {
          console.error("Error al guardar embedding:", result.message);
        }
      }
      console.log("Embeddings:", embeddings);
      return {
        status: "success",
        message: "Embeddings generados y guardados correctamente.",
      };
    } else {
      return {
        status: "error",
        message: "No se encontró el archivo de transcripción.",
      };
    }
  } catch (error) {
    manejarError("generateEmbeddings", error);
    return {
      status: "error",
      message: "Error en la generación de embeddings.",
    };
  }
}

function dividirTranscripcion(transcripcion: string): string[] {
  const fragmentos: string[] = [];
  const longitudMaxima = 600;
  const buffer = 20;

  for (let i = 0; i < transcripcion.length; i += longitudMaxima - buffer) {
    let finFragmento = i + longitudMaxima;

    // Ajustar finFragmento para no cortar palabras (buscar el último espacio en blanco antes de la longitud máxima)
    if (finFragmento < transcripcion.length) {
      let ultimoEspacio = transcripcion.lastIndexOf(" ", finFragmento);
      if (ultimoEspacio > i) {
        // Asegurarse de que se encontró un espacio y no está al principio del fragmento
        finFragmento = ultimoEspacio;
      } else {
        // No se encontraron espacios, dividir en el límite exacto (esto es menos ideal)
        finFragmento = i + longitudMaxima;
      }
    } else {
      //Para que no se pase del limite del texto
      finFragmento = transcripcion.length;
    }

    fragmentos.push(transcripcion.slice(i, finFragmento).trim()); // Usar trim() para eliminar espacios en blanco al principio y al final
  }
  return fragmentos;
}

async function generarEmbedding(texto: string): Promise<number[]> {
  try {
    const openai = await obtenerOpenAI();
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: texto,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error al generar embedding:", error);
    throw new Error(`Error en la generación de embeddings: ${error}`);
  }
}

export async function saveEmbedding(
  nombreNormalizado: string,
  fragmento: string,
  embedding: number[]
) {
  try {
    writeLog(`[${new Date().toISOString()}] Guardando embedding.`);

    const supabase = await createClient();

    const { error } = await supabase.from("embeddings").insert([
      {
        acta: nombreNormalizado,
        texto: fragmento,
        embedding: embedding,
      },
    ]);

    if (error) {
      console.error("Error al guardar embedding en Supabase:", error);
      return {
        status: "error",
        message: "Error al guardar embedding",
      };
    }

    console.log("Embedding guardado en Supabase.");
    return {
      status: "success",
      message: "Embedding guardado.",
    };
  } catch (error) {
    console.error("Error en saveEmbedding:", error);
    return {
      status: "error",
      message: "Error en saveEmbedding",
    };
  }
}
