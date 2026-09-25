"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  getSecuritySettings,
  updateSecuritySettings,
  getBlockedUsers,
  unlockUserAccount,
  SecuritySettingsData,
  checkAccountLockout,
  recordFailedLogin,
  resetFailedLogin,
} from "../services/securityService";

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session || session.user.role !== "admin") {
    throw new Error("No tienes permisos de Administrador para realizar esta acción.");
  }
  return session;
}

export async function getSecuritySettingsAction(): Promise<SecuritySettingsData> {
  await requireAdmin();
  return getSecuritySettings();
}

export async function updateSecuritySettingsAction(
  data: Partial<SecuritySettingsData>
): Promise<{ success: boolean; data?: SecuritySettingsData; error?: string }> {
  try {
    await requireAdmin();
    const updated = await updateSecuritySettings(data);
    revalidatePath("/dashboard/admin/security");
    revalidatePath("/dashboard/admin/settings");
    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar la configuración de seguridad",
    };
  }
}

export async function getBlockedUsersAction() {
  await requireAdmin();
  return getBlockedUsers();
}

export async function unlockUserAccountAction(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const ok = await unlockUserAccount(userId);
    if (!ok) throw new Error("No se pudo desbloquear la cuenta");
    revalidatePath("/dashboard/admin/security");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al desbloquear usuario",
    };
  }
}

// Server action invocable por el cliente de login para verificar bloqueo de cuenta antes de intentar autenticación
export async function verifyAccountLockoutAction(email: string) {
  return checkAccountLockout(email);
}

// Server action para notificar intento fallido
export async function reportFailedLoginAction(email: string) {
  return recordFailedLogin(email);
}

// Server action para notificar login exitoso
export async function reportSuccessfulLoginAction(email: string) {
  return resetFailedLogin(email);
}
