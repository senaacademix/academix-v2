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

    let isLocked = false;
    let modifier = null;
    let modifiedAt: Date | null = null;

    if (targetScheduleId) {
        const scheduleLock = await prisma.teacherScheduleLock.findUnique({
            where: {
                teacherId_academicScheduleId: {
                    teacherId,
                    academicScheduleId: targetScheduleId
                }
            },
            include: {
                lockedBy: { select: { id: true, name: true, role: true } }
            }
        });
        if (scheduleLock) {
            isLocked = scheduleLock.qualificationsLocked;
            if (scheduleLock.lockedBy) {
                modifier = scheduleLock.lockedBy;
            }
            modifiedAt = scheduleLock.updatedAt;
        }
    } else {
        isLocked = teacher.qualifiedCoursesLocked || false;
        modifier = teacher.qualificationsLastModifiedBy ? {
            id: teacher.qualificationsLastModifiedBy.id,
            name: teacher.qualificationsLastModifiedBy.name,
            role: teacher.qualificationsLastModifiedBy.role
        } : null;
        modifiedAt = teacher.qualificationsUpdatedAt;
    }

    return {
        teacherId,
        teacherName: teacher.name || "Profesor",
        programs: teacher.programs || [],
        qualifiedCourses: normalQualifiedCourses,
        qualificationsCreatedBy,
        locked: isLocked,
        schedules: schedules.map(s => ({
            ...s,
            isActive: isScheduleCurrent(s.startDate, s.endDate)
        })),
        lastModifiedBy: modifier,
        updatedAt: modifiedAt
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

    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;

    let isLocked = false;
    if (targetScheduleId) {
        const scheduleLock = await prisma.teacherScheduleLock.findUnique({
            where: {
                teacherId_academicScheduleId: {
                    teacherId,
                    academicScheduleId: targetScheduleId
                }
            }
        });
        if (scheduleLock) {
            isLocked = scheduleLock.qualificationsLocked;
        }
    } else {
        isLocked = teacher?.qualifiedCoursesLocked ?? false;
    }

    if (isLocked && session.user.role !== "admin" && session.user.role !== "gestor") {
        throw new Error("La configuración de materias está bloqueada para este horario y no se puede modificar.");
    }

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
export async function publishTeacherQualificationsAction(teacherId: string, academicScheduleId?: string) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");
    if (session.user.role !== "admin" && session.user.role !== "gestor" && session.user.id !== teacherId) throw new Error("Unauthorized");

    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;

    if (targetScheduleId) {
        await prisma.teacherScheduleLock.upsert({
            where: {
                teacherId_academicScheduleId: {
                    teacherId,
                    academicScheduleId: targetScheduleId
                }
            },
            update: {
                qualificationsLocked: true,
                lockedById: session.user.id
            },
            create: {
                teacherId,
                academicScheduleId: targetScheduleId,
                qualificationsLocked: true,
                lockedById: session.user.id
            }
        });
    } else {
        await prisma.user.update({
            where: { id: teacherId },
            data: { 
                qualifiedCoursesLocked: true,
                qualificationsLastModifiedById: session.user.id,
                qualificationsUpdatedAt: new Date()
            }
        });
    }

    revalidatePath("/dashboard/admin/teachers");
    revalidatePath("/dashboard/gestor/schedules");
}

// Desbloquea las asignaturas (por el admin o gestor)
export async function unlockTeacherQualificationsAction(teacherId: string, academicScheduleId?: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) throw new Error("Unauthorized");
    
    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;

    if (targetScheduleId) {
        await prisma.teacherScheduleLock.upsert({
            where: {
                teacherId_academicScheduleId: {
                    teacherId,
                    academicScheduleId: targetScheduleId
                }
            },
            update: {
                qualificationsLocked: false,
                lockedById: session.user.id
            },
            create: {
                teacherId,
                academicScheduleId: targetScheduleId,
                qualificationsLocked: false,
                lockedById: session.user.id
            }
        });
    } else {
        await prisma.user.update({
            where: { id: teacherId },
            data: { 
                qualifiedCoursesLocked: false,
                qualificationsLastModifiedById: session.user.id,
                qualificationsUpdatedAt: new Date()
            }
        });
    }

    // Audit log
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: teacherId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: session.user.role,
        description: `Materias habilitadas de docente desbloqueadas para horario ${targetScheduleId || "general"}`,
        success: true,
    });

    revalidatePath("/dashboard/admin/teachers");
    revalidatePath("/dashboard/gestor/schedules");
    return { success: true };
}

export async function adminLockTeacherQualificationsAction(teacherId: string, academicScheduleId?: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) throw new Error("Unauthorized");
    
    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;

    if (targetScheduleId) {
        await prisma.teacherScheduleLock.upsert({
            where: {
                teacherId_academicScheduleId: {
                    teacherId,
                    academicScheduleId: targetScheduleId
                }
            },
            update: {
                qualificationsLocked: true,
                lockedById: session.user.id
            },
            create: {
                teacherId,
                academicScheduleId: targetScheduleId,
                qualificationsLocked: true,
                lockedById: session.user.id
            }
        });
    } else {
        await prisma.user.update({
            where: { id: teacherId },
            data: { 
                qualifiedCoursesLocked: true,
                qualificationsLastModifiedById: session.user.id,
                qualificationsUpdatedAt: new Date()
            }
        });
    }

    // Audit log
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: teacherId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: session.user.role,
        description: `Materias habilitadas de instructor publicadas/aprobadas para horario ${targetScheduleId || "general"}`,
        success: true,
    });

    revalidatePath("/dashboard/admin/teachers");
    revalidatePath("/dashboard/gestor/schedules");
    return { success: true };
}

// Bloqueo o desbloqueo unificado de Disponibilidad y Materias para un horario / trimestre
export async function adminLockBothTeacherScheduleAction(teacherId: string, academicScheduleId: string, lock: boolean) {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) throw new Error("Unauthorized");
    
    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;
    if (!targetScheduleId) {
        throw new Error("Se requiere un horario académico específico.");
    }

    await prisma.teacherScheduleLock.upsert({
        where: {
            teacherId_academicScheduleId: {
                teacherId,
                academicScheduleId: targetScheduleId
            }
        },
        update: {
            availabilityLocked: lock,
            qualificationsLocked: lock,
            lockedById: session.user.id
        },
        create: {
            teacherId,
            academicScheduleId: targetScheduleId,
            availabilityLocked: lock,
            qualificationsLocked: lock,
            lockedById: session.user.id
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
        userRole: session.user.role,
        description: `${lock ? "Bloqueo" : "Desbloqueo"} conjunto de Disponibilidad y Materias para horario ${targetScheduleId}`,
        success: true,
    });

    revalidatePath("/dashboard/admin/teachers");
    revalidatePath("/dashboard/gestor/schedules");
    return { success: true };
}

export async function getTeacherScheduleLockStatusAction(teacherId: string, academicScheduleId: string) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;
    if (!targetScheduleId) {
        return { availabilityLocked: false, qualificationsLocked: false, lockedBy: null, updatedAt: null };
    }

    const lock = await prisma.teacherScheduleLock.findUnique({
        where: {
            teacherId_academicScheduleId: {
                teacherId,
                academicScheduleId: targetScheduleId
            }
        },
        include: {
            lockedBy: { select: { id: true, name: true, role: true } }
        }
    });

    if (lock) {
        return {
            availabilityLocked: lock.availabilityLocked,
            qualificationsLocked: lock.qualificationsLocked,
            allowPastAttendanceEdit: lock.allowPastAttendanceEdit ?? false,
            lockedBy: lock.lockedBy,
            updatedAt: lock.updatedAt
        };
    }

    return {
        availabilityLocked: false,
        qualificationsLocked: false,
        allowPastAttendanceEdit: false,
        lockedBy: null,
        updatedAt: null
    };
}

export async function toggleTeacherSchedulePastAttendanceAction(teacherId: string, academicScheduleId: string, allow: boolean) {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) throw new Error("Unauthorized");
    
    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;
    if (!targetScheduleId) {
        throw new Error("Se requiere un horario académico específico.");
    }

    await prisma.teacherScheduleLock.upsert({
        where: {
            teacherId_academicScheduleId: {
                teacherId,
                academicScheduleId: targetScheduleId
            }
        },
        update: {
            allowPastAttendanceEdit: allow,
            lockedById: session.user.id
        },
        create: {
            teacherId,
            academicScheduleId: targetScheduleId,
            allowPastAttendanceEdit: allow,
            availabilityLocked: false,
            qualificationsLocked: false,
            lockedById: session.user.id
        }
    });

    // Audit log
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: teacherId,
        userId: session.user.id,
        userName: session.user.name || "Gestor",
        userRole: session.user.role,
        description: `${allow ? "Habilitó" : "Restringió"} edición de fechas anteriores para el instructor en horario ${targetScheduleId}`,
        success: true,
    });

    revalidatePath("/dashboard/gestor/schedules");
    revalidatePath("/dashboard/admin/teachers");
    return { success: true };
}

// Guarda las asignaturas y las bloquea (por el admin)
export async function adminSaveTeacherQualificationsAction(teacherId: string, courseIds: string[], academicScheduleId?: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) throw new Error("Unauthorized");

    await updateTeacherQualificationsAction(teacherId, courseIds, academicScheduleId);
    await adminLockTeacherQualificationsAction(teacherId, academicScheduleId);
}

// Bloqueo o desbloqueo masivo de Disponibilidad y Materias para TODOS los instructores de un horario
export async function adminLockBothAllTeachersScheduleAction({
    academicScheduleId,
    lock,
    teacherIds,
    programId
}: {
    academicScheduleId: string;
    lock: boolean;
    teacherIds?: string[];
    programId?: string;
}) {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) {
        throw new Error("No autorizado");
    }

    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;
    if (!targetScheduleId) {
        throw new Error("Se requiere un horario académico específico.");
    }

    let targetTeacherIds = teacherIds && teacherIds.length > 0 ? teacherIds : [];

    if (targetTeacherIds.length === 0) {
        const effectiveProgramId = programId && programId !== "all" && programId !== "ALL" ? programId : undefined;
        const where: any = { role: "teacher", banned: { not: true } };

        if (effectiveProgramId) {
            where.OR = [
                { programs: { some: { id: effectiveProgramId } } },
                { groupsTaught: { some: { programId: effectiveProgramId } } },
                { coursesTaught: { some: { OR: [
                    { group: { programId: effectiveProgramId } },
                    { period: { programId: effectiveProgramId } }
                ] } } }
            ];
        } else if (session.user.role === "gestor") {
            where.OR = [
                { programs: { some: { gestores: { some: { id: session.user.id } } } } },
                { groupsTaught: { some: { program: { gestores: { some: { id: session.user.id } } } } } },
                { coursesTaught: { some: { OR: [
                    { group: { program: { gestores: { some: { id: session.user.id } } } } },
                    { period: { program: { gestores: { some: { id: session.user.id } } } } }
                ] } } }
            ];
        }

        const teachers = await prisma.user.findMany({
            where,
            select: { id: true }
        });
        targetTeacherIds = teachers.map(t => t.id);
    }

    if (targetTeacherIds.length === 0) {
        return { success: true, count: 0, message: "No se encontraron instructores para procesar." };
    }

    // Upsert para cada instructor dentro de una transacción segura
    await prisma.$transaction(
        targetTeacherIds.map((teacherId) =>
            prisma.teacherScheduleLock.upsert({
                where: {
                    teacherId_academicScheduleId: {
                        teacherId,
                        academicScheduleId: targetScheduleId
                    }
                },
                update: {
                    availabilityLocked: lock,
                    qualificationsLocked: lock,
                    lockedById: session.user.id
                },
                create: {
                    teacherId,
                    academicScheduleId: targetScheduleId,
                    availabilityLocked: lock,
                    qualificationsLocked: lock,
                    lockedById: session.user.id
                }
            })
        )
    );

    // Audit log
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "SCHEDULE",
        entityId: targetScheduleId,
        userId: session.user.id,
        userName: session.user.name || "Gestor",
        userRole: session.user.role,
        description: `${lock ? "Bloqueo masivo" : "Desbloqueo masivo"} conjunto de Disponibilidad y Materias para ${targetTeacherIds.length} instructores en horario ${targetScheduleId}`,
        success: true,
    });

    revalidatePath("/dashboard/admin/teachers");
    revalidatePath("/dashboard/gestor/schedules");

    return { 
        success: true, 
        count: targetTeacherIds.length,
        message: `${targetTeacherIds.length} instructores ${lock ? "bloqueados" : "desbloqueados"} exitosamente.` 
    };
}
