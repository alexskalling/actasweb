"use server";
import { generateContenta } from "./generateContenta";
import { refineContentAction } from "./refineContentAction";
import { transcripAction } from "./transcriptAction";
import { ActualizarProceso } from "../actas_querys_services/actualizarProceso";
import { sendActaEmail } from "@/app/Emails/actions/sendEmails";
import { consumirMinutos } from "../codigos_atencion/consumirMinutos";
import { liberarReserva } from "../codigos_atencion/liberarReserva";
import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";

export async function processAction(
  folder: string,
  file: string,
  urlAssembly: string,
  email: string,
  name: string,
  automation?: boolean,
  codigoAtencion?: string,
  idUsuarioActa?: string,
  tipoAtencion?: "acta_nueva" | "regeneracion_total" | null,
) {
  try {
    const convertirDuracionAMinutos = (
      duracion: string | null | undefined,
    ): number => {
      if (!duracion) return 0;
      const numero = parseFloat(duracion);
      if (!isNaN(numero) && !duracion.includes(":")) {
        return numero;
      }
      if (duracion.includes(":")) {
        const partes = duracion.split(":");
        if (partes.length === 3) {
          const horas = parseInt(partes[0], 10) || 0;
          const minutos = parseInt(partes[1], 10) || 0;
          const segundos = parseInt(partes[2], 10) || 0;
          return horas * 60 + minutos + Math.ceil(segundos / 60);
        }
      }
      return 0;
    };

    let duracionMinutos = 0;
    try {
      let user_id;

      if (idUsuarioActa) {
        user_id = idUsuarioActa;
        console.log(`[processAction] Usando idUsuarioActa proporcionado: ${user_id}`);
      } else {
        const mail = await getUserEmailFromSession();

        if (mail) {
          try {
            user_id = await getUserIdByEmail(mail);
            if (!user_id) {
              user_id = automation
                ? "7ac85184-20a5-4a44-a8a3-bd1aaad138d5"
                : "a817fffe-bc7e-4e29-83f7-b512b039e817";
            }
          } catch (error) {
            user_id = automation
              ? "7ac85184-20a5-4a44-a8a3-bd1aaad138d5"
              : "a817fffe-bc7e-4e29-83f7-b512b039e817";
          }
        } else {
          user_id = automation
            ? "7ac85184-20a5-4a44-a8a3-bd1aaad138d5"
            : "a817fffe-bc7e-4e29-83f7-b512b039e817";
        }
        console.log(`[processAction] Usando user_id de sesión: ${user_id}`);
      }

      console.log(`[processAction] Buscando acta con nombre: ${file}, user_id: ${user_id}`);
      const actaEncontrada = await db
        .select({
          duracion: actas.duracion,
        })
        .from(actas)
        .where(and(eq(actas.nombre, file), eq(actas.idUsuario, user_id)))
        .then((res) => res[0]);

      if (actaEncontrada?.duracion) {
        duracionMinutos = convertirDuracionAMinutos(actaEncontrada.duracion);
        console.log(`[processAction] Duración encontrada: ${actaEncontrada.duracion}, minutos: ${duracionMinutos}`);
      } else {
        console.log(`[processAction] No se encontró acta con nombre: ${file} y user_id: ${user_id}`);
      }
    } catch (error) {
      console.error("Error al obtener duración:", error);
    }

    const transcribe = await transcripAction(folder, file, urlAssembly);
    if (transcribe?.status !== "success") {
      return {
        status: "error",
        message: "Error en la generación de trasncripcion",
      };
    }

    const transcripcionYaExistia = transcribe.yaExistia === true;

    const esIdUsuarioSoporte =
      codigoAtencion &&
      codigoAtencion.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

    if (
      codigoAtencion &&
      transcribe.status === "success" &&
      !esIdUsuarioSoporte
    ) {
      try {
        if (duracionMinutos <= 0) {
          console.log(`[processAction] Duración no encontrada en primera búsqueda, intentando segunda búsqueda...`);
          let user_id;

          if (idUsuarioActa) {
            user_id = idUsuarioActa;
            console.log(`[processAction] Segunda búsqueda usando idUsuarioActa: ${user_id}`);
          } else {
            const mail = await getUserEmailFromSession();

            if (mail) {
              try {
                user_id = await getUserIdByEmail(mail);
                if (!user_id) {
                  user_id = automation
                    ? "7ac85184-20a5-4a44-a8a3-bd1aaad138d5"
                    : "a817fffe-bc7e-4e29-83f7-b512b039e817";
                }
              } catch (error) {
                user_id = automation
                  ? "7ac85184-20a5-4a44-a8a3-bd1aaad138d5"
                  : "a817fffe-bc7e-4e29-83f7-b512b039e817";
              }
            } else {
              user_id = automation
                ? "7ac85184-20a5-4a44-a8a3-bd1aaad138d5"
                : "a817fffe-bc7e-4e29-83f7-b512b039e817";
            }
            console.log(`[processAction] Segunda búsqueda usando user_id de sesión: ${user_id}`);
          }

          console.log(`[processAction] Segunda búsqueda - nombre: ${file}, user_id: ${user_id}`);
          const actaEncontrada = await db
            .select({
              duracion: actas.duracion,
            })
            .from(actas)
            .where(and(eq(actas.nombre, file), eq(actas.idUsuario, user_id)))
            .then((res) => res[0]);

          if (actaEncontrada?.duracion) {
            duracionMinutos = convertirDuracionAMinutos(
              actaEncontrada.duracion,
            );
            console.log(`[processAction] Duración encontrada en segunda búsqueda: ${actaEncontrada.duracion}, minutos: ${duracionMinutos}`);
          } else {
            console.log(`[processAction] No se encontró acta en segunda búsqueda con nombre: ${file} y user_id: ${user_id}`);
          }
        }

        if (duracionMinutos > 0) {
          const duracionSegundosParaFunciones = duracionMinutos * 60;

          if (transcripcionYaExistia) {
            await liberarReserva(codigoAtencion, duracionSegundosParaFunciones);
          } else {
            const resultado = await consumirMinutos(
              codigoAtencion,
              duracionSegundosParaFunciones,
            );
            if (!resultado.success) {
              throw new Error(
              );
            }
          }
        } else {
          throw new Error(
            "No se pudo obtener la duración del acta para consumir minutos",
          );
        }
      } catch (error) {
        console.error("Error al procesar minutos:", error);
        throw error;
      }
    }

    const contenido = await generateContenta(
      folder,
      file,
      urlAssembly,
      transcribe.content as string,
    );
    if (contenido?.status !== "success") {
      return {
        status: "error",
        message: "Error en la generación de contenidos",
      };
    }

    // Refinar el contenido generado por la IA
    console.log("[processAction] Iniciando refinamiento de contenido...");
    const refinedContentResult = await refineContentAction(folder, file);

    let contenidoParaFormatear: string;

    if (refinedContentResult.status === "success" && refinedContentResult.content) {
      console.log("[processAction] Usando contenido refinado para generar el borrador.");
      contenidoParaFormatear = refinedContentResult.content;
    } else {
      console.warn(`[processAction] ADVERTENCIA: No se pudo refinar el contenido, se usará el contenido original. Motivo: ${refinedContentResult.message}`);
      contenidoParaFormatear = contenido.content as string;
    }

    const formato = await formatContent(
      folder,
      file,
      contenidoParaFormatear,
    );
    if (formato?.status !== "success") {
      return {
        status: "error",
        message: "Error formateando el acta",
      };
    }

    if (!formato.transcripcion || !formato.acta) {
      return {
        status: "error",
        message: "Error: No se pudieron generar las URLs del acta",
      };
    }

    const urlTranscripcion = String(formato.transcripcion).trim();
    const urlBorrador = String(formato.acta).trim();

    if (!urlTranscripcion || !urlBorrador) {
      return {
        status: "error",
        message: "Error: Las URLs del acta están vacías",
      };
    }

    try {
      const txValue = esIdUsuarioSoporte
        ? undefined
        : codigoAtencion
          ? "pago con codigo"
          : undefined;

      const resultado = await ActualizarProceso(
        file, // 1. nombre
        6, // 2. idEstadoProceso
        undefined, // 3. duracion
        undefined, // 4. costo
        txValue, // 5. tx
        undefined, // 6. urlAssembly
        undefined, // 7. referencia
        urlTranscripcion, // 8. urlTranscripcion
        urlBorrador, // 9. urlborrador
        formato.contenido || null, // 10. urlContenido
        automation, // 11. automation
        codigoAtencion || null, // 12. codigoAtencion
        automation ? email : null, // 13. automation_mail
        undefined, // 14. codigoReferido
        undefined, // 15. soporte
        idUsuarioActa || undefined, // 16. idUsuarioActa
      );

      if (resultado.status !== "success") {
        throw new Error(resultado.message || "Error al guardar URLs");
      }
    } catch (err) {
      console.error("Error al actualizar acta con URLs:", err);
      throw err;
    }

    if (email) {
      await sendActaEmail(email, name, urlBorrador, urlTranscripcion, file);

      await ActualizarProceso(
        file, // 1. nombre
        7, // 2. idEstadoProceso
        undefined, // 3. duracion
        undefined, // 4. costo
        undefined, // 5. tx
        undefined, // 6. urlAssembly
        undefined, // 7. referencia
        undefined, // 8. urlTranscripcion
        undefined, // 9. urlborrador
        undefined, // 10. urlContenido
        automation, // 11. automation
        undefined, // 12. codigoAtencion
        automation ? email : null, // 13. automation_mail
        undefined, // 14. codigoReferido
        undefined, // 15. soporte
        idUsuarioActa || undefined, // 16. idUsuarioActa
      );
    }

    return {
      status: "success",
      message: "Acta lista",
      transcripcion: formato.transcripcion,
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

async function formatContent(
  folder: string,
  file: string,
  contenidoParaFormatear: string,
): Promise<{
  status: "success" | "error";
  message?: string;
  transcripcion?: string;
  acta?: string;
  contenido?: string;
}> {
  console.log(`[formatContent] Formatting content for: ${file}`);
  // TODO: Implement your actual content formatting logic here.
  // This is a placeholder implementation.
  // For now, it returns a success object with placeholder URLs.
  return { status: "success", transcripcion: "url/to/transcripcion", acta: "url/to/acta", contenido: contenidoParaFormatear };
}
