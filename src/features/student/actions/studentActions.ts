"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { populateCoursesFallbackDescriptions } from "@/features/teacher/services/courseService";


async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getStudentRecords(targetStudentId?: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    let studentId = session.user.id;
    if (targetStudentId) {
        const allowedRoles = ["admin", "gestor", "coordinador", "manager", "teacher", "observer"];
        if (!allowedRoles.includes(session.user.role || "") && session.user.id !== targetStudentId) {
            throw new Error("Unauthorized");
        }
        studentId = targetStudentId;
    }

    // Fetch Attendance
    const attendances = await prisma.attendance.findMany({
        where: { userId: studentId, status: { not: "PRESENT" } },
        include: {
            course: {
                select: {
                    id: true,
                    title: true,
                    groupId: true,
                    group: { select: { id: true, name: true } },
                    teacher: { select: { name: true, profile: { select: { nombres: true, apellido: true } } } },
                    schedules: { orderBy: { dayOfWeek: 'asc' } },
                }
            },
        },
        orderBy: { date: "desc" },
    });

    // Fetch Remarks
    const remarks = await prisma.remark.findMany({
        where: { userId: studentId },
        include: {
            course: {
                select: {
                    id: true,
                    title: true,
                    groupId: true,
                    group: { select: { id: true, name: true } },
                    teacher: { select: { name: true, profile: { select: { nombres: true, apellido: true } } } },
                }
            },
            teacher: { select: { name: true, profile: { select: { nombres: true, apellido: true } } } }
        },
        orderBy: { date: "desc" },
    });

    const user = await prisma.user.findUnique({
        where: { id: studentId },
        select: {
            id: true,
            name: true,
            email: true,
            profile: {
                select: {
                    identificacion: true,
                    nombres: true,
                    apellido: true,
                    novedad: true,
                    novedadColor: true,
                }
            },
            group: {
                select: {
                    name: true,
                    startDate: true,
                    endDate: true,
                    program: {
                        select: {
                            startDate: true,
                            endDate: true,
                        }
                    }
                }
            }
        }
    });

    return {
        attendances,
        remarks,
        groupDates: user?.group ? { startDate: user.group.startDate, endDate: user.group.endDate } : null,
        scheduleDates: user?.group?.program ? { startDate: user.group.program.startDate, endDate: user.group.program.endDate } : null,
        targetUser: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            profile: user.profile,
            groupName: user.group?.name || null
        } : null,
        currentUser: {
            id: session.user.id,
            role: session.user.role
        }
    };
}

export async function justifyAttendanceAction(attendanceId: string, justification: string, url: string = "") {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const studentId = session.user.id;

    const attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
    });

    if (!attendance || attendance.userId !== studentId) {
        throw new Error("No autorizado para justificar esta asistencia");
    }

    if (attendance.justification) {
        throw new Error("Esta falta ya ha sido justificada previamente.");
    }

    if (!justification.trim()) {
        throw new Error("La justificación no puede estar vacía.");
    }

    const updated = await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
            justification: justification.trim(),
            justificationUrl: url.trim() || null,
        }
    });



    return { success: true, attendance: updated };
}

export async function deleteJustificationAction(attendanceId: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const allowedRoles = ["admin", "gestor", "coordinador", "manager", "teacher"];
    if (!allowedRoles.includes(session.user.role || "")) {
        throw new Error("No autorizado para realizar esta acción");
    }

    const updated = await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
            justification: null,
            justificationUrl: null,
        }
    });

    return { success: true, attendance: updated };
}

export async function markRemarkViewed(remarkId: string) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    const studentId = session.user.id;

    // Verify the remark belongs to this student
    const remark = await prisma.remark.findUnique({
        where: { id: remarkId },
        select: { userId: true, viewedAt: true }
    });

    if (!remark || remark.userId !== studentId) {
        throw new Error("No autorizado");
    }

    // Only set viewedAt on first view
    if (!remark.viewedAt) {
        await prisma.remark.update({
            where: { id: remarkId },
            data: { viewedAt: new Date() }
        });
    }

    return { success: true };
}

export async function getStudentDocumentation(targetStudentId?: string) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    let studentId = session.user.id;
    if (targetStudentId) {
        const allowedRoles = ["admin", "gestor", "coordinador", "manager", "teacher", "observer"];
        if (!allowedRoles.includes(session.user.role || "") && session.user.id !== targetStudentId) {
            throw new Error("Unauthorized");
        }
        studentId = targetStudentId;
    }

    const courseSelect = {
        id: true,
        title: true,
        teacher: {
            select: {
                name: true,
                profile: { select: { nombres: true, apellido: true } },
            },
        },
        sharedContent: {
            orderBy: { createdAt: "desc" as const },
            select: {
                id: true,
                title: true,
                links: true,
                createdAt: true,
            },
        },
    };

    // Source 1: direct enrollments (APPROVED, active group)
    const enrollments = await prisma.enrollment.findMany({
        where: {
            userId: studentId,
            status: "APPROVED",
            course: {
                OR: [
                    { group: null },
                    {
                        group: {
                            OR: [
                                { endDate: null },
                                { endDate: { gte: new Date() } },
                            ],
                        },
                    },
                ],
            },
        },
        select: { course: { select: courseSelect } },
    });

    // Source 2: courses from the student's group membership
    const user = await prisma.user.findUnique({
        where: { id: studentId },
        select: { groupId: true },
    });

    let groupCourses: any[] = [];
    if (user?.groupId) {
        const group = await prisma.group.findUnique({
            where: { id: user.groupId },
            select: {
                endDate: true,
                courses: { select: courseSelect },
            },
        });
        // Only include if group is still active
        const isActive =
            !group?.endDate || new Date(group.endDate) >= new Date();
        if (group && isActive) {
            groupCourses = group.courses;
        }
    }

    // Merge & deduplicate by courseId
    const seen = new Set<string>();
    const all = [
        ...enrollments.map((e) => e.course),
        ...groupCourses,
    ];

    await populateCoursesFallbackDescriptions(all);

    return all.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
    });
}
