/**
 * Utilidades para la gestión del historial de entregas y reentregas
 * de planes de mejoramiento académico.
 */

export interface EvidenceHistoryItem {
    id: string;
    version: number;
    evidenceUrl: string;
    submittedAt: string; // ISO date string
    status: "pending_review" | "resubmission_requested" | "evaluated";
    feedback?: string;
    requestedAt?: string; // ISO date string
    previousEndDate?: string;
    extendedEndDate?: string;
    teacherName?: string;
}

export interface ResubmissionState {
    requested: boolean;
    feedback: string;
    requestedAt: string;
    extendedEndDate: string;
    previousEvidenceUrl?: string;
}

export interface ParsedPlanObservations {
    cleanObservations: string;
    history: EvidenceHistoryItem[];
    resubmission: ResubmissionState | null;
}

const METADATA_START = "<!-- ACADEMIX_PLAN_METADATA_START -->";
const METADATA_END = "<!-- ACADEMIX_PLAN_METADATA_END -->";

/**
 * Parsea el campo de texto `observations` para extraer las observaciones
 * legibles y la metadata estructurada del historial de reentregas.
 */
export function parsePlanObservationsAndHistory(rawObservations?: string | null): ParsedPlanObservations {
    if (!rawObservations || typeof rawObservations !== "string") {
        return {
            cleanObservations: "",
            history: [],
            resubmission: null,
        };
    }

    const startIndex = rawObservations.indexOf(METADATA_START);
    const endIndex = rawObservations.indexOf(METADATA_END);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const cleanObservations = rawObservations.slice(0, startIndex).trim();
        const jsonContent = rawObservations.slice(startIndex + METADATA_START.length, endIndex).trim();

        try {
            const parsed = JSON.parse(jsonContent);
            const history: EvidenceHistoryItem[] = Array.isArray(parsed.history) ? parsed.history : [];
            const resubmission: ResubmissionState | null = parsed.resubmission?.requested ? parsed.resubmission : null;

            return {
                cleanObservations,
                history,
                resubmission,
            };
        } catch (e) {
            console.warn("Error al parsear metadata de historial de plan de mejoramiento:", e);
            return {
                cleanObservations: rawObservations.replace(METADATA_START, "").replace(METADATA_END, "").trim(),
                history: [],
                resubmission: null,
            };
        }
    }

    return {
        cleanObservations: rawObservations.trim(),
        history: [],
        resubmission: null,
    };
}

/**
 * Retorna únicamente el texto limpio de observaciones, omitiendo cualquier bloque de metadata.
 */
export function getCleanObservations(rawObservations?: string | null): string {
    return parsePlanObservationsAndHistory(rawObservations).cleanObservations;
}

/**
 * Codifica las observaciones limpias junto con la metadata de historial y reentrega
 * para persistirlo de manera segura en el campo `observations`.
 */
export function encodePlanObservationsWithHistory(
    cleanObservations: string | null | undefined,
    history: EvidenceHistoryItem[],
    resubmission?: ResubmissionState | null
): string {
    const cleanText = (cleanObservations || "").trim();

    if (history.length === 0 && (!resubmission || !resubmission.requested)) {
        return cleanText;
    }

    const metadata = {
        version: 1,
        history,
        resubmission: resubmission?.requested ? resubmission : null,
    };

    const serializedMetadata = `${METADATA_START}\n${JSON.stringify(metadata)}\n${METADATA_END}`;

    if (!cleanText) {
        return serializedMetadata;
    }

    return `${cleanText}\n\n${serializedMetadata}`;
}

/**
 * Obtiene el historial efectivo para mostrar en interfaz de usuario,
 * sintetizando la primera entrega si el plan ya tenía `evidenceUrl` previamente.
 */
export function getEffectivePlanHistory(plan: {
    id: string;
    evidenceUrl?: string | null;
    observations?: string | null;
    updatedAt?: Date | string | null;
    finalGrade?: number | null;
}): {
    cleanObservations: string;
    history: EvidenceHistoryItem[];
    resubmission: ResubmissionState | null;
} {
    const { cleanObservations, history, resubmission } = parsePlanObservationsAndHistory(plan.observations);

    // Si no hay historial grabado pero sí hay una evidencia cargada en la base de datos,
    // sintetizamos una entrega versión 1 para que el historial sea visible y consistente.
    if (history.length === 0 && plan.evidenceUrl) {
        const synthDate = plan.updatedAt ? new Date(plan.updatedAt).toISOString() : new Date().toISOString();
        const initialItem: EvidenceHistoryItem = {
            id: `delivery-init-${plan.id}`,
            version: 1,
            evidenceUrl: plan.evidenceUrl,
            submittedAt: synthDate,
            status: plan.finalGrade !== null && plan.finalGrade !== undefined ? "evaluated" : "pending_review",
        };
        return {
            cleanObservations,
            history: [initialItem],
            resubmission,
        };
    }

    return { cleanObservations, history, resubmission };
}
