import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Crear la respuesta inicial
  let response = NextResponse.next({
    request,
  });

  // Inicializar el cliente de Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Verificar el usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Definir rutas públicas
  const publicRoutes = [
    "/login",
    "/ubicacion",
    "/register",
    "/reset",
    "/recovery",
    "/",
    "/entradas",
    "/agenda",
    "/newsletter",
    "/plataforma",
  ];


  // Si todo está bien, continuar con la respuesta normal
  return response;
}
