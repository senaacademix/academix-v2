export interface GestorManagedProgram {
    id: string;
    name: string;
    description?: string | null;
    allowPastAttendanceEdit?: boolean;
    studentsCount?: number;
    teachersCount?: number;
    coursesCount?: number;
    activeCoursesCount?: number;
    groupsCount?: number;
    periodsCount?: number;
    environmentsCount?: number;
    _count?: {
        groups: number;
        periods: number;
        environments?: number;
        teachers?: number;
    };
}

export interface GestorDashboardStats {
    users: {
        admin: number;
        teacher: number;
        student: number;
        total: number;
    };
    courses: {
        total: number;
        active: number;
        archived: number;
    };
    groups?: {
        total: number;
    };
    programs?: {
        total: number;
    };
    managedProgramsList: GestorManagedProgram[];
    activity: {
        submissions: number;
    };
    health: {
        connected: boolean;
    };
}

export interface GestorActivityItem {
    type: "grade" | "remark" | "attendance";
    user?: {
        id: string;
        name: string | null;
        profile?: {
            nombres?: string | null;
            apellido?: string | null;
            firstName?: string | null;
            firstLastName?: string | null;
            secondLastName?: string | null;
        } | null;
    };
    timestamp: Date | string;
    programId?: string | null;
    details: {
        activity: string;
        course: string;
        score?: number | null;
    };
}
