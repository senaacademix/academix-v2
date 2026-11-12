import { TrainingAreaGroupDTO } from "@/features/committee/types";

export type StandoutProcessStatus = "OPEN" | "CLOSED";

export type StandoutCategory =
    | "EXCELENCIA_ACADEMICA"
    | "LIDERAZGO_TRABAJO_EQUIPO"
    | "INNOVACION_PROYECTO"
    | "COMPROMISO_ACTITUD"
    | "INTEGRAL"
    | "OTRO";

export interface StandoutCategoryInfo {
    label: string;
    description: string;
    badgeClass: string;
    icon: string;
}

export const STANDOUT_CATEGORY_CONFIG: Record<StandoutCategory, StandoutCategoryInfo> = {
    EXCELENCIA_ACADEMICA: {
        label: "Excelencia Académica",
        description: "Desempeño sobresaliente, dominio técnico y cumplimiento ejemplar en Resultados de Aprendizaje",
        badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
        icon: "🏆"
    },
    LIDERAZGO_TRABAJO_EQUIPO: {
        label: "Liderazgo y Trabajo en Equipo",
        description: "Capacidad de liderazgo positivo, apoyo a compañeros y colaboración destacada en su ficha",
        badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
        icon: "🤝"
    },
    INNOVACION_PROYECTO: {
        label: "Innovación y Proyecto Formativo",
        description: "Aportes creativos, soluciones técnicas destacadas o liderazgo en el proyecto formativo",
        badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
        icon: "🚀"
    },
    COMPROMISO_ACTITUD: {
        label: "Compromiso, Puntualidad y Actitud",
        description: "Asistencia ejemplar, responsabilidad constante, ética y sentido de pertenencia institucional",
        badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        icon: "🌟"
    },
    INTEGRAL: {
        label: "Aprendiz Integral Destacado",
        description: "Equilibrio sobresaliente entre excelencia técnica, valores humanos, convivencia y liderazgo",
        badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
        icon: "👑"
    },
    OTRO: {
        label: "Otro Mérito Destacado",
        description: "Reconocimiento especial especificado por el instructor",
        badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
        icon: "🎖️"
    }
};

export function formatStandoutCategoryLabel(category: StandoutCategory | string, customCategory?: string | null): string {
    if (category === "OTRO") {
        return customCategory ? `Otro: ${customCategory}` : "Otro Mérito";
    }
    const config = STANDOUT_CATEGORY_CONFIG[category as StandoutCategory];
    return config ? config.label : category;
}

export interface StandoutProcessDTO {
    id: string;
    title: string;
    description: string | null;
    status: StandoutProcessStatus;
    startDate: string | null;
    endDate: string | null;
    programId: string | null;
    programName?: string | null;
    createdById: string;
    createdByName: string;
    createdByEmail: string;
    createdAt: string;
    updatedAt: string;
    nominationsCount: number;
    uniqueStudentsCount: number;
}

export interface StandoutNominationDTO {
    id: string;
    processId: string;
    processTitle: string;
    processStatus: StandoutProcessStatus;
    processStartDate?: string | null;
    processEndDate?: string | null;
    studentId: string;
    studentName: string;
    studentEmail: string;
    studentDocument: string | null;
    studentImage: string | null;
    studentPhone: string | null;
    groupId: string;
    groupName: string;
    programId: string | null;
    programName: string | null;
    nominatedById: string;
    nominatedByName: string;
    nominatedByEmail: string;
    evidenceUrl: string | null;
    category: StandoutCategory;
    customCategory?: string | null;
    groupSchedule?: string | null;
    subject?: string | null;
    recognitionDecision?: string | null;
    reason: string;
    achievements: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateStandoutProcessInput {
    title: string;
    description?: string;
    programId?: string;
    startDate?: string;
    endDate?: string;
}

export interface UpdateStandoutProcessInput {
    title?: string;
    description?: string;
    status?: StandoutProcessStatus;
    programId?: string;
    startDate?: string;
    endDate?: string;
}

export interface CreateStandoutNominationInput {
    processId: string;
    studentId: string;
    groupId: string;
    evidenceUrl?: string | null;
    category: StandoutCategory;
    customCategory?: string | null;
    groupSchedule?: string | null;
    subject?: string | null;
    reason?: string | null;
    achievements?: string | null;
}

export interface UpdateStandoutNominationInput {
    evidenceUrl?: string | null;
    category?: StandoutCategory;
    customCategory?: string | null;
    reason?: string;
    achievements?: string | null;
    recognitionDecision?: string | null;
}

export type { TrainingAreaGroupDTO };

