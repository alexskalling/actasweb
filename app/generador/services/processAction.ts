"use server";
import { formatContent } from "./formatContent";
import { generateContenta } from "./generateContenta";

export async function processAction(name: string) {
  try {
    console.log("Transacción en proceso" + name);

    const contenido = await generateContenta(name);
    if (contenido?.status !== "success") {
      console.log("Error en la generación de contenidos");
      return {
        status: "error",
        message: "Error en la generación de contenidos",
      };
    }
    console.log("Contenido listo");

    // Formateo de contenido
    const formato = await formatContent(name);
    if (formato?.status !== "success") {
      console.log("Error formateando el acta");
      return {
        status: "error",
        message: "Error formateando el acta",
      };
    }
    console.log("Acta lista");

    return {
      status: "success",
      message: "Acta lista",
      transcripcion: formato.trasncripcion,
      acta: formato.acta,
    };
  } catch (error) {
    console.error("Error en la acción del proceso:", error);
    return {
      status: "error",
      message: "Error en el proceso de acción",
    };
  }
}
