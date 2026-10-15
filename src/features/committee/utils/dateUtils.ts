/**
 * Utilidades de fecha universales (compatibles 100% con Local y Servidor/Vercel)
 * Evitan desfases de día por zonas horarias (UTC vs UTC-5 Colombia) y discrepancias de hidratación SSR.
 */

const MONTH_NAMES_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const MONTH_SHORT_ES = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic"
];

/**
 * Convierte un string de input date "YYYY-MM-DD" en un objeto Date a mediodía UTC (12:00:00Z)
 * Esto garantiza que ninguna zona horaria (desde UTC-11 hasta UTC+11) cambie el día calendario.
 */
export function parseInputDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr || !dateStr.trim()) return null;
    const clean = dateStr.trim();
    const parts = clean.split("-");
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return new Date(Date.UTC(year, month, day, 12, 0, 0));
        }
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Convierte cualquier fecha a formato "YYYY-MM-DD" para rellenar inputs HTML tipo date.
 */
export function toDateInputValue(date: string | Date | null | undefined): string {
    if (!date) return "";
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)) {
        return date.slice(0, 10);
    }
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";

    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Formato numérico de fecha "DD/MM/AAAA" seguro sin desfase horario.
 */
export function formatSafeDate(date: string | Date | null | undefined): string {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";

    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Formato corto de fecha "DD de mes, AAAA" (ej: "15 de oct, 2026")
 */
export function formatSafeShortDate(date: string | Date | null | undefined): string {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";

    const day = d.getUTCDate();
    const month = MONTH_SHORT_ES[d.getUTCMonth()] || "";
    const year = d.getUTCFullYear();
    return `${day} ${month}, ${year}`;
}

/**
 * Formato largo de fecha "DD de mes de AAAA" (ej: "15 de octubre de 2026")
 */
export function formatSafeLongDate(date: string | Date | null | undefined): string {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";

    const day = d.getUTCDate();
    const month = MONTH_NAMES_ES[d.getUTCMonth()] || "";
    const year = d.getUTCFullYear();
    return `${day} de ${month} de ${year}`;
}

/**
 * Formato de fecha y hora para auditoría y detalles ("DD/MM/AAAA, hh:mm a.m./p.m.")
 */
export function formatSafeDateTime(date: string | Date | null | undefined): string {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";

    try {
        return new Intl.DateTimeFormat("es-CO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }).format(d);
    } catch {
        return formatSafeDate(d);
    }
}

/**
 * Obtiene la fecha actual en formato "YYYY-MM-DD" en la zona horaria de Colombia (America/Bogota).
 * Garantiza coincidencia exacta tanto en ejecución local como en servidor (Vercel/Node en UTC).
 */
export function getTodayDateString(timeZone: string = "America/Bogota"): string {
    try {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());

        const y = parts.find((p) => p.type === "year")?.value;
        const m = parts.find((p) => p.type === "month")?.value;
        const d = parts.find((p) => p.type === "day")?.value;

        if (y && m && d) {
            return `${y}-${m}-${d}`;
        }
    } catch {
        // Fallback estándar
    }
    return new Date().toISOString().slice(0, 10);
}

export interface ProcessDiligenceStatus {
    canEdit: boolean;
    status: "OPEN" | "CLOSED" | "NOT_STARTED" | "EXPIRED";
    badgeText: string;
    message: string;
    isExpired: boolean;
    isUpcoming: boolean;
    isClosed: boolean;
}

/**
 * Valida si un proceso de comité está dentro de su periodo de diligenciamiento activo.
 * Regla:
 * - El estado debe ser "OPEN".
 * - Si tiene startDate, la fecha de hoy debe ser >= startDate.
 * - Si tiene endDate, la fecha de hoy debe ser <= endDate.
 * Si alguna condición no se cumple, el instructor solo tiene permisos de VISUALIZACIÓN (solo lectura).
 */
export function checkProcessDiligenceWindow(process?: {
    status?: string | null;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
} | null): ProcessDiligenceStatus {
    if (!process) {
        return {
            canEdit: false,
            status: "CLOSED",
            badgeText: "No disponible",
            message: "Proceso no encontrado o no disponible.",
            isExpired: false,
            isUpcoming: false,
            isClosed: true
        };
    }

    if (process.status !== "OPEN") {
        return {
            canEdit: false,
            status: "CLOSED",
            badgeText: "Cerrado (Solo Lectura)",
            message: "Este proceso de comité ha sido concluido por el Gestor Académico.",
            isExpired: false,
            isUpcoming: false,
            isClosed: true
        };
    }

    const todayStr = getTodayDateString();
    const startStr = toDateInputValue(process.startDate);
    const endStr = toDateInputValue(process.endDate);

    if (startStr && todayStr < startStr) {
        return {
            canEdit: false,
            status: "NOT_STARTED",
            badgeText: "Próximamente (Solo Lectura)",
            message: `El periodo de diligenciamiento inicia el ${formatSafeDate(process.startDate)}.`,
            isExpired: false,
            isUpcoming: true,
            isClosed: false
        };
    }

    if (endStr && todayStr > endStr) {
        return {
            canEdit: false,
            status: "EXPIRED",
            badgeText: "Plazo Finalizado (Solo Lectura)",
            message: `El plazo de diligenciamiento finalizó el ${formatSafeDate(process.endDate)}. Modo solo lectura.`,
            isExpired: true,
            isUpcoming: false,
            isClosed: false
        };
    }

    return {
        canEdit: true,
        status: "OPEN",
        badgeText: "Habilitado para Diligenciar",
        message: endStr
            ? `Diligenciamiento disponible hasta el ${formatSafeDate(process.endDate)}.`
            : "Proceso abierto para recepción de reportes.",
        isExpired: false,
        isUpcoming: false,
        isClosed: false
    };
}

export function isProcessInDiligenceWindow(process?: {
    status?: string | null;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
} | null): boolean {
    return checkProcessDiligenceWindow(process).canEdit;
}
