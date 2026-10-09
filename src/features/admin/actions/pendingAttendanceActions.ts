"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { resolveCurrentAcademicSchedule } from "@/lib/academicScheduleResolver";
import { toCalendarYMD, getTodayColombianDate, parseDateStringToUTCMidday } from "@/lib/dateUtils";
import { formatName } from "@/lib/utils";

export interface PendingAttendanceItem {
    id: string;
    date: string;              // YYYY-MM-DD
    dateFormatted: string;     // DD/MM/YYYY
    dayOfWeek: string;         // "Lunes", "Martes", etc.
    timeRange: string;         // "08:00 - 12:00"
    groupId: string;
    groupName: string;         // e.g. "3601936"
    programId: string;
    programName: string;
    categoria: string;
    courseId: string;
    courseTitle: string;
    teacherId: string;
    teacherName: string;
    teacherEmail: string;
    teacherPhone: string;
    teacherImage?: string | null;
}

export interface PendingAttendanceTeacherSummary {
    teacherId: string;
    teacherName: string;
    teacherEmail: string;
    teacherPhone: string;
    teacherImage?: string | null;
    totalPendingCount: number;
    groupsCount: number;
    groups: Array<{
        groupId: string;
        groupName: string;
        programName: string;
        categoria: string;
        pendingCount: number;
        courses: Array<{
            courseId: string;
            courseTitle: string;
            missingDates: Array<{
                date: string;
                dateFormatted: string;
                dayOfWeek: string;
                timeRange: string;
            }>;
        }>;
    }>;
}

export interface PendingAttendanceGroupSummary {
    groupId: string;
    groupName: string;
    programName: string;
    categoria: string;
    totalPendingCount: number;
    teachersCount: number;
    courses: Array<{
        courseId: string;
        courseTitle: string;
        teacherId: string;
        teacherName: string;
        teacherEmail: string;
        teacherPhone: string;
        missingDates: Array<{
            date: string;
            dateFormatted: string;
            dayOfWeek: string;
            timeRange: string;
        }>;
    }>;
}

export interface PendingAttendancesResult {
    success: boolean;
    error?: string;
    schedule: {
        id?: string;
        name: string;
        startDate: string;
        endDate: string;
        limitDate: string;
    } | null;
    summary: {
        totalPendingClasses: number;
        totalAffectedTeachers: number;
        totalAffectedGroups: number;
        totalAffectedCourses: number;
    };
    teachers: PendingAttendanceTeacherSummary[];
    groups: PendingAttendanceGroupSummary[];
    items: PendingAttendanceItem[];
}

export async function getPendingAttendancesSummaryAction(options?: {
    programId?: string;
    groupId?: string;
}): Promise<PendingAttendancesResult> {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || !["admin", "gestor", "observer"].includes(session.user.role || "")) {
            return {
                success: false,
                error: "No autorizado para consultar este reporte",
                schedule: null,
                summary: { totalPendingClasses: 0, totalAffectedTeachers: 0, totalAffectedGroups: 0, totalAffectedCourses: 0 },
                teachers: [],
                groups: [],
                items: []
            };
        }

        const isGestor = session.user.role === "gestor";
        const isObserver = session.user.role === "observer";

        // Determinar programas permitidos si es gestor u observer
        let allowedProgramIds: string[] | null = null;
        if (isGestor) {
            const gestorPrograms = await prisma.program.findMany({
                where: { gestores: { some: { id: session.user.id } } },
                select: { id: true }
            });
            allowedProgramIds = gestorPrograms.map(p => p.id);
        } else if (isObserver) {
            const obsPrograms = await prisma.program.findMany({
                where: {
                    OR: [
                        { observers: { some: { id: session.user.id } } },
                        { groups: { some: { observers: { some: { id: session.user.id } } } } }
                    ]
                },
                select: { id: true }
            });
            allowedProgramIds = obsPrograms.map(p => p.id);
        }

        // Construir filtro de grupos
        const groupWhere: any = {};

        if (options?.programId && options.programId !== "all" && options.programId !== "none") {
            if (allowedProgramIds && !allowedProgramIds.includes(options.programId)) {
                return {
                    success: false,
                    error: "No tienes permiso para ver este programa",
                    schedule: null,
                    summary: { totalPendingClasses: 0, totalAffectedTeachers: 0, totalAffectedGroups: 0, totalAffectedCourses: 0 },
                    teachers: [],
                    groups: [],
                    items: []
                };
            }
            groupWhere.programId = options.programId;
        } else if (allowedProgramIds) {
            groupWhere.programId = { in: allowedProgramIds };
        }

        if (options?.groupId && options.groupId !== "all" && options.groupId !== "none") {
            groupWhere.id = options.groupId;
        }

        // Resolver horario académico actual vigente
        const targetProgramId = (options?.programId && options.programId !== "all" && options.programId !== "none")
            ? options.programId
            : (allowedProgramIds && allowedProgramIds.length === 1 ? allowedProgramIds[0] : undefined);

        let currentSchedule = await resolveCurrentAcademicSchedule({
            programId: targetProgramId
        });

        if (!currentSchedule.startDate || !currentSchedule.endDate) {
            currentSchedule = await resolveCurrentAcademicSchedule({});
        }

        const scheduleStartYMD = currentSchedule.startDate ? toCalendarYMD(currentSchedule.startDate) : "";
        const scheduleEndYMD = currentSchedule.endDate ? toCalendarYMD(currentSchedule.endDate) : "";

        if (!scheduleStartYMD) {
            return {
                success: true,
                schedule: null,
                summary: { totalPendingClasses: 0, totalAffectedTeachers: 0, totalAffectedGroups: 0, totalAffectedCourses: 0 },
                teachers: [],
                groups: [],
                items: []
            };
        }

        const todayYMD = getTodayColombianDate();
        const effectiveLimitYMD = scheduleEndYMD && scheduleEndYMD < todayYMD ? scheduleEndYMD : todayYMD;

        const scheduleInfo = {
            id: currentSchedule.schedule?.id,
            name: currentSchedule.schedule?.name || "Horario Académico Vigente",
            startDate: scheduleStartYMD,
            endDate: scheduleEndYMD,
            limitDate: effectiveLimitYMD
        };

        if (scheduleStartYMD > effectiveLimitYMD) {
            return {
                success: true,
                schedule: scheduleInfo,
                summary: { totalPendingClasses: 0, totalAffectedTeachers: 0, totalAffectedGroups: 0, totalAffectedCourses: 0 },
                teachers: [],
                groups: [],
                items: []
            };
        }

        // Consultar grupos con sus materias y horarios
        const groups = await prisma.group.findMany({
            where: groupWhere,
            select: {
                id: true,
                name: true,
                categoria: true,
                startDate: true,
                endDate: true,
                programId: true,
                program: { select: { id: true, name: true } },
                courses: {
                    select: {
                        id: true,
                        title: true,
                        academicSchedule: { select: { startDate: true, endDate: true } },
                        teacherId: true,
                        teacher: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                                profile: {
                                    select: {
                                        nombres: true,
                                        apellido: true,
                                        telefono: true,
                                        identificacion: true
                                    }
                                }
                            }
                        },
                        schedules: {
                            select: {
                                id: true,
                                dayOfWeek: true,
                                startTime: true,
                                endTime: true,
                                teacherId: true,
                                teacher: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        image: true,
                                        profile: {
                                            select: {
                                                nombres: true,
                                                apellido: true,
                                                telefono: true,
                                                identificacion: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        const allCourseIds = groups.flatMap(g => g.courses.map(c => c.id));
        if (allCourseIds.length === 0) {
            return {
                success: true,
                schedule: scheduleInfo,
                summary: { totalPendingClasses: 0, totalAffectedTeachers: 0, totalAffectedGroups: 0, totalAffectedCourses: 0 },
                teachers: [],
                groups: [],
                items: []
            };
        }

        // Consultar fechas con asistencia registrada para cada materia en el rango vigente
        const recordedAttendances = await prisma.attendance.findMany({
            where: {
                courseId: { in: allCourseIds },
                ...(currentSchedule.startDateUTC && currentSchedule.endDateUTC ? {
                    date: {
                        gte: currentSchedule.startDateUTC,
                        lte: currentSchedule.endDateUTC
                    }
                } : {})
            },
            select: {
                courseId: true,
                date: true
            },
            distinct: ['courseId', 'date']
        });

        const recordedDatesMap = new Map<string, Set<string>>();
        recordedAttendances.forEach(att => {
            if (!att.date) return;
            const dStr = toCalendarYMD(att.date);
            if (!dStr) return;
            if (!recordedDatesMap.has(att.courseId)) {
                recordedDatesMap.set(att.courseId, new Set());
            }
            recordedDatesMap.get(att.courseId)!.add(dStr);
        });

        const dayOfWeekNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
        const dayOfWeekSpanish: Record<string, string> = {
            MONDAY: "Lunes",
            TUESDAY: "Martes",
            WEDNESDAY: "Miércoles",
            THURSDAY: "Jueves",
            FRIDAY: "Viernes",
            SATURDAY: "Sábado",
            SUNDAY: "Domingo"
        };

        const flatItems: PendingAttendanceItem[] = [];

        // Evaluar cada ficha y materia
        for (const grp of groups) {
            for (const crs of grp.courses) {
                const schedules = crs.schedules || [];
                const scheduledDays = schedules.map(s => s.dayOfWeek);

                // Si no hay franjas configuradas explícitamente y tiene docente, asumimos lunes a viernes
                const activeScheduledDays = scheduledDays.length > 0
                    ? scheduledDays
                    : (crs.teacher ? ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] : []);

                if (activeScheduledDays.length === 0) {
                    continue; // Materia sin horario y sin docente asignado
                }

                // Delimitar fechas
                const courseSchedStart = crs.academicSchedule?.startDate || grp.startDate;
                const courseSchedEnd = crs.academicSchedule?.endDate || grp.endDate;
                const courseStartYMD = courseSchedStart ? toCalendarYMD(courseSchedStart) : "";
                const courseEndYMD = courseSchedEnd ? toCalendarYMD(courseSchedEnd) : "";

                const actualStartYMD = courseStartYMD && courseStartYMD > scheduleStartYMD ? courseStartYMD : scheduleStartYMD;
                let actualEndYMD = effectiveLimitYMD;
                if (courseEndYMD && courseEndYMD < actualEndYMD) {
                    actualEndYMD = courseEndYMD;
                }

                if (actualStartYMD > actualEndYMD) {
                    continue;
                }

                // Mapa de días a slots con docentes
                const slotsByDay = new Map<string, Array<{ startTime: string; endTime: string; teacher: any }>>();
                if (schedules.length > 0) {
                    schedules.forEach(s => {
                        if (!slotsByDay.has(s.dayOfWeek)) {
                            slotsByDay.set(s.dayOfWeek, []);
                        }
                        slotsByDay.get(s.dayOfWeek)!.push({
                            startTime: s.startTime || "",
                            endTime: s.endTime || "",
                            teacher: s.teacher || crs.teacher
                        });
                    });
                }

                const cur = parseDateStringToUTCMidday(actualStartYMD);
                const end = parseDateStringToUTCMidday(actualEndYMD);
                const recordedSet = recordedDatesMap.get(crs.id);

                while (cur <= end) {
                    const jsDay = cur.getUTCDay();
                    const dayName = dayOfWeekNames[jsDay];

                    if (activeScheduledDays.includes(dayName as any)) {
                        const dateStr = toCalendarYMD(cur);

                        // Si no hay asistencia registrada en esta fecha
                        if (!recordedSet || !recordedSet.has(dateStr)) {
                            const [y, m, d] = dateStr.split("-");
                            const dateFormatted = `${d}/${m}/${y}`;
                            const dayLabel = dayOfWeekSpanish[dayName] || dayName;

                            // Determinar docente responsable del slot
                            const daySlots = slotsByDay.get(dayName);
                            if (daySlots && daySlots.length > 0) {
                                for (let i = 0; i < daySlots.length; i++) {
                                    const slot = daySlots[i];
                                    const slotTeacher = slot.teacher || crs.teacher;
                                    const teacherName = slotTeacher
                                        ? formatName(slotTeacher.name, slotTeacher.profile)
                                        : "Instructor no asignado";

                                    flatItems.push({
                                        id: `${crs.id}-${dateStr}-${i}`,
                                        date: dateStr,
                                        dateFormatted,
                                        dayOfWeek: dayLabel,
                                        timeRange: (slot.startTime && slot.endTime) ? `${slot.startTime} - ${slot.endTime}` : "Horario habitual",
                                        groupId: grp.id,
                                        groupName: grp.name,
                                        programId: grp.programId || "",
                                        programName: grp.program?.name || "Sin área",
                                        categoria: grp.categoria || "LECTIVA",
                                        courseId: crs.id,
                                        courseTitle: crs.title,
                                        teacherId: slotTeacher?.id || "unassigned",
                                        teacherName,
                                        teacherEmail: slotTeacher?.email || "",
                                        teacherPhone: slotTeacher?.profile?.telefono || "",
                                        teacherImage: slotTeacher?.image || null
                                    });
                                }
                            } else {
                                const defaultTeacher = crs.teacher;
                                const teacherName = defaultTeacher
                                    ? formatName(defaultTeacher.name, defaultTeacher.profile)
                                    : "Instructor no asignado";

                                flatItems.push({
                                    id: `${crs.id}-${dateStr}-0`,
                                    date: dateStr,
                                    dateFormatted,
                                    dayOfWeek: dayLabel,
                                    timeRange: "Horario habitual",
                                    groupId: grp.id,
                                    groupName: grp.name,
                                    programId: grp.programId || "",
                                    programName: grp.program?.name || "Sin área",
                                    categoria: grp.categoria || "LECTIVA",
                                    courseId: crs.id,
                                    courseTitle: crs.title,
                                    teacherId: defaultTeacher?.id || "unassigned",
                                    teacherName,
                                    teacherEmail: defaultTeacher?.email || "",
                                    teacherPhone: defaultTeacher?.profile?.telefono || "",
                                    teacherImage: defaultTeacher?.image || null
                                });
                            }
                        }
                    }

                    cur.setUTCDate(cur.getUTCDate() + 1);
                }
            }
        }

        // Ordenar items de más reciente a más antiguo
        flatItems.sort((a, b) => b.date.localeCompare(a.date));

        // Estructura agrupada por Docente
        const teacherMap = new Map<string, {
            teacherId: string;
            teacherName: string;
            teacherEmail: string;
            teacherPhone: string;
            teacherImage?: string | null;
            totalPendingCount: number;
            groupsMap: Map<string, {
                groupId: string;
                groupName: string;
                programName: string;
                categoria: string;
                pendingCount: number;
                coursesMap: Map<string, {
                    courseId: string;
                    courseTitle: string;
                    missingDates: Array<{
                        date: string;
                        dateFormatted: string;
                        dayOfWeek: string;
                        timeRange: string;
                    }>;
                }>;
            }>;
        }>();

        // Estructura agrupada por Ficha / Grupo
        const groupMap = new Map<string, {
            groupId: string;
            groupName: string;
            programName: string;
            categoria: string;
            totalPendingCount: number;
            teachersSet: Set<string>;
            coursesMap: Map<string, {
                courseId: string;
                courseTitle: string;
                teacherId: string;
                teacherName: string;
                teacherEmail: string;
                teacherPhone: string;
                missingDates: Array<{
                    date: string;
                    dateFormatted: string;
                    dayOfWeek: string;
                    timeRange: string;
                }>;
            }>;
        }>();

        for (const item of flatItems) {
            // Agrupación por Docente
            if (!teacherMap.has(item.teacherId)) {
                teacherMap.set(item.teacherId, {
                    teacherId: item.teacherId,
                    teacherName: item.teacherName,
                    teacherEmail: item.teacherEmail,
                    teacherPhone: item.teacherPhone,
                    teacherImage: item.teacherImage,
                    totalPendingCount: 0,
                    groupsMap: new Map()
                });
            }
            const tEntry = teacherMap.get(item.teacherId)!;
            tEntry.totalPendingCount++;

            if (!tEntry.groupsMap.has(item.groupId)) {
                tEntry.groupsMap.set(item.groupId, {
                    groupId: item.groupId,
                    groupName: item.groupName,
                    programName: item.programName,
                    categoria: item.categoria,
                    pendingCount: 0,
                    coursesMap: new Map()
                });
            }
            const tgEntry = tEntry.groupsMap.get(item.groupId)!;
            tgEntry.pendingCount++;

            if (!tgEntry.coursesMap.has(item.courseId)) {
                tgEntry.coursesMap.set(item.courseId, {
                    courseId: item.courseId,
                    courseTitle: item.courseTitle,
                    missingDates: []
                });
            }
            tgEntry.coursesMap.get(item.courseId)!.missingDates.push({
                date: item.date,
                dateFormatted: item.dateFormatted,
                dayOfWeek: item.dayOfWeek,
                timeRange: item.timeRange
            });

            // Agrupación por Ficha
            if (!groupMap.has(item.groupId)) {
                groupMap.set(item.groupId, {
                    groupId: item.groupId,
                    groupName: item.groupName,
                    programName: item.programName,
                    categoria: item.categoria,
                    totalPendingCount: 0,
                    teachersSet: new Set(),
                    coursesMap: new Map()
                });
            }
            const gEntry = groupMap.get(item.groupId)!;
            gEntry.totalPendingCount++;
            gEntry.teachersSet.add(item.teacherId);

            if (!gEntry.coursesMap.has(item.courseId)) {
                gEntry.coursesMap.set(item.courseId, {
                    courseId: item.courseId,
                    courseTitle: item.courseTitle,
                    teacherId: item.teacherId,
                    teacherName: item.teacherName,
                    teacherEmail: item.teacherEmail,
                    teacherPhone: item.teacherPhone,
                    missingDates: []
                });
            }
            gEntry.coursesMap.get(item.courseId)!.missingDates.push({
                date: item.date,
                dateFormatted: item.dateFormatted,
                dayOfWeek: item.dayOfWeek,
                timeRange: item.timeRange
            });
        }

        const teachersSummary: PendingAttendanceTeacherSummary[] = Array.from(teacherMap.values()).map(t => ({
            teacherId: t.teacherId,
            teacherName: t.teacherName,
            teacherEmail: t.teacherEmail,
            teacherPhone: t.teacherPhone,
            teacherImage: t.teacherImage,
            totalPendingCount: t.totalPendingCount,
            groupsCount: t.groupsMap.size,
            groups: Array.from(t.groupsMap.values()).map(g => ({
                groupId: g.groupId,
                groupName: g.groupName,
                programName: g.programName,
                categoria: g.categoria,
                pendingCount: g.pendingCount,
                courses: Array.from(g.coursesMap.values())
            }))
        })).sort((a, b) => b.totalPendingCount - a.totalPendingCount);

        const groupsSummary: PendingAttendanceGroupSummary[] = Array.from(groupMap.values()).map(g => ({
            groupId: g.groupId,
            groupName: g.groupName,
            programName: g.programName,
            categoria: g.categoria,
            totalPendingCount: g.totalPendingCount,
            teachersCount: g.teachersSet.size,
            courses: Array.from(g.coursesMap.values())
        })).sort((a, b) => b.totalPendingCount - a.totalPendingCount);

        const distinctCourses = new Set(flatItems.map(i => i.courseId));
        const distinctTeachers = new Set(flatItems.map(i => i.teacherId).filter(id => id !== "unassigned"));
        const distinctGroups = new Set(flatItems.map(i => i.groupId));

        return {
            success: true,
            schedule: scheduleInfo,
            summary: {
                totalPendingClasses: flatItems.length,
                totalAffectedTeachers: distinctTeachers.size,
                totalAffectedGroups: distinctGroups.size,
                totalAffectedCourses: distinctCourses.size
            },
            teachers: teachersSummary,
            groups: groupsSummary,
            items: flatItems
        };
    } catch (error: any) {
        console.error("Error al calcular inasistencias pendientes:", error);
        return {
            success: false,
            error: error.message || "Error al calcular inasistencias pendientes",
            schedule: null,
            summary: { totalPendingClasses: 0, totalAffectedTeachers: 0, totalAffectedGroups: 0, totalAffectedCourses: 0 },
            teachers: [],
            groups: [],
            items: []
        };
    }
}
