import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailFromSession } from "@/lib/auth/session/getEmailSession";
import { getUserIdByEmail } from "@/lib/auth/session/getIdOfEmail";
import { db } from "@/lib/db/db";
import { actas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const file = searchParams.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Falta el parámetro file' }, { status: 400 });
    }

    const mail = await getUserEmailFromSession();
    const user_id = !mail
      ? 'a817fffe-bc7e-4e29-83f7-b512b039e817'
      : (await getUserIdByEmail(mail)) || 'a817fffe-bc7e-4e29-83f7-b512b039e817';

    const actaEncontrada = await db
      .select({
        idEstadoProceso: actas.idEstadoProceso,
        nombre: actas.nombre,
      })
      .from(actas)
      .where(
        and(
          eq(actas.nombre, file),
          eq(actas.idUsuario, user_id)
        )
      )
      .limit(1);

    if (actaEncontrada.length === 0) {
      return NextResponse.json({ estado: null, message: 'Acta no encontrada' });
    }

    return NextResponse.json({ 
      estado: actaEncontrada[0].idEstadoProceso,
      nombre: actaEncontrada[0].nombre
    });

  } catch (error) {
    console.error('Error al verificar estado del acta:', error);
    return NextResponse.json({ 
      error: 'Error al verificar estado',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}


