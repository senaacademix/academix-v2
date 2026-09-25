import prisma from "@/lib/prisma";

export interface SecuritySettingsData {
  rateLimitEnabled: boolean;
  rateLimitRequestsPerMinute: number;
  rateLimitAuthPerMinute: number;
  authMaxFailedAttempts: number;
  authLockoutDurationMinutes: number;
  enableProgressiveDelay: boolean;
  allowPublicRegistration: boolean;
}

/**
 * Obtiene la configuración de seguridad actual del sistema
 */
export async function getSecuritySettings(): Promise<SecuritySettingsData> {
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
 */
export async function checkAccountLockout(email: string): Promise<{
  locked: boolean;
  remainingMinutes?: number;
  message?: string;
}> {
  const emailNorm = email.trim().toLowerCase();
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

  const now = new Date();
  if (user.lockedUntil > now) {
    const diffMs = user.lockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.max(1, Math.ceil(diffMs / (60 * 1000)));
    return {
      locked: true,
      remainingMinutes,
      message: `Cuenta bloqueada temporalmente por seguridad tras múltiples intentos fallidos. Intente de nuevo en ${remainingMinutes} minuto(s) o contacte al administrador.`,
    };
  }

  // Si el tiempo de bloqueo ya expiró, restablecer automáticamente
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastFailedLogin: null,
    },
  });

  return { locked: false };
}

/**
 * Registra un intento de inicio de sesión fallido para una cuenta
 */
export async function recordFailedLogin(email: string): Promise<{
  locked: boolean;
  attempts: number;
  maxAttempts: number;
  remainingAttempts: number;
  lockoutMinutes?: number;
}> {
  const emailNorm = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: emailNorm },
    select: { id: true, failedLoginAttempts: true },
  });

  if (!user) {
    return { locked: false, attempts: 1, maxAttempts: 5, remainingAttempts: 4 };
  }

  const settings = await getSecuritySettings();
  const maxAttempts = settings.authMaxFailedAttempts || 5;
  const newAttempts = (user.failedLoginAttempts || 0) + 1;
  const isNowLocked = newAttempts >= maxAttempts;
  const lockoutMinutes = settings.authLockoutDurationMinutes || 15;

  let lockedUntil: Date | null = null;
  if (isNowLocked) {
    lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: newAttempts,
      lastFailedLogin: new Date(),
      lockedUntil,
    },
  });

  return {
    locked: isNowLocked,
    attempts: newAttempts,
    maxAttempts,
    remainingAttempts: Math.max(0, maxAttempts - newAttempts),
    lockoutMinutes: isNowLocked ? lockoutMinutes : undefined,
  };
}

/**
 * Restablece los intentos fallidos a 0 tras un inicio de sesión exitoso
 */
export async function resetFailedLogin(email: string): Promise<void> {
  const emailNorm = email.trim().toLowerCase();
  await prisma.user.updateMany({
    where: { email: emailNorm },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastFailedLogin: null,
    },
  });
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
 */
export async function unlockUserAccount(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLogin: null,
      },
    });
    return true;
  } catch {
    return false;
  }
}
