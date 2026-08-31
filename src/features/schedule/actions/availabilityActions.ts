"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DayOfWeek } from "@/generated/prisma/client";

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
            availabilityLocked: true,
            availabilityLastModifiedBy: {
                select: { name: true, role: true }
            },
            availabilityUpdatedAt: true
        }
    });

    const activeSchedule = await prisma.academicSchedule.findFirst({ where: { isActive: true }, select: { id: true } }) 
        || await prisma.academicSchedule.findFirst({ select: { id: true } });
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

    const schedules = await prisma.academicSchedule.findMany({
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, isActive: true, isPublished: true }
    });

    return {
        locked: user?.availabilityLocked ?? false,
        lastModifiedBy: user?.availabilityLastModifiedBy ? {
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
            } : null
        }))
    };
}

// 2. Save teacher availability (draft)
export async function saveTeacherAvailabilityAction(
    slots: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[],
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

    // Save in transaction
    await prisma.$transaction(async (tx) => {
        // Delete existing slots for this scope
        await tx.teacherAvailability.deleteMany({
            where: { 
                teacherId: userId,
                ...(targetScheduleId ? { academicScheduleId: targetScheduleId } : { academicScheduleId: null })
            }
        });

        // Create new slots
        if (slots.length > 0) {
            await tx.teacherAvailability.createMany({
                data: slots.map(s => ({
                    teacherId: userId,
                    academicScheduleId: targetScheduleId,
                    createdById: userId,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime
                }))
            });
        }

        // Update tracking info
        await tx.user.update({
            where: { id: userId },
            data: {
                availabilityLastModifiedById: userId,
                availabilityUpdatedAt: new Date()
            }
        });
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
                select: { name: true, role: true }
            },
            availabilityUpdatedAt: true
        }
    });

    if (!user) {
        throw new Error("Profesor no encontrado");
    }

    const activeSchedule = await prisma.academicSchedule.findFirst({ where: { isActive: true }, select: { id: true } }) 
        || await prisma.academicSchedule.findFirst({ select: { id: true } });
    const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : activeSchedule?.id || null;

    let slots = await prisma.teacherAvailability.findMany({
        where: { 
            teacherId,
            ...(targetScheduleId ? { academicScheduleId: targetScheduleId } : {})
        },
        orderBy: [
            { dayOfWeek: "asc" },
            { startTime: "asc" }
        ]
    });

    const schedules = await prisma.academicSchedule.findMany({
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, isActive: true, isPublished: true }
    });

    return {
        teacherName: user.name,
        teacherEmail: user.email,
        locked: user.availabilityLocked,
        lastModifiedBy: user.availabilityLastModifiedBy ? {
            name: user.availabilityLastModifiedBy.name,
            role: user.availabilityLastModifiedBy.role
        } : null,
        updatedAt: user.availabilityUpdatedAt,
        schedules,
        slots: slots.map(s => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek as DayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime
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

// 6. Save availability by admin
export async function adminSaveTeacherAvailabilityAction(
    teacherId: string, 
    slots: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[],
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

    // Save in transaction
    await prisma.$transaction(async (tx) => {
        // Delete existing slots for this scope
        await tx.teacherAvailability.deleteMany({
            where: { 
                teacherId,
                ...(targetScheduleId ? { academicScheduleId: targetScheduleId } : { academicScheduleId: null })
            }
        });

        // Create new slots
        if (slots.length > 0) {
            await tx.teacherAvailability.createMany({
                data: slots.map(s => ({
                    teacherId,
                    academicScheduleId: targetScheduleId,
                    createdById: session.user.id,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime
                }))
            });
        }
    });

    // Update tracking
    await prisma.user.update({
        where: { id: teacherId },
        data: { 
            availabilityLastModifiedById: session.user.id,
            availabilityUpdatedAt: new Date()
        }
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/teacher/schedule");
    return { success: true };
}
