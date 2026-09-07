export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Funcionalidad de notificaciones push retirada por completo de todos los roles.
 * Función segura sin efecto para preservar compatibilidad con Server Actions existentes.
 */
export async function sendPushNotification(_userId: string, _data: PushPayload): Promise<void> {
  return;
}
