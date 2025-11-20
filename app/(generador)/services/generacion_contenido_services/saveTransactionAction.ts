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

    const supabase = await createClient();

    const { data: existingTransaction, error: selectError } = await supabase
      .from("transacciones")
      .select("*")
      .eq("transaccion", transaccion.transaccion);

    if (selectError) {
      console.error("Error al verificar la transacción:", selectError);
      return {
        status: "error",
        message: "Error al verificar la transacción",
      };
    }

    if (existingTransaction && existingTransaction.length === 0) {
      const { error: insertError } = await supabase
        .from("transacciones")
        .insert({
          transaccion: transaccion.transaccion,
          referencia: transaccion.referencia,
          acta: transaccion.acta,
          valor: transaccion.valor,
          duracion: transaccion.duracion,
        });

      if (insertError) {
        console.error("Error al guardar la transacción:", insertError);
        return {
          status: "error",
          message: "Error al guardar la transacción",
        };
      } else {
        return {
          status: "success",
          message: "Transacción guardada.",
        };
      }
    } else {
      return {
        status: "warning",
        message: "La transacción ya existe.",
      };
    }
  } catch (error) {
    console.error("Error en la acción:", error);
    return {
      status: "error",
      message: "Error en la acción",
    };
  }
}
