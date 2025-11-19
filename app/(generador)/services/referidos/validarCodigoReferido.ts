'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { usuarios, actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Valida un código de referido
 * @param codigoReferido Código a validar (debe estar en mayúsculas)
 * @returns Objeto con validación y datos del usuario que refirió
 */
export async function validarCodigoReferido(
  codigoReferido: string
): Promise<{
  valido: boolean;
  mensaje?: string;
  idUsuarioReferidor?: string;
}> {
  try {
    // Normalizar código a mayúsculas
    const codigoNormalizado = codigoReferido.trim().toUpperCase();

    if (!codigoNormalizado || codigoNormalizado.length !== 7) {
      return {
        valido: false,
        mensaje: 'Código de referido no válido',
      };
    }

    // Obtener usuario actual
    const mail = await getUserEmailFromSession();
    if (!mail) {
      return {
        valido: false,
        mensaje: 'No se pudo identificar al usuario',
      };
    }

    const user_id = await getUserIdByEmail(mail);
    if (!user_id) {
      return {
        valido: false,
        mensaje: 'No se pudo identificar al usuario',
      };
    }

    // Verificar que el código existe en la base de datos
    const usuarioConCodigo = await db
      .select({
        id: usuarios.id,
        codigoReferido: usuarios.codigoReferido,
      })
      .from(usuarios)
      .where(eq(usuarios.codigoReferido, codigoNormalizado))
      .limit(1)
      .then((res) => res[0]);

    if (!usuarioConCodigo) {
      return {
        valido: false,
        mensaje: 'Código de referido no válido',
      };
    }

    // Verificar que el usuario no está usando su propio código
    if (usuarioConCodigo.id === user_id) {
      return {
        valido: false,
        mensaje: 'No puedes usar tu propio código de referido',
      };
    }

    // Verificar si el usuario ya tiene alguna acta con código de referido (cualquiera)
    // Obtener todas las actas del usuario para verificar si alguna tiene código de referido
    const todasLasActas = await db
      .select({ 
        id: actas.id,
        codigoReferido: actas.codigoReferido,
      })
      .from(actas)
      .where(eq(actas.idUsuario, user_id));

    // Verificar si alguna acta tiene código de referido (no null y no vacío)
    const tieneCodigoReferido = todasLasActas.some(
      (acta) => acta.codigoReferido !== null && acta.codigoReferido.trim() !== ''
    );

    if (tieneCodigoReferido) {
      return {
        valido: false,
        mensaje: 'Ya has usado un código de referido anteriormente',
      };
    }

    // Todo está bien
    return {
      valido: true,
      idUsuarioReferidor: usuarioConCodigo.id,
    };
  } catch (error) {
    console.error("Error al validar código de referido:", error);
    return {
      valido: false,
      mensaje: 'Error al validar el código de referido',
    };
  }
}

