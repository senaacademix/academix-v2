"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isScheduleCurrent } from "@/lib/dateUtils";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getTeacherQualificationsAction(teacherId: string, academicScheduleId?: string, programId?: string) {
    const session = await getSession();
    if (!session) {
        throw new Error("Unauthorized");
    }
    if (session.user.role !== "admin" && session.user.role !== "gestor" && session.user.id !== teacherId) {
        throw new Error("Unauthorized");
    }

    const effectiveProgramId = programId && programId !== "all" && programId !== "ALL" ? programId : undefined;
    const programWhere: any = {};
    if (effectiveProgramId) {
        programWhere.id = effectiveProgramId;
    } else if (session.user.role === "gestor") {
        programWhere.gestores = { some: { id: session.user.id } };
    }

    const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        include: {
            programs: {
                where: Object.keys(programWhere).length > 0 ? programWhere : undefined,
                include: {
                    periods: {
                        where: {
                            esEspecial: false
                        },
                        include: {
                            courses: {
                                where: {
                                    groupId: null
                                },
                                orderBy: { order: "asc" }
                            }
                        },
                        orderBy: { order: "asc" }
                    }
                }
            },
            qualifiedCourses: {
                select: {
                    id: true,
                    title: true,
                    period: {
                        select: {
                            esEspecial: true
                        }
                    }
                }
            },
            qualificationsLastModifiedBy: {
                select: { id: true, name: true, role: true }
            }
        }
    });

    if (!teacher) {
        throw new Error("Teacher not found");
    }

    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;

    let schedQualCourseIds: string[] = [];
    let qualificationsCreatedBy: Record<string, { id: string; name: string | null; role: string }> = {};
    if (targetScheduleId) {
        const schedQuals = await prisma.teacherScheduleQualification.findMany({
            where: { teacherId, academicScheduleId: targetScheduleId },
            include: { createdBy: { select: { id: true, name: true, role: true } } }
        });
        schedQualCourseIds = schedQuals.map(q => q.courseId);
        schedQuals.forEach(q => {
            if (q.createdBy) {
                qualificationsCreatedBy[q.courseId] = {
                    id: q.createdBy.id,
                    name: q.createdBy.name || null,
                    role: String(q.createdBy.role)
                };
            } else {
                qualificationsCreatedBy[q.courseId] = {
                    id: teacherId,
                    name: teacher.name || "Profesor",
                    role: "teacher"
                };
            }
        });
    }

    const masterCourses = (teacher.programs || []).flatMap((p: any) => 
        (p.periods || []).flatMap((per: any) => per.courses || [])
    );

    const qualifiedTitles = new Set(
        (teacher.qualifiedCourses || [])
            .filter((c: any) => !c.period?.esEspecial)
            .map((c: any) => c.title?.trim().toLowerCase())
    );

    const normalQualifiedCourses = masterCourses
        .filter((mc: any) => {
            if (targetScheduleId && schedQualCourseIds.length > 0) {
                return schedQualCourseIds.includes(mc.id);
            }
            return qualifiedTitles.has(mc.title?.trim().toLowerCase()) ||
                (teacher.qualifiedCourses || []).some((qc: any) => qc.id === mc.id);
        })
        .map((mc: any) => ({ id: mc.id, title: mc.title }));

    const teacherProgramIds = (teacher.programs || []).map((p: any) => p.id);
    const schedulesWhere: any = {};
    if (teacherProgramIds.length > 0) {
        schedulesWhere.OR = [
            {
                groupSlots: {
                    some: {
                        group: {
                            programId: { in: teacherProgramIds }
                        }
                    }
                }
            },
            {
                groupSlots: { none: {} }
            }
        ];
    }

    const schedules = await prisma.academicSchedule.findMany({
        where: Object.keys(schedulesWhere).length > 0 ? schedulesWhere : undefined,
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, startDate: true, endDate: true, isActive: true, isPublished: true }
    });

    return {
        teacherId,
        teacherName: teacher.name || "Profesor",
        programs: teacher.programs || [],
        qualifiedCourses: normalQualifiedCourses,
        qualificationsCreatedBy,
        locked: teacher.qualifiedCoursesLocked || false,
        schedules: schedules.map(s => ({
            ...s,
            isActive: isScheduleCurrent(s.startDate, s.endDate)
        })),
        lastModifiedBy: teacher.qualificationsLastModifiedBy ? {
            id: teacher.qualificationsLastModifiedBy.id,
            name: teacher.qualificationsLastModifiedBy.name,
            role: teacher.qualificationsLastModifiedBy.role
        } : null,
        updatedAt: teacher.qualificationsUpdatedAt
    };
}

export async function updateTeacherQualificationsAction(teacherId: string, courseIds: string[], academicScheduleId?: string) {
    const session = await getSession();
    if (!session) {
        throw new Error("Unauthorized");
    }
    if (session.user.role !== "admin" && session.user.role !== "gestor" && session.user.id !== teacherId) {
        throw new Error("Unauthorized");
    }

    const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { 
            qualifiedCoursesLocked: true,
            qualifiedCourses: { select: { id: true } }
        }
    });

    if (teacher?.qualifiedCoursesLocked && session.user.role !== "admin" && session.user.role !== "gestor") {
        throw new Error("La configuración de materias está bloqueada y no se puede modificar.");
    }

    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;
    let hasChanges = false;

    if (targetScheduleId) {
        await prisma.$transaction(async (tx) => {
            const existing = await tx.teacherScheduleQualification.findMany({
                where: { teacherId, academicScheduleId: targetScheduleId },
                select: { id: true, courseId: true, createdById: true }
            });

            const existingMap = new Map(existing.map(q => [q.courseId, q.id]));

            // 1. Materias que se eliminan (están en BD pero ya no están en courseIds seleccionadas)
            const toDeleteIds = existing
                .filter(q => !courseIds.includes(q.courseId))
                .map(q => q.id);

            if (toDeleteIds.length > 0) {
                hasChanges = true;
                await tx.teacherScheduleQualification.deleteMany({
                    where: { id: { in: toDeleteIds } }
                });
            }

            // 2. Materias nuevas que se agregan (están en courseIds pero no estaban en BD)
            const toAddCourses = courseIds.filter(cid => !existingMap.has(cid));
            if (toAddCourses.length > 0) {
                hasChanges = true;
                await tx.teacherScheduleQualification.createMany({
                    data: toAddCourses.map(courseId => ({
                        teacherId,
                        academicScheduleId: targetScheduleId,
                        courseId,
                        createdById: session.user.id // Marcada puntualmente con el rol del actor que la agregó
                    }))
                });
            }

            // 3. Las materias que ya existían y siguen seleccionadas se dejan INTACTAS (su createdById y rol original no se modifican)
        });
    }

    // Verificar si cambiaron las materias generales
    const currentCourseIds = (teacher?.qualifiedCourses || []).map(c => c.id).sort().join(",");
    const incomingSorted = [...courseIds].sort().join(",");
    if (currentCourseIds !== incomingSorted) {
        hasChanges = true;
    }

    if (hasChanges) {
        await prisma.user.update({
            where: { id: teacherId },
            data: {
                qualifiedCourses: {
                    set: courseIds.map(id => ({ id }))
                },
                qualificationsLastModifiedById: session.user.id,
                qualificationsUpdatedAt: new Date()
            }
        });
    }
}

// Bloquea las asignaturas (publicar)
export async function publishTeacherQualificationsAction(teacherId: string) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");
    if (session.user.role !== "admin" && session.user.role !== "gestor" && session.user.id !== teacherId) throw new Error("Unauthorized");

    await prisma.user.update({
        where: { id: teacherId },
        data: { 
            qualifiedCoursesLocked: true,
            qualificationsLastModifiedById: session.user.id,
            qualificationsUpdatedAt: new Date()
        }
    });
}

// Desbloquea las asignaturas (por el admin)
export async function unlockTeacherQualificationsAction(teacherId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) throw new Error("Unauthorized");
    
    await prisma.user.update({
        where: { id: teacherId },
        data: { 
            qualifiedCoursesLocked: false,
            qualificationsLastModifiedById: session.user.id,
            qualificationsUpdatedAt: new Date()
        }
    });
    revalidatePath("/dashboard/admin/teachers");
    return { success: true };
}

export async function adminLockTeacherQualificationsAction(teacherId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) throw new Error("Unauthorized");
    
    await prisma.user.update({
        where: { id: teacherId },
        data: { 
            qualifiedCoursesLocked: true,
            qualificationsLastModifiedById: session.user.id,
            qualificationsUpdatedAt: new Date()
        }
    });

    // Audit log
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: teacherId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Materias habilitadas de docente publicadas/aprobadas por administrador`,
        success: true,
    });

    revalidatePath("/dashboard/admin/teachers");
    return { success: true };
}

// Guarda las asignaturas y las bloquea (por el admin)
export async function adminSaveTeacherQualificationsAction(teacherId: string, courseIds: string[]) {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) throw new Error("Unauthorized");

    await prisma.user.update({
        where: { id: teacherId },
        data: {
            qualifiedCourses: {
                set: courseIds.map(id => ({ id }))
            },
            qualifiedCoursesLocked: true,
            qualificationsLastModifiedById: session.user.id,
            qualificationsUpdatedAt: new Date()
        }
    });
}
