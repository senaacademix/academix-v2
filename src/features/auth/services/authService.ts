import { authClient } from "@/lib/auth-client";

export type Role = "admin" | "gestor" | "observer" | "teacher" | "student";

export function getRoleFromUser(user: unknown): Role | null {
  const u = user as { role?: string; roles?: string[] } | null | undefined;
  if (!u) return null;
  
  // Check if admin role exists anywhere in roles array or is the role property
  const roles = Array.isArray(u.roles) ? u.roles : [];
  if (u.role === "admin" || roles.includes("admin")) return "admin";
  if (u.role === "gestor" || roles.includes("gestor")) return "gestor";
  if (u.role === "observer" || roles.includes("observer")) return "observer";
  if (u.role === "teacher" || roles.includes("teacher")) return "teacher";
  if (u.role === "student" || roles.includes("student")) return "student";
  
  return "student";
}

export function getRedirectForSession(session: unknown): string | null {
  const s = session as { user?: unknown } | null | undefined;
  if (!s?.user) return null;
  const role = getRoleFromUser(s.user);
  if (role === "admin" || role === "observer") return "/dashboard/admin";
  if (role === "gestor") return "/dashboard/gestor";
  if (role === "teacher") return "/dashboard/teacher";
  return "/dashboard/student";
}

import {
  verifyAccountLockoutAction,
  reportFailedLoginAction,
  reportSuccessfulLoginAction,
} from "@/features/security/actions/securityActions";

export async function signInEmail(payload: { email: string; password: string }): Promise<void> {
  if (typeof document !== "undefined") {
    document.cookie = "academix_gestor_program_id=; path=/; max-age=0; SameSite=Lax";
    try {
      sessionStorage.removeItem("academix_gestor_program_id");
      localStorage.removeItem("academix_gestor_program_id");
    } catch {}
  }

  // 1. Verificar si la cuenta está actualmente bloqueada por fuerza bruta
  try {
    const lockout = await verifyAccountLockoutAction(payload.email);
    if (lockout.locked) {
      throw new Error(
        lockout.message ||
          `Cuenta bloqueada temporalmente por seguridad. Intente de nuevo en ${lockout.remainingMinutes ?? 15} minutos.`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("bloqueada")) {
      throw err;
    }
  }

  // 2. Intentar autenticación
  const { data, error } = await authClient.signIn.email({
    email: payload.email,
    password: payload.password,
    callbackURL: "/signin",
  });

  if (error) {
    // 3. Registrar fallo e informar si se bloqueó o cuántos intentos restan
    try {
      const failResult = await reportFailedLoginAction(payload.email);
      if (failResult.locked) {
        throw new Error(
          `Ha superado el límite de ${failResult.maxAttempts} intentos. Su cuenta ha sido bloqueada temporalmente por ${failResult.lockoutMinutes || 15} minutos.`
        );
      } else if (failResult.remainingAttempts <= 2 && failResult.remainingAttempts > 0) {
        throw new Error(
          `Credenciales incorrectas. Advertencia: Le restan ${failResult.remainingAttempts} intento(s) antes del bloqueo de seguridad.`
        );
      }
    } catch (err) {
      if (err instanceof Error && (err.message.includes("bloqueada") || err.message.includes("Advertencia"))) {
        throw err;
      }
    }

    throw new Error(error.message || "Error al iniciar sesión. Verifique su correo y contraseña.");
  }

  // 4. Inicio exitoso: restablecer contador de fallos
  try {
    await reportSuccessfulLoginAction(payload.email);
  } catch {}
}

export async function signInSocial(provider: "google"): Promise<void> {
  if (typeof document !== "undefined") {
    document.cookie = "academix_gestor_program_id=; path=/; max-age=0; SameSite=Lax";
    try {
      sessionStorage.removeItem("academix_gestor_program_id");
      localStorage.removeItem("academix_gestor_program_id");
    } catch {}
  }
  await authClient.signIn.social({ provider, callbackURL: "/signin" });
}

export async function signUpEmail(_payload: {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
}): Promise<void> {
  throw new Error(
    "El autoregistro de aprendices está deshabilitado. Los aprendices solo pueden ser creados por el Gestor Académico."
  );
}

export async function signOut(): Promise<void> {
  if (typeof document !== "undefined") {
    document.cookie = "academix_gestor_program_id=; path=/; max-age=0; SameSite=Lax";
    try {
      sessionStorage.removeItem("academix_gestor_program_id");
      localStorage.removeItem("academix_gestor_program_id");
    } catch {}
  }
  await authClient.signOut();
}

export function getPostLogoutRedirect(): string {
  return "/signin";
}
