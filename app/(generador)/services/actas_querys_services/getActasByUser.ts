'use server';

import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas, estadosProceso } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getActasByUser() {
  try {
    const mail = await getUserEmailFromSession();
    let user_id;
    
    if (!mail) {
      user_id = 'a817fffe-bc7e-4e29-83f7-b512b039e817';
    } else {
      user_id = await getUserIdByEmail(mail);
      if (!user_id) {
        user_id = 'a817fffe-bc7e-4e29-83f7-b512b039e817';
      }
    }

    // Obtener todas las actas del usuario con el nombre del estado desde la tabla estados_proceso
    const userActas = await db.select({
      id: actas.id,
      nombre: actas.nombre,
      tx: actas.tx,
      costo: actas.costo,
      duracion: actas.duracion,
      urlTranscripcion: actas.urlTranscripcion,
      urlBorrador: actas.urlBorrador,
      urlAssembly: actas.urlAssembly,
      idEstadoProceso: actas.idEstadoProceso,
      fechaProcesamiento: actas.fechaProcesamiento,
      nombreEstado: estadosProceso.nombre
    })
    .from(actas)
    .leftJoin(estadosProceso, eq(actas.idEstadoProceso, estadosProceso.id))
    .where(eq(actas.idUsuario, user_id))
    .orderBy(desc(actas.fechaProcesamiento));

    console.log("Actas obtenidas para el usuario:", user_id);
    return { 
      status: 'success', 
      data: userActas 
    };
  } catch (error) {
    console.error("❌ Error al obtener las actas del usuario:", error);
    return { 
      status: 'error', 
      message: 'Error al obtener las actas',
      data: [] 
    };
  }
} 