"use server";

import { db } from "@/lib/db/db";
import { actas, usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendActaEmail } from "@/app/Emails/actions/sendEmails";
import { ActualizarProceso } from "./actualizarProceso";
import { writeLog } from "../generacion_contenido_services/utilsActions";

export async function reenviarCorreoActa(idActa: string) {
  try {
    writeLog(`Iniciando reenvío de correo para acta ID: ${idActa}`);

    const actaConUsuario = await db
      .select({
        id: actas.id,
        nombre: actas.nombre,
        urlBorrador: actas.urlBorrador,
        urlTranscripcion: actas.urlTranscripcion,
        idEstadoProceso: actas.idEstadoProceso,
        emailUsuario: usuarios.email,
        nombreUsuario: usuarios.nombre,
      })
      .from(actas)
      .leftJoin(usuarios, eq(actas.idUsuario, usuarios.id))
      .where(eq(actas.id, idActa))
      .limit(1)
      .then((res) => res[0]);

    if (!actaConUsuario) {
      console.error(`❌ [REENVIO] No se encontró el acta con ID: ${idActa}`);
      return {
        status: "error",
        message: "Acta no encontrada",
      };
    }

    if (!actaConUsuario.nombre) {
      console.error(`❌ [REENVIO] El acta no tiene nombre`);
      return {
        status: "error",
        message: "El acta no tiene nombre",
      };
    }

    if (!actaConUsuario.urlBorrador || !actaConUsuario.urlTranscripcion) {
      console.error(
      );
      return {
        status: "error",
        message: "El acta no tiene URLs de borrador o transcripción",
      };
    }

    if (!actaConUsuario.emailUsuario) {
      console.error(`❌ [REENVIO] El usuario del acta no tiene email`);
      return {
        status: "error",
        message: "El usuario del acta no tiene email registrado",
      };
    }

    if (actaConUsuario.idEstadoProceso !== 6) {
      console.error(
      );
      return {
        status: "error",
        message: "El acta debe estar en estado 6 para reenviar el correo",
      };
    }

    writeLog(`Enviando correo a: ${actaConUsuario.emailUsuario}`);

    const resultadoEnvio = await sendActaEmail(
      actaConUsuario.emailUsuario,
      actaConUsuario.nombreUsuario || "Usuario",
      actaConUsuario.urlBorrador,
      actaConUsuario.urlTranscripcion,
      actaConUsuario.nombre,
    );

    if (!resultadoEnvio.success) {
      console.error(
        resultadoEnvio.error,
      );
      return {
        status: "error",
        message: "Error al enviar el correo",
      };
    }


    const resultadoActualizacion = await ActualizarProceso(
      actaConUsuario.nombre, // 1. nombre
      7, // 2. idEstadoProceso
      undefined, // 3. duracion
      undefined, // 4. costo
      undefined, // 5. tx
      undefined, // 6. urlAssembly
      undefined, // 7. referencia
      undefined, // 8. urlTranscripcion
      undefined, // 9. urlborrador
      undefined, // 10. urlContenido
      false, // 11. automation
      undefined, // 12. codigoAtencion
      undefined, // 13. automation_mail
      undefined, // 14. codigoReferido
      undefined, // 15. soporte
      undefined, // 16. idUsuarioActa
    );

    if (resultadoActualizacion.status !== "success") {
      console.error(
      );
      return {
        status: "error",
        message: `Correo enviado pero error al actualizar estado: ${resultadoActualizacion.message}`,
      };
    }

    writeLog(`Correo reenviado exitosamente para acta ID: ${idActa}`);

    return {
      status: "success",
      message: "Correo reenviado exitosamente",
    };
  } catch (error) {
    console.error(`❌ [REENVIO] Error en reenviarCorreoActa:`, error);
    writeLog(`Error en reenviarCorreoActa: ${error}`);
    return {
      status: "error",
      message: `Error al reenviar correo: ${error instanceof Error ? error.message : "Error desconocido"}`,
    };
  }
}
