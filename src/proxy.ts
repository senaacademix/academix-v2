import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionCookie } from "better-auth/cookies";
import { getClientIp, checkRateLimit, getAccountIpKey, getRateLimitConfig } from "@/lib/rate-limiter";

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const clientIp = getClientIp(request);

    // 1. Bloqueo estricto perimetral de autoregistro de aprendices
    if (pathname.startsWith("/api/auth/sign-up")) {
        return NextResponse.json(
            { 
                error: "El autoregistro de aprendices está deshabilitado. Los aprendices solo pueden ser creados por el Gestor Académico." 
            }, 
            { status: 403 }
        );
    }

    if (pathname === "/signup") {
        return NextResponse.redirect(new URL("/signin", request.url));
    }

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

    // 2. Rate Limiting Inteligente (Cuenta + IP para usuarios autenticados / Protección de aula para anónimos)
    // Evita bloquear a grupos enteros de estudiantes que comparten la misma red WiFi/NAT institucional.
    const rlConfig = getRateLimitConfig();

    if (rlConfig.enabled) {
        let rateKey: string;
        let rateLimit = rlConfig.userRequestsPerMinute || 60;

        if (session?.user?.email) {
            // Usuario identificado: Límite individual estricto por Cuenta + IP
            rateKey = getAccountIpKey("user", session.user.email, clientIp);
            rateLimit = Math.max(60, rlConfig.userRequestsPerMinute || 60);
        } else if (pathname.startsWith("/api/auth")) {
            // Endpoints de autenticación sin sesión: Se permite un umbral amplio por IP
            // para dar cabida a grupos de 30-50 estudiantes ingresando al tiempo desde el mismo aula,
            // mientras que la seguridad estricta anti-fuerza bruta se evalúa por (Cuenta + IP) en la acción de login.
            rateKey = `auth_perimeter:${clientIp}`;
            rateLimit = Math.max(300, (rlConfig.authRequestsPerMinute || 10) * 30);
        } else {
            // Navegación anónima pública general (carga concurrente del aula)
            rateKey = `gen_perimeter:${clientIp}`;
            rateLimit = Math.max(600, (rlConfig.userRequestsPerMinute || 60) * 10);
        }

        const rateResult = checkRateLimit(rateKey, rateLimit, 60);
        if (!rateResult.allowed) {
            return new NextResponse(
                JSON.stringify({
                    error: session?.user?.email 
                        ? "Demasiadas peticiones para su cuenta desde esta conexión. Por motivos de seguridad espere un momento."
                        : "Demasiadas peticiones concurrentes desde esta red. Por motivos de seguridad espere un momento.",
                    retryAfter: rateResult.resetSeconds,
                }),
                {
                    status: 429,
                    headers: {
                        "Content-Type": "application/json",
                        "Retry-After": rateResult.resetSeconds.toString(),
                        "X-RateLimit-Limit": rateResult.limit.toString(),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": rateResult.resetSeconds.toString(),
                    },
                }
            );
        }
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
        "/api/:path*",
    ]
};