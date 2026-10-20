export type CommitteeProcessStatus = "OPEN" | "CLOSED";

export type CommitteeFaultType =
    | "ACADEMICO"
    | "DISCIPLINARIO"
    | "INASISTENCIA"
    | "MIXTO"
    | "SOLICITUD_PLAN_MEJORAMIENTO"
    | "INCUMPLIMIENTO_PLAN_MEJORAMIENTO"
    | "DESERCION"
    | "PLAGIO_FRAUDE"
    | "ETAPA_PRODUCTIVA"
    | "OTRO";

export interface FaultTypeInfo {
    label: string;
    description: string;
    badgeClass: string;
    icon: string;
}

export const FAULT_TYPE_CONFIG: Record<CommitteeFaultType, FaultTypeInfo> = {
    ACADEMICO: {
        label: "Académico",
        description: "Incumplimiento / bajo desempeño en Resultados de Aprendizaje (RA)",
        badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
        icon: "📘"
    },
    DISCIPLINARIO: {
        label: "Disciplinario",
        description: "Faltas al reglamento del aprendiz, convivencia o conducta",
        badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
        icon: "📕"
    },
    INASISTENCIA: {
        label: "Inasistencia",
        description: "Inasistencias continuas, reiteradas o injustificadas",
        badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
        icon: "📙"
    },
    MIXTO: {
        label: "Mixto (Académico / Disciplinario)",
        description: "Combinación de bajo rendimiento académico y faltas disciplinarias/asistencia",
        badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
        icon: "📓"
    },
    SOLICITUD_PLAN_MEJORAMIENTO: {
        label: "Solicitud Plan de Mejoramiento",
        description: "Concertación de compromisos pedagógicos ante dificultades de aprendizaje",
        badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        icon: "📝"
    },
    INCUMPLIMIENTO_PLAN_MEJORAMIENTO: {
        label: "Incumplimiento Plan de Mejoramiento",
        description: "No entrega, vencimiento o no superación de los compromisos acordados",
        badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
        icon: "⚠️"
    },
    DESERCION: {
        label: "Deserción",
        description: "Inasistencia injustificada de 3 días consecutivos o abandono en LMS",
        badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
        icon: "🚶"
    },
    PLAGIO_FRAUDE: {
        label: "Plagio o Fraude Académico",
        description: "Copia no autorizada de evidencias o fraude en evaluaciones",
        badgeClass: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
        icon: "🚫"
    },
    ETAPA_PRODUCTIVA: {
        label: "Incumplimiento en Etapa Productiva",
        description: "Faltas en la empresa coformadora o dificultades en la etapa práctica",
        badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
        icon: "🏭"
    },
    OTRO: {
        label: "Otro",
        description: "Causal o motivo personalizado especificado por el instructor",
        badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
        icon: "📋"
    }
};

export function formatFaultTypeLabel(faultType: CommitteeFaultType | string, customFaultType?: string | null): string {
    if (faultType === "OTRO") {
        return customFaultType ? `Otro: ${customFaultType}` : "Otro";
    }
    const config = FAULT_TYPE_CONFIG[faultType as CommitteeFaultType];
    return config ? config.label : faultType;
}


export interface CommitteeProcessDTO {
    id: string;
    title: string;
    description: string | null;
    status: CommitteeProcessStatus;
    startDate: string | null;
    endDate: string | null;
    programId: string | null;
    programName?: string | null;
    createdById: string;
    createdByName: string;
    createdByEmail: string;
    createdAt: string;
    updatedAt: string;
    reportsCount: number;
    uniqueStudentsCount: number;
}

export interface CommitteeReportDTO {
    id: string;
    processId: string;
    processTitle: string;
    processStatus: CommitteeProcessStatus;
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
    reportedById: string;
    reportedByName: string;
    reportedByEmail: string;
    evidenceUrl: string | null;
    faultType: CommitteeFaultType;
    customFaultType?: string | null;
    groupSchedule?: string | null;
    subject?: string | null;
    absenceDays?: number | null;
    absenceHours?: number | null;
    committeeDecision?: string | null;
    reason: string;
    observations: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface TrainingAreaGroupDTO {
    id: string;
    name: string;
    description: string | null;
    programId: string;
    programName: string;
    categoria?: string;
    scheduleInfo?: string;
    courses?: { id: string; title: string }[];
    studentsCount: number;
    students: {
        id: string;
        name: string;
        email: string;
        image: string | null;
        identificacion: string | null;
        telefono: string | null;
    }[];
}

export interface CreateCommitteeProcessInput {
    title: string;
    description?: string;
    programId?: string;
    startDate?: string;
    endDate?: string;
}

export interface UpdateCommitteeProcessInput {
    title?: string;
    description?: string;
    status?: CommitteeProcessStatus;
    programId?: string;
    startDate?: string;
    endDate?: string;
}

export interface CreateCommitteeReportInput {
    processId: string;
    studentId: string;
    groupId: string;
    evidenceUrl?: string | null;
    faultType: CommitteeFaultType;
    customFaultType?: string | null;
    groupSchedule?: string | null;
    subject?: string | null;
    absenceDays?: number | null;
    absenceHours?: number | null;
    committeeDecision?: string | null;
    reason?: string;
    observations?: string | null;
}

export interface UpdateCommitteeReportInput {
    evidenceUrl?: string | null;
    faultType?: CommitteeFaultType;
    customFaultType?: string | null;
    groupSchedule?: string | null;
    subject?: string | null;
    absenceDays?: number | null;
    absenceHours?: number | null;
    committeeDecision?: string | null;
    reason?: string;
    observations?: string | null;
    status?: string;
}

export interface CommitteeEmailTemplateDTO {
    id: string;
    title: string;
    subject: string;
    body: string;
    isDefault: boolean;
    programId?: string | null;
    programName?: string | null;
    createdById?: string | null;
    createdByName?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCommitteeEmailTemplateInput {
    title: string;
    subject: string;
    body: string;
    isDefault?: boolean;
    programId?: string;
}

export interface UpdateCommitteeEmailTemplateInput {
    title?: string;
    subject?: string;
    body?: string;
    isDefault?: boolean;
    programId?: string | null;
}
