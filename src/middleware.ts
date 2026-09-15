import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const RUTAS_PRIVADAS = ["/dashboard", "/mapa", "/rutas", "/admin"];
const RUTA_ACCESO = "/acceso";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Redirigir a /acceso si la ruta es privada y no hay sesión
  if (!user && RUTAS_PRIVADAS.some((ruta) => pathname.startsWith(ruta))) {
    const url = request.nextUrl.clone();
    url.pathname = RUTA_ACCESO;
    return NextResponse.redirect(url);
  }

  // Redirigir a / si ya tiene sesión y está en /acceso
  if (user && pathname === RUTA_ACCESO) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
