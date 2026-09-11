"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DayOfWeek } from "@/generated/prisma/client";
import { isScheduleCurrent } from "@/lib/dateUtils";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

async function requireTeacher() {
    const session = await getSession();
    if (!session?.user || session.user.role !== "teacher") {
        throw new Error("Unauthorized: Teacher access required");
    }
    return session;
}

async function requireAdmin() {
    const session = await getSession();
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "gestor")) {
        throw new Error("Unauthorized: Admin or Gestor access required");
    }
    return session;
}

// 1. Get teacher availability
export async function getTeacherAvailabilityAction(academicScheduleId?: string) {
    const session = await requireTeacher();
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
            name: true,
            availabilityLocked: true,
            availabilityLastModifiedBy: {
                select: { id: true, name: true, role: true }
            },
            availabilityUpdatedAt: true,
            programs: {
                select: { id: true, name: true }
            }
        }
    });

    const teacherProgramIds = (user?.programs || []).map(p => p.id);

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

    const schedulesRaw = await prisma.academicSchedule.findMany({
        where: Object.keys(schedulesWhere).length > 0 ? schedulesWhere : undefined,
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, startDate: true, endDate: true, isActive: true, isPublished: true }
    });

    const schedules = schedulesRaw.map(s => ({
        ...s,
        isActive: isScheduleCurrent(s.startDate, s.endDate)
    }));

    const activeSchedule = schedules.find(s => s.isActive) || schedules[0] || null;
    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : activeSchedule?.id || null;

    let slots = await prisma.teacherAvailability.findMany({
        where: { 
            teacherId: userId,
            ...(targetScheduleId ? { academicScheduleId: targetScheduleId } : {})
        },
        include: {
            createdBy: {
                select: { id: true, name: true, role: true }
            }
        },
        orderBy: [
            { dayOfWeek: "asc" },
            { startTime: "asc" }
        ]
    });

    return {
        teacherId: userId,
        teacherName: user?.name || "Profesor",
        locked: user?.availabilityLocked ?? false,
        programs: user?.programs || [],
        lastModifiedBy: user?.availabilityLastModifiedBy ? {
            id: user.availabilityLastModifiedBy.id,
            name: user.availabilityLastModifiedBy.name,
            role: user.availabilityLastModifiedBy.role
        } : null,
        updatedAt: user?.availabilityUpdatedAt,
        schedules,
        slots: slots.map(s => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek as DayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            createdBy: s.createdBy ? {
                id: s.createdBy.id,
                name: s.createdBy.name,
                role: s.createdBy.role
            } : {
                id: userId,
                name: user?.name || "Profesor",
                role: "teacher"
            }
        }))
    };
}

/**
 * Sincroniza las franjas horarias de disponibilidad de manera granular.
 * Si una franja no fue alterada, su autor original (createdById) y rol se preservan intactos.
 * Solo las franjas nuevas o editadas en sus horas se marcan con el actorId del usuario actual.
 */
async function syncTeacherAvailabilitySlots(
    tx: any,
    teacherId: string,
    actorId: string,
    incomingSlots: { id?: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }[],
    targetScheduleId: string | null
): Promise<boolean> {
    const existingSlots = await tx.teacherAvailability.findMany({
        where: {
            teacherId,
            ...(targetScheduleId ? { academicScheduleId: targetScheduleId } : { academicScheduleId: null })
        }
    });

    let hasChanges = false;
    const matchedExistingIds = new Set<string>();

    for (const incoming of incomingSlots) {
        // 1. Intentar coincidencia por ID si viene del cliente
        let existing = incoming.id ? existingSlots.find((e: any) => e.id === incoming.id) : null;

        // 2. Si no coincide por ID, buscar franja idéntica por día y horas que no haya sido emparejada
        if (!existing) {
            existing = existingSlots.find(
                (e: any) =>
                    !matchedExistingIds.has(e.id) &&
                    e.dayOfWeek === incoming.dayOfWeek &&
                    e.startTime === incoming.startTime &&
                    e.endTime === incoming.endTime
            );
        }

        if (existing) {
            matchedExistingIds.add(existing.id);
            const timeOrDayChanged =
                existing.dayOfWeek !== incoming.dayOfWeek ||
                existing.startTime !== incoming.startTime ||
                existing.endTime !== incoming.endTime;

            if (timeOrDayChanged) {
                hasChanges = true;
                await tx.teacherAvailability.update({
                    where: { id: existing.id },
                    data: {
                        dayOfWeek: incoming.dayOfWeek,
                        startTime: incoming.startTime,
                        endTime: incoming.endTime,
                        createdById: actorId // Esta franja específica fue modificada por este actor
                    }
                });
            }
            // Si no cambió, se mantiene intacta: NO se sobreescribe createdById!
        } else {
            // Franja nueva agregada por este actor
            hasChanges = true;
            await tx.teacherAvailability.create({
                data: {
                    teacherId,
                    academicScheduleId: targetScheduleId,
                    createdById: actorId, // Marcada puntualmente por quien la creó
                    dayOfWeek: incoming.dayOfWeek,
                    startTime: incoming.startTime,
                    endTime: incoming.endTime
                }
            });
        }
    }

    // Eliminar las franjas existentes que fueron removidas
    const toDelete = existingSlots.filter((e: any) => !matchedExistingIds.has(e.id));
    if (toDelete.length > 0) {
        hasChanges = true;
        await tx.teacherAvailability.deleteMany({
            where: { id: { in: toDelete.map((e: any) => e.id) } }
        });
    }

    return hasChanges;
}

// 2. Save teacher availability (draft)
export async function saveTeacherAvailabilityAction(
    slots: { id?: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }[],
    academicScheduleId?: string
) {
    const session = await requireTeacher();
    const userId = session.user.id;

    // Check lock status
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { availabilityLocked: true }
    });

    if (user?.availabilityLocked) {
        throw new Error("Tu disponibilidad está bloqueada y no puede ser modificada.");
    }

    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;

    // Save in transaction with granular diff
    await prisma.$transaction(async (tx) => {
        const hasChanges = await syncTeacherAvailabilitySlots(tx, userId, userId, slots, targetScheduleId);

        if (hasChanges) {
            await tx.user.update({
                where: { id: userId },
                data: {
                    availabilityLastModifiedById: userId,
                    availabilityUpdatedAt: new Date()
                }
            });
        }
    });

    revalidatePath("/dashboard/teacher/schedule");
    return { success: true };
}

// 3. Publish and lock teacher availability
export async function publishTeacherAvailabilityAction() {
    const session = await requireTeacher();
    const userId = session.user.id;

    // Check lock status
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { availabilityLocked: true }
    });

    if (user?.availabilityLocked) {
        throw new Error("Tu disponibilidad ya está publicada.");
    }

    await prisma.user.update({
        where: { id: userId },
        data: { 
            availabilityLocked: true,
            availabilityLastModifiedById: userId,
            availabilityUpdatedAt: new Date()
        }
    });

    revalidatePath("/dashboard/teacher/schedule");
    return { success: true };
}

// 4. Get availability for admin
export async function getTeacherAvailabilityForAdminAction(teacherId: string, academicScheduleId?: string) {
    await requireAdmin();

    const user = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { 
            name: true,
            email: true,
            availabilityLocked: true,
            availabilityLastModifiedBy: {
                select: { id: true, name: true, role: true }
            },
            availabilityUpdatedAt: true,
            programs: {
                select: { id: true, name: true }
            }
        }
    });

    if (!user) {
        throw new Error("Profesor no encontrado");
    }

    const teacherProgramIds = (user?.programs || []).map(p => p.id);

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

    const schedulesRaw = await prisma.academicSchedule.findMany({
        where: Object.keys(schedulesWhere).length > 0 ? schedulesWhere : undefined,
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, startDate: true, endDate: true, isActive: true, isPublished: true }
    });

    const schedules = schedulesRaw.map(s => ({
        ...s,
        isActive: isScheduleCurrent(s.startDate, s.endDate)
    }));

    const activeSchedule = schedules.find(s => s.isActive) || schedules[0] || null;
    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : activeSchedule?.id || null;

    let slots = await prisma.teacherAvailability.findMany({
        where: { 
            teacherId,
            ...(targetScheduleId ? { academicScheduleId: targetScheduleId } : {})
        },
        include: {
            createdBy: {
                select: { id: true, name: true, role: true }
            }
        },
        orderBy: [
            { dayOfWeek: "asc" },
            { startTime: "asc" }
        ]
    });

    return {
        teacherId,
        teacherName: user.name,
        teacherEmail: user.email,
        locked: user.availabilityLocked,
        programs: user.programs || [],
        lastModifiedBy: user.availabilityLastModifiedBy ? {
            id: user.availabilityLastModifiedBy.id,
            name: user.availabilityLastModifiedBy.name,
            role: user.availabilityLastModifiedBy.role
        } : null,
        updatedAt: user.availabilityUpdatedAt,
        schedules,
        slots: slots.map(s => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek as DayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            createdBy: s.createdBy ? {
                id: s.createdBy.id,
                name: s.createdBy.name,
                role: s.createdBy.role
            } : {
                id: teacherId,
                name: user.name || "Profesor",
                role: "teacher"
            }
        }))
    };
}

// 5. Unlock availability by admin
export async function unlockTeacherAvailabilityAction(teacherId: string) {
    const session = await requireAdmin();
    
    await prisma.user.update({
        where: { id: teacherId },
        data: { 
            availabilityLocked: false,
            availabilityLastModifiedById: session.user.id,
            availabilityUpdatedAt: new Date()
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
        description: `Disponibilidad de docente desbloqueada por administrador`,
        success: true,
    });

    revalidatePath("/dashboard/admin/teachers");
    return { success: true };
}

export async function adminLockTeacherAvailabilityAction(teacherId: string) {
    const session = await requireAdmin();
    
    await prisma.user.update({
        where: { id: teacherId },
        data: { 
            availabilityLocked: true,
            availabilityLastModifiedById: session.user.id,
            availabilityUpdatedAt: new Date()
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
        description: `Disponibilidad de docente publicada/aprobada por administrador`,
        success: true,
    });

    revalidatePath("/dashboard/admin/teachers");
    return { success: true };
}

// 6. Save availability by admin (granular synchronization preserving untouched slots)
export async function adminSaveTeacherAvailabilityAction(
    teacherId: string, 
    slots: { id?: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }[],
    academicScheduleId?: string
) {
    const session = await requireAdmin();

    // Check if the user is a teacher
    const user = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { role: true }
    });

    if (!user || user.role !== "teacher") {
        throw new Error("El usuario especificado no es un profesor válido.");
    }

    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;

    // Save in transaction with granular diff
    await prisma.$transaction(async (tx) => {
        const hasChanges = await syncTeacherAvailabilitySlots(tx, teacherId, session.user.id, slots, targetScheduleId);

        if (hasChanges) {
            await tx.user.update({
                where: { id: teacherId },
                data: { 
                    availabilityLastModifiedById: session.user.id,
                    availabilityUpdatedAt: new Date()
                }
            });
        }
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/teacher/schedule");
    return { success: true };
}
