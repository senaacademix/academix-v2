"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isScheduleCurrent, toCalendarYMD } from "@/lib/dateUtils";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

async function requireTeacherOrPrivileged() {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin" && session.user.role !== "gestor" && session.user.role !== "observer")) {
        throw new Error("No autorizado: Acceso exclusivo para instructores y directivos.");
    }
    return session.user;
}

export interface GroupScheduleAttendanceData {
    group: {
        id: string;
        name: string;
        description: string | null;
        programId: string;
        programName?: string;
    };
    students: Array<{
        id: string;
        name: string;
        email: string;
        image: string | null;
        profile: {
            identificacion: string;
            nombres: string;
            apellido: string;
            telefono: string | null;
            novedad: string | null;
            novedadColor: string | null;
        } | null;
    }>;
    courses: Array<{
        id: string;
        title: string;
        academicScheduleId: string | null;
        teacherId: string | null;
        teacherName: string;
        schedules: Array<{
            id: string;
            dayOfWeek: string;
            startTime: string;
            endTime: string;
            teacherName: string;
            environmentName: string | null;
        }>;
    }>;
    currentSchedule: {
        id: string;
        name: string;
        startDate: string;
        endDate: string;
        isActive: boolean;
        isPublished: boolean;
        isCurrent: boolean;
    } | null;
    pastSchedules: Array<{
        id: string;
        name: string;
        startDate: string;
        endDate: string;
        isActive: boolean;
        isPublished: boolean;
        isCurrent: boolean;
    }>;
    allSchedules: Array<{
        id: string;
        name: string;
        startDate: string;
        endDate: string;
        isActive: boolean;
        isPublished: boolean;
        isCurrent: boolean;
    }>;
    attendances: Array<{
        id: string;
        date: string; // YYYY-MM-DD
        status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE_EARLY";
        arrivalTime: string | null;
        departureTime: string | null;
        justification: string | null;
        justificationUrl: string | null;
        courseId: string;
        userId: string;
    }>;
}

/**
 * Consulta bajo demanda la asistencia completa de una ficha/grupo para todos sus aprendices,
 * incluyendo materias de todos los instructores a lo largo de la semana,
 * organizada por Horario Actual (Vigente) y Horarios Anteriores.
 * 
 * Se ejecuta ÚNICAMENTE al abrir la pestaña correspondiente.
 */
export async function getGroupScheduleAttendanceAction(groupId: string): Promise<{
    success: boolean;
    data?: GroupScheduleAttendanceData;
    error?: string;
}> {
    try {
        const user = await requireTeacherOrPrivileged();

        if (!groupId) {
            return { success: false, error: "Identificador de grupo no proporcionado." };
        }

        // 1. Obtener la ficha con sus aprendices y slots
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            select: {
                id: true,
                name: true,
                description: true,
                programId: true,
                program: {
                    select: {
                        name: true
                    }
                },
                teachers: {
                    select: { id: true }
                },
                students: {
                    where: {
                        banned: { not: true }
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: {
                            select: {
                                identificacion: true,
                                nombres: true,
                                apellido: true,
                                telefono: true,
                                novedad: true,
                                novedadColor: true,
                            }
                        }
                    },
                    orderBy: {
                        name: "asc"
                    }
                },
                scheduleSlots: {
                    select: {
                        academicScheduleId: true,
                        dayOfWeek: true,
                        startTime: true,
                        endTime: true,
                        academicSchedule: {
                            select: {
                                id: true,
                                name: true,
                                startDate: true,
                                endDate: true,
                                isActive: true,
                                isPublished: true,
                            }
                        }
                    }
                }
            }
        });

        if (!group) {
            return { success: false, error: "Ficha o grupo no encontrado." };
        }

        // Validar acceso: el docente debe estar vinculado a la ficha o tener rol administrativo
        const isPrivileged = user.role === "admin" || user.role === "gestor" || user.role === "observer";
        const isTeacherOfGroup = group.teachers.some(t => t.id === user.id);

        // 2. Obtener TODOS los cursos de la ficha (sin filtrar por docente, para incluir a TODOS los instructores)
        const rawCourses = await prisma.course.findMany({
            where: {
                groupId: groupId
            },
            include: {
                teacher: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                identificacion: true,
                                nombres: true,
                                apellido: true,
                            }
                        }
                    }
                },
                schedules: {
                    include: {
                        teacher: {
                            select: {
                                id: true,
                                name: true,
                                profile: {
                                    select: {
                                        nombres: true,
                                        apellido: true,
                                    }
                                }
                            }
                        },
                        environment: {
                            select: {
                                id: true,
                                name: true,
                                location: true,
                            }
                        }
                    },
                    orderBy: {
                        dayOfWeek: "asc"
                    }
                },
                academicSchedule: {
                    select: {
                        id: true,
                        name: true,
                        startDate: true,
                        endDate: true,
                        isActive: true,
                        isPublished: true,
                    }
                }
            },
            orderBy: {
                title: "asc"
            }
        });

        // Verificar si es profesor de al menos un curso de la ficha si no está formalmente en group.teachers
        const isTeacherOfAnyCourse = rawCourses.some(c => 
            c.teacherId === user.id || 
            c.schedules.some(s => s.teacherId === user.id)
        );

        if (!isPrivileged && !isTeacherOfGroup && !isTeacherOfAnyCourse) {
            return {
                success: false,
                error: "No tienes asignación académica registrada en esta ficha."
            };
        }

        // 3. Recopilar y clasificar los Horarios Académicos (Actual vs Anteriores)
        const scheduleIdsMap = new Map<string, any>();

        // Horarios desde los cursos de la ficha
        rawCourses.forEach(c => {
            if (c.academicSchedule) {
                scheduleIdsMap.set(c.academicSchedule.id, c.academicSchedule);
            }
        });

        // Horarios desde las franjas horarias de la ficha
        group.scheduleSlots.forEach(slot => {
            if (slot.academicSchedule) {
                scheduleIdsMap.set(slot.academicSchedule.id, slot.academicSchedule);
            }
        });

        // Horarios generales del programa o publicados
        const additionalSchedules = await prisma.academicSchedule.findMany({
            where: {
                OR: [
                    ...(group.programId ? [{ programId: group.programId }] : []),
                    { isPublished: true },
                    { isActive: true }
                ]
            },
            select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                isActive: true,
                isPublished: true,
            },
            orderBy: {
                startDate: "desc"
            }
        });

        additionalSchedules.forEach(s => {
            if (!scheduleIdsMap.has(s.id)) {
                scheduleIdsMap.set(s.id, s);
            }
        });

        const allSchedulesList = Array.from(scheduleIdsMap.values()).map(s => ({
            id: s.id,
            name: s.name,
            startDate: s.startDate instanceof Date ? s.startDate.toISOString() : s.startDate,
            endDate: s.endDate instanceof Date ? s.endDate.toISOString() : s.endDate,
            isActive: !!s.isActive,
            isPublished: !!s.isPublished,
            isCurrent: isScheduleCurrent(s.startDate, s.endDate)
        }));

        // Ordenar: primero los actuales/activos, luego por fecha descendente
        allSchedulesList.sort((a, b) => {
            if (a.isCurrent && !b.isCurrent) return -1;
            if (!a.isCurrent && b.isCurrent) return 1;
            const timeA = new Date(a.startDate).getTime() || 0;
            const timeB = new Date(b.startDate).getTime() || 0;
            return timeB - timeA;
        });

        // Identificar el horario actual / vigente
        const currentSchedule = allSchedulesList.find(s => s.isCurrent) || 
                                allSchedulesList.find(s => s.isActive) || 
                                allSchedulesList[0] || 
                                null;

        // Horarios anteriores (todos menos el actual)
        const pastSchedules = allSchedulesList.filter(s => currentSchedule ? s.id !== currentSchedule.id : false);

        // 4. Obtener las Asistencias de todos los cursos de la ficha
        const courseIds = rawCourses.map(c => c.id);
        const rawAttendances = courseIds.length > 0 ? await prisma.attendance.findMany({
            where: {
                courseId: { in: courseIds }
            },
            select: {
                id: true,
                date: true,
                status: true,
                arrivalTime: true,
                departureTime: true,
                justification: true,
                justificationUrl: true,
                courseId: true,
                userId: true
            },
            orderBy: {
                date: "asc"
            }
        }) : [];

        // Normalizar cursos con nombres de profesores completos
        const formattedCourses = rawCourses.map(c => {
            const mainTeacherName = c.teacher 
                ? (c.teacher.profile?.nombres && c.teacher.profile?.apellido 
                    ? `${c.teacher.profile.nombres} ${c.teacher.profile.apellido}` 
                    : c.teacher.name)
                : "Sin instructor asignado";

            const formattedSchedules = c.schedules.map(s => {
                const scheduleTeacherName = s.teacher
                    ? (s.teacher.profile?.nombres && s.teacher.profile?.apellido
                        ? `${s.teacher.profile.nombres} ${s.teacher.profile.apellido}`
                        : s.teacher.name)
                    : mainTeacherName;

                return {
                    id: s.id,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    teacherName: scheduleTeacherName,
                    environmentName: s.environment?.name || null
                };
            });

            return {
                id: c.id,
                title: c.title,
                academicScheduleId: c.academicSchedule?.id || null,
                teacherId: c.teacherId,
                teacherName: mainTeacherName,
                schedules: formattedSchedules
            };
        });

        // Normalizar asistencias con formato de fecha calendario YYYY-MM-DD
        const formattedAttendances = rawAttendances.map(a => ({
            id: a.id,
            date: toCalendarYMD(a.date),
            status: a.status as "PRESENT" | "ABSENT" | "LATE" | "LEAVE_EARLY",
            arrivalTime: a.arrivalTime ? a.arrivalTime.toISOString() : null,
            departureTime: a.departureTime ? a.departureTime.toISOString() : null,
            justification: a.justification || null,
            justificationUrl: a.justificationUrl || null,
            courseId: a.courseId,
            userId: a.userId
        }));

        return {
            success: true,
            data: {
                group: {
                    id: group.id,
                    name: group.name,
                    description: group.description,
                    programId: group.programId,
                    programName: group.program?.name
                },
                students: group.students,
                courses: formattedCourses,
                currentSchedule,
                pastSchedules,
                allSchedules: allSchedulesList,
                attendances: formattedAttendances
            }
        };
    } catch (error: any) {
        console.error("Error al obtener asistencia agrupada por horarios:", error);
        return {
            success: false,
            error: error.message || "Error al consultar la asistencia del grupo."
        };
    }
}
