import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    const hasSessionCookie = !!getSessionCookie(request);

    // Fast-path: Si no hay cookie de sesión y se intenta acceder a dashboard, redirigir inmediatamente
    if (isDashboard && !hasSessionCookie) {
        return NextResponse.redirect(new URL("/signin", request.url));
    }

    // Obtener sesión usando los headers de la petición entrante (NextRequest)
    let session = null;
    if (hasSessionCookie) {
        try {
            session = await auth.api.getSession({
                headers: request.headers
            });
        } catch (error) {
            console.error("[Proxy] Error verificando sesión:", error);
        }
    }

    // Si la cookie es inválida o expiró y está en ruta protegida
    if (isDashboard && !session) {
        return NextResponse.redirect(new URL("/signin", request.url));
    }

    const role = session?.user?.role || "student";

    // Redireccionar usuarios autenticados fuera de las páginas públicas
    if (session && (pathname === "/" || pathname === "/signin" || pathname === "/signup")) {
        if (role === "admin" || role === "observer") {
            return NextResponse.redirect(new URL("/dashboard/admin", request.url));
        }
        if (role === "gestor") {
            return NextResponse.redirect(new URL("/dashboard/gestor", request.url));
        }
        if (role === "teacher") {
            return NextResponse.redirect(new URL("/dashboard/teacher", request.url));
        }
        return NextResponse.redirect(new URL("/dashboard/student", request.url));
    }

    // Control de acceso basado en roles para subrutas específicas
    const prefixes = ["/dashboard/admin", "/dashboard/gestor", "/dashboard/student", "/dashboard/teacher"];
    const protectedPrefix = prefixes.find((p) => pathname.startsWith(p));

    const allowed: Record<string, string[]> = {
        "/dashboard/admin": ["admin", "gestor", "observer"],
        "/dashboard/gestor": ["gestor", "admin"],
        "/dashboard/teacher": ["teacher", "admin"],
        "/dashboard/student": ["student", "admin", "gestor", "teacher", "observer"],
    };

    if (protectedPrefix && !allowed[protectedPrefix].includes(role)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/",
        "/signin",
        "/signup",
        "/dashboard",
        "/dashboard/:path*",
    ]
};