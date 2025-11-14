"use server";
import { formatContent } from "./formatContent";
import { generateContenta } from "./generateContenta";
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
  codigoAtencion?: string
) {
  try {
    const convertirDuracionAMinutos = (duracion: string | null | undefined): number => {
      if (!duracion) return 0;
      const numero = parseFloat(duracion);
      if (!isNaN(numero) && !duracion.includes(':')) {
        return numero;
      }
      if (duracion.includes(':')) {
        const partes = duracion.split(':');
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
      const mail = await getUserEmailFromSession();
      let user_id;
      
      if (mail) {
        try {
          user_id = await getUserIdByEmail(mail);
          if (!user_id) {
            user_id = automation 
              ? '7ac85184-20a5-4a44-a8a3-bd1aaad138d5' 
              : 'a817fffe-bc7e-4e29-83f7-b512b039e817';
          }
        } catch (error) {
          user_id = automation 
            ? '7ac85184-20a5-4a44-a8a3-bd1aaad138d5' 
            : 'a817fffe-bc7e-4e29-83f7-b512b039e817';
        }
      } else {
        user_id = automation 
          ? '7ac85184-20a5-4a44-a8a3-bd1aaad138d5' 
          : 'a817fffe-bc7e-4e29-83f7-b512b039e817';
      }

      const actaEncontrada = await db
        .select({
          duracion: actas.duracion,
        })
        .from(actas)
        .where(
          and(
            eq(actas.nombre, file),
            eq(actas.idUsuario, user_id)
          )
        )
        .then((res) => res[0]);

      if (actaEncontrada?.duracion) {
        duracionMinutos = convertirDuracionAMinutos(actaEncontrada.duracion);
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
    
    if (codigoAtencion && transcribe.status === "success") {
      try {
        if (duracionMinutos <= 0) {
          const mail = await getUserEmailFromSession();
          let user_id;
          
          if (mail) {
            try {
              user_id = await getUserIdByEmail(mail);
              if (!user_id) {
                user_id = automation 
                  ? '7ac85184-20a5-4a44-a8a3-bd1aaad138d5' 
                  : 'a817fffe-bc7e-4e29-83f7-b512b039e817';
              }
            } catch (error) {
              user_id = automation 
                ? '7ac85184-20a5-4a44-a8a3-bd1aaad138d5' 
                : 'a817fffe-bc7e-4e29-83f7-b512b039e817';
            }
          } else {
            user_id = automation 
              ? '7ac85184-20a5-4a44-a8a3-bd1aaad138d5' 
              : 'a817fffe-bc7e-4e29-83f7-b512b039e817';
          }

          const actaEncontrada = await db
            .select({
              duracion: actas.duracion,
            })
            .from(actas)
            .where(
              and(
                eq(actas.nombre, file),
                eq(actas.idUsuario, user_id)
              )
            )
            .then((res) => res[0]);

          if (actaEncontrada?.duracion) {
            duracionMinutos = convertirDuracionAMinutos(actaEncontrada.duracion);
          }
        }

        if (duracionMinutos > 0) {
          const duracionSegundosParaFunciones = duracionMinutos * 60;
          
          if (transcripcionYaExistia) {
            await liberarReserva(codigoAtencion, duracionSegundosParaFunciones);
          } else {
            const resultado = await consumirMinutos(codigoAtencion, duracionSegundosParaFunciones);
            if (!resultado.success) {
              throw new Error(`Error al consumir ${duracionMinutos} minutos: ${resultado.message}`);
            }
          }
        } else {
          throw new Error("No se pudo obtener la duración del acta para consumir minutos");
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
      transcribe.content as string
    );
    if (contenido?.status !== "success") {
      return {
        status: "error",
        message: "Error en la generación de contenidos",
      };
    }

    const formato = await formatContent(
      folder,
      file,
      contenido.content as string
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
      const resultado = await ActualizarProceso(
        file,
        6,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        urlTranscripcion,
        urlBorrador,
        automation,
        codigoAtencion || null,
        automation ? email : undefined
      );
      
      if (resultado.status !== 'success') {
        throw new Error(resultado.message || "Error al guardar URLs");
      }
    } catch (err) {
      console.error("Error al actualizar acta con URLs:", err);
      throw err;
    }
    
    if (email) {
      await sendActaEmail(email, name, urlBorrador, urlTranscripcion, file);
      
      await ActualizarProceso(
        file,
        7,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        automation,
        undefined,
        automation ? email : undefined
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
