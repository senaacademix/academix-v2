export type CommitteeProcessStatus = "OPEN" | "CLOSED";

export type CommitteeFaultType = "ACADEMICO" | "DISCIPLINARIO" | "INASISTENCIA" | "MIXTO";

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
    reason: string;
    observations?: string;
}

export interface UpdateCommitteeReportInput {
    evidenceUrl?: string;
    faultType?: CommitteeFaultType;
    reason?: string;
    observations?: string;
    status?: string;
}
