import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options/authOptions';
import { getUserIdByEmail } from '@/lib/auth/session/getIdOfEmail';
import { getUserEmailFromSession } from '@/lib/auth/session/getEmailSession';

export async function GET() {
  try {
    const email = await getUserEmailFromSession();
    
    if (!email) {
      return NextResponse.json({ userId: null }, { status: 200 });
    }

    const userId = await getUserIdByEmail(email);
    
    return NextResponse.json({ userId: userId || null });
  } catch (error) {
    console.error('Error al obtener user_id:', error);
    return NextResponse.json({ userId: null }, { status: 500 });
  }
}




