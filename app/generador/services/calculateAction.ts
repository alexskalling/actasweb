"use server";

import { uploadFileAction } from "./uploadFileAction";
import { normalizarNombreArchivo } from "./utilsActions";

export async function CalculateAction(formData: unknown) {
  try {
    console.log(
      "Proceso de normalizacion de nombre y subida de archivo iniciado."
    );

    //@ts-expect-error revisar despues
    const archivo = formData.get("file");
    const nombreNormalizado = await normalizarNombreArchivo(archivo.name);
    console.log("nombre ok");
    const upload = await uploadFileAction(formData, nombreNormalizado);
    if (upload?.status === "success") {
      console.log("Nombre normalizado y guardado correctamente.");
      return {
        status: "success",
        name: nombreNormalizado,
        message: "Calculo listo.",
      };
    }

    return { status: "error", message: "Error al subir el archivo" };
  } catch (error) {
    console.error("Error en la acción del proceso:", error);
    return { status: "error", message: "Error en la acción del proceso" };
  }
}
