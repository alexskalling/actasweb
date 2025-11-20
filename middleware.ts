import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const pathname = request.nextUrl.pathname;

  // Si estamos en la página principal (login), permitir acceso sin autenticación
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Si no hay sesión -> redirige al login (página principal)
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Restricción especial: solo rol 3 puede entrar a /empresas/plataforma
  if (request.nextUrl.pathname.startsWith("/empresas/plataforma")) {
    if (token.role !== 3) {
      return NextResponse.redirect(new URL("/", request.url)); // o donde quieras mandarlos
    }
  }

  // Si hay sesión y permisos -> continua normalmente
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};