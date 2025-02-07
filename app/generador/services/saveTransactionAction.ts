"use server";

import { createClient } from "@/utils/server";
import { writeLog } from "./utilsActions";

export async function saveTransactionAction(transaccion: {
  transaccion: string;
  referencia: string;
  acta: string;
  valor: string;
  duracion: string;
}) {
  try {
    writeLog(`[${new Date().toISOString()}] Guardando transcipcion.`);

    console.log("Transacción en proceso");
    const supabase = await createClient();

    // 1. Verificar si la transacción ya existe
    const { data: existingTransaction, error: selectError } = await supabase
      .from("transacciones")
      .select("*")
      .eq("transaccion", transaccion.transaccion); // Asumiendo que "transaction" es el campo único

    if (selectError) {
      console.error("Error al verificar la transacción:", selectError);
      return {
        status: "error",
        message: "Error al verificar la transacción",
      };
    }

    // 2. Si no existe, insertar la transacción
    if (existingTransaction && existingTransaction.length === 0) {
      const { error: insertError } = await supabase
        .from("transacciones")
        .insert({
          transaccion: transaccion.transaccion,
          referencia: transaccion.referencia,
          acta: transaccion.acta,
          valor: transaccion.valor,
          duracion: transaccion.duracion, // Asegúrate de incluir 'duracion'
        });

      if (insertError) {
        console.error("Error al guardar la transacción:", insertError);
        return {
          status: "error",
          message: "Error al guardar la transacción",
        };
      } else {
        console.log("Transacción guardada");
        return {
          status: "success",
          message: "Transacción guardada.",
        };
      }
    } else {
      console.log("La transacción ya existe.");
      return {
        status: "warning", // Puedes usar "warning" o otro estado para indicar que ya existe
        message: "La transacción ya existe.",
      };
    }
  } catch (error) {
    console.error("Error en la acción:", error);
    return {
      status: "error",
      message: "Error en la acción", // Mensaje más genérico para el catch
    };
  }
}
