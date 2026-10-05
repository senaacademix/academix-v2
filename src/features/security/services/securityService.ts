import prisma from "@/lib/prisma";
import { resetRateLimitPrefix } from "@/lib/rate-limiter";

export interface SecuritySettingsData {
  rateLimitEnabled: boolean;
  rateLimitRequestsPerMinute: number;
  rateLimitAuthPerMinute: number;
  authMaxFailedAttempts: number;
  authLockoutDurationMinutes: number;
  enableProgressiveDelay: boolean;
  allowPublicRegistration: boolean;
}

interface AccountIpLockRecord {
  attempts: number;
  lockedUntil: number | null;
  lastFailed: number;
  ip: string;
  email: string;
}

// Almacén en memoria de bloqueos combinados estrictos (Cuenta + IP)
// Evita bloquear a grupos de estudiantes conectados bajo la misma IP pública (red NAT del aula/colegio)
const accountIpLockStore = new Map<string, AccountIpLockRecord>();

// Limpieza periódica de bloqueos expirados cada 60s
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of accountIpLockStore.entries()) {
      if (record.lockedUntil && now > record.lockedUntil) {
        accountIpLockStore.delete(key);
      }
    }
  }, 60000);
}

/**
 * Obtiene la configuración de seguridad actual del sistema
 */
export async function getSecuritySettings(): Promise<SecuritySettingsData> {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "settings" },
      select: {
        rateLimitEnabled: true,
        rateLimitRequestsPerMinute: true,
        rateLimitAuthPerMinute: true,
        authMaxFailedAttempts: true,
        authLockoutDurationMinutes: true,
        enableProgressiveDelay: true,
        allowPublicRegistration: true,
      },
    });

    return {
      rateLimitEnabled: settings?.rateLimitEnabled ?? true,
      rateLimitRequestsPerMinute: settings?.rateLimitRequestsPerMinute ?? 60,
      rateLimitAuthPerMinute: settings?.rateLimitAuthPerMinute ?? 10,
      authMaxFailedAttempts: settings?.authMaxFailedAttempts ?? 5,
      authLockoutDurationMinutes: settings?.authLockoutDurationMinutes ?? 15,
      enableProgressiveDelay: settings?.enableProgressiveDelay ?? true,
      allowPublicRegistration: settings?.allowPublicRegistration ?? false,
    };
  } catch (error) {
    console.warn("[SecurityService] Error leyendo configuración de seguridad en BD, usando valores por defecto:", error);
    return {
      rateLimitEnabled: true,
      rateLimitRequestsPerMinute: 60,
      rateLimitAuthPerMinute: 10,
      authMaxFailedAttempts: 5,
      authLockoutDurationMinutes: 15,
      enableProgressiveDelay: true,
      allowPublicRegistration: false,
    };
  }
}

/**
 * Actualiza los parámetros de seguridad globales en la base de datos
 */
export async function updateSecuritySettings(data: Partial<SecuritySettingsData>): Promise<SecuritySettingsData> {
  const updated = await prisma.systemSettings.upsert({
    where: { id: "settings" },
    create: {
      id: "settings",
      rateLimitEnabled: data.rateLimitEnabled ?? true,
      rateLimitRequestsPerMinute: data.rateLimitRequestsPerMinute ?? 60,
      rateLimitAuthPerMinute: data.rateLimitAuthPerMinute ?? 10,
      authMaxFailedAttempts: data.authMaxFailedAttempts ?? 5,
      authLockoutDurationMinutes: data.authLockoutDurationMinutes ?? 15,
      enableProgressiveDelay: data.enableProgressiveDelay ?? true,
      allowPublicRegistration: data.allowPublicRegistration ?? false,
    },
    update: {
      ...(data.rateLimitEnabled !== undefined && { rateLimitEnabled: data.rateLimitEnabled }),
      ...(data.rateLimitRequestsPerMinute !== undefined && { rateLimitRequestsPerMinute: data.rateLimitRequestsPerMinute }),
      ...(data.rateLimitAuthPerMinute !== undefined && { rateLimitAuthPerMinute: data.rateLimitAuthPerMinute }),
      ...(data.authMaxFailedAttempts !== undefined && { authMaxFailedAttempts: data.authMaxFailedAttempts }),
      ...(data.authLockoutDurationMinutes !== undefined && { authLockoutDurationMinutes: data.authLockoutDurationMinutes }),
      ...(data.enableProgressiveDelay !== undefined && { enableProgressiveDelay: data.enableProgressiveDelay }),
      ...(data.allowPublicRegistration !== undefined && { allowPublicRegistration: data.allowPublicRegistration }),
    },
    select: {
      rateLimitEnabled: true,
      rateLimitRequestsPerMinute: true,
      rateLimitAuthPerMinute: true,
      authMaxFailedAttempts: true,
      authLockoutDurationMinutes: true,
      enableProgressiveDelay: true,
      allowPublicRegistration: true,
    },
  });

  return updated;
}

/**
 * Verifica si una cuenta de usuario se encuentra actualmente bloqueada por fuerza bruta
 * evaluando estrictamente la combinación (Cuenta + IP) para evitar bloqueos compartidos en redes NAT/aulas.
 */
export async function checkAccountLockout(
  email: string,
  clientIp: string = "127.0.0.1"
): Promise<{
  locked: boolean;
  remainingMinutes?: number;
  message?: string;
}> {
  const emailNorm = email.trim().toLowerCase();
  const ipNorm = clientIp.trim();
  const pairKey = `${emailNorm}:${ipNorm}`;
  const now = Date.now();

  // 1. Verificación en memoria del par estricto (Cuenta + IP)
  const ipRecord = accountIpLockStore.get(pairKey);
  if (ipRecord && ipRecord.lockedUntil) {
    if (ipRecord.lockedUntil > now) {
      const remainingMinutes = Math.max(1, Math.ceil((ipRecord.lockedUntil - now) / (60 * 1000)));
      return {
        locked: true,
        remainingMinutes,
        message: `Acceso bloqueado temporalmente para esta cuenta desde su dirección IP (${ipNorm}) tras múltiples intentos fallidos. Intente de nuevo en ${remainingMinutes} minuto(s) o use otra red.`,
      };
    } else {
      // Bloqueo expirado para esta IP
      accountIpLockStore.delete(pairKey);
    }
  }

  // 2. Verificación si el usuario tiene bloqueo en base de datos
  try {
    const user = await prisma.user.findFirst({
      where: { email: emailNorm },
      select: {
        id: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    if (!user || !user.lockedUntil) {
      return { locked: false };
    }

    if (user.lockedUntil.getTime() > now) {
      const remainingMinutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - now) / (60 * 1000)));
      return {
        locked: true,
        remainingMinutes,
        message: `Cuenta bloqueada temporalmente por seguridad tras múltiples intentos fallidos. Intente de nuevo en ${remainingMinutes} minuto(s) o contacte al administrador.`,
      };
    }

    // Si el tiempo de bloqueo en BD ya expiró, restablecer
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLogin: null,
      },
    });
  } catch (error) {
    // Si la BD no responde, el bloqueo en memoria por (Cuenta + IP) sigue protegiendo
    console.warn("[SecurityService] Error verificando usuario en BD:", error);
  }

  return { locked: false };
}

/**
 * Registra un intento de inicio de sesión fallido para la combinación estricta (Cuenta + IP).
 * Esto garantiza que si un estudiante falla, no bloquea a los demás compañeros en la misma IP (red de aula).
 */
export async function recordFailedLogin(
  email: string,
  clientIp: string = "127.0.0.1"
): Promise<{
  locked: boolean;
  attempts: number;
  maxAttempts: number;
  remainingAttempts: number;
  lockoutMinutes?: number;
}> {
  const emailNorm = email.trim().toLowerCase();
  const ipNorm = clientIp.trim();
  const pairKey = `${emailNorm}:${ipNorm}`;
  const now = Date.now();

  const settings = await getSecuritySettings();
  const maxAttempts = settings.authMaxFailedAttempts || 5;
  const lockoutMinutes = settings.authLockoutDurationMinutes || 15;

  // Actualizar o crear registro en memoria para la pareja (Cuenta + IP)
  const record = accountIpLockStore.get(pairKey) || {
    attempts: 0,
    lockedUntil: null,
    lastFailed: now,
    ip: ipNorm,
    email: emailNorm,
  };

  record.attempts += 1;
  record.lastFailed = now;
  const isNowLocked = record.attempts >= maxAttempts;

  if (isNowLocked) {
    record.lockedUntil = now + lockoutMinutes * 60 * 1000;
  }
  accountIpLockStore.set(pairKey, record);

  // Registrar en la base de datos para auditoría y visualización del Administrador
  try {
    const user = await prisma.user.findFirst({
      where: { email: emailNorm },
      select: { id: true, failedLoginAttempts: true },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: record.attempts,
          lastFailedLogin: new Date(),
          ...(isNowLocked && { lockedUntil: new Date(record.lockedUntil!) }),
        },
      });
    }
  } catch (error) {
    console.warn("[SecurityService] Error sincronizando intento fallido con BD:", error);
  }

  return {
    locked: isNowLocked,
    attempts: record.attempts,
    maxAttempts,
    remainingAttempts: Math.max(0, maxAttempts - record.attempts),
    lockoutMinutes: isNowLocked ? lockoutMinutes : undefined,
  };
}

/**
 * Restablece los intentos fallidos tras un inicio de sesión exitoso para la combinación (Cuenta + IP)
 */
export async function resetFailedLogin(
  email: string,
  clientIp?: string
): Promise<void> {
  const emailNorm = email.trim().toLowerCase();
  if (clientIp) {
    accountIpLockStore.delete(`${emailNorm}:${clientIp.trim()}`);
  } else {
    // Si no se especifica IP, limpiar todas las entradas asociadas a esta cuenta
    for (const [key, record] of accountIpLockStore.entries()) {
      if (record.email === emailNorm) {
        accountIpLockStore.delete(key);
      }
    }
  }

  // Restablecer también en la base de datos
  try {
    await prisma.user.updateMany({
      where: { email: emailNorm },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLogin: null,
      },
    });
  } catch (error) {
    console.warn("[SecurityService] Error reseteando intentos fallidos en BD:", error);
  }
}

/**
 * Obtiene la lista de usuarios que tienen sus cuentas bloqueadas en este momento
 */
export async function getBlockedUsers() {
  const now = new Date();
  return prisma.user.findMany({
    where: {
      lockedUntil: {
        gt: now,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      lastFailedLogin: true,
      profile: {
        select: {
          identificacion: true,
        },
      },
    },
    orderBy: {
      lockedUntil: "desc",
    },
  });
}

/**
 * Desbloquea manualmente una cuenta desde el panel de administración
 * eliminando tanto el bloqueo en base de datos como los bloqueos por IP en memoria.
 */
export async function unlockUserAccount(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLogin: null,
      },
      select: { email: true },
    });

    if (user?.email) {
      const emailNorm = user.email.toLowerCase();
      for (const [key, record] of accountIpLockStore.entries()) {
        if (record.email === emailNorm) {
          accountIpLockStore.delete(key);
        }
      }
      resetRateLimitPrefix(`auth_attempt:${emailNorm}:`);
      resetRateLimitPrefix(`user:${emailNorm}:`);
    }

    return true;
  } catch {
    return false;
  }
}
