import { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// Almacén en memoria de límites por IP / Clave
const rateLimitStore = new Map<string, RateLimitRecord>();

// Limpieza periódica de registros expirados cada 60 segundos para evitar fugas de memoria
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000);
}

/**
 * Obtiene la dirección IP real del cliente considerando proxies y balanceadores de carga.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  total: number;
}

/**
 * Verifica si una clave (ej. IP o IP:ruta) está dentro del límite de peticiones permitido.
 * @param key Identificador único (ej: "ip:192.168.1.1" o "auth:192.168.1.1")
 * @param limit Número máximo de peticiones permitidas en la ventana
 * @param windowSeconds Duración de la ventana de tiempo en segundos (por defecto: 60)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds = 60
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    // Primera petición en la ventana actual
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, newRecord);

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetSeconds: windowSeconds,
      total: 1,
    };
  }

  // Incrementar contador
  record.count += 1;
  const remaining = Math.max(0, limit - record.count);
  const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  const allowed = record.count <= limit;

  return {
    allowed,
    limit,
    remaining,
    resetSeconds,
    total: record.count,
  };
}

/**
 * Reinicia el contador para una clave específica (ej: tras login exitoso o desbloqueo)
 */
export function resetRateLimitKey(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Retorna estadísticas generales del almacén de Rate Limiting
 */
export function getRateLimitStats(): { activeTrackedKeys: number } {
  return {
    activeTrackedKeys: rateLimitStore.size,
  };
}
