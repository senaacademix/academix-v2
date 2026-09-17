"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

async function requireAdmin() {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) {
        throw new Error("Unauthorized: Admin or Gestor access required");
    }
    return session;
}

/**
 * Obtener todas las líneas de tiempo de un programa con sus periodos y cursos plantilla
 */
export async function getProgramTimelinesAction(programId: string) {
    await requireAdmin();
    if (!programId) throw new Error("ID de programa requerido");

    return await prisma.curriculumTimeline.findMany({
        where: { programId },
        orderBy: [
            { isDefault: "desc" },
            { createdAt: "asc" }
        ],
        include: {
            periods: {
                orderBy: { order: "asc" },
                include: {
                    courses: {
                        where: { groupId: null },
                        orderBy: { order: "asc" },
                        include: {
                            teacher: {
                                select: { id: true, name: true, email: true }
                            },
                            schedules: true,
                        }
                    }
                }
            }
        }
    });
}

/**
 * Crear una nueva línea de tiempo personalizada para un programa de formación
 */
export async function createTimelineAction(data: {
    programId: string;
    name: string;
    description?: string;
    code?: string;
    isDefault?: boolean;
}) {
    const session = await requireAdmin();

    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre de la línea de tiempo debe tener al menos 2 caracteres");
    }
    if (!data.programId) {
        throw new Error("El programa de formación es obligatorio");
    }

    // Si se marca como default, desmarcar las existentes
    if (data.isDefault) {
        await prisma.curriculumTimeline.updateMany({
            where: { programId: data.programId },
            data: { isDefault: false }
        });
    } else {
        // Si es la primera línea del programa, hacerla default automáticamente
        const count = await prisma.curriculumTimeline.count({
            where: { programId: data.programId }
        });
        if (count === 0) {
            data.isDefault = true;
        }
    }

    const timeline = await prisma.curriculumTimeline.create({
        data: {
            programId: data.programId,
            name: data.name.trim(),
            description: data.description?.trim() || null,
            code: data.code?.trim() || null,
            isDefault: data.isDefault ?? false,
        },
        include: {
            periods: true,
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "OTHER",
        entityId: timeline.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Línea de tiempo creada: ${timeline.name}`,
        metadata: { name: timeline.name, programId: timeline.programId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return timeline;
}

/**
 * Actualizar una línea de tiempo
 */
export async function updateTimelineAction(
    id: string,
    data: {
        name: string;
        description?: string;
        code?: string;
        isDefault?: boolean;
    }
) {
    const session = await requireAdmin();

    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre de la línea de tiempo debe tener al menos 2 caracteres");
    }

    const existing = await prisma.curriculumTimeline.findUnique({
        where: { id },
        select: { programId: true }
    });

    if (!existing) {
        throw new Error("Línea de tiempo no encontrada");
    }

    if (data.isDefault) {
        await prisma.curriculumTimeline.updateMany({
            where: { programId: existing.programId, id: { not: id } },
            data: { isDefault: false }
        });
    }

    const updated = await prisma.curriculumTimeline.update({
        where: { id },
        data: {
            name: data.name.trim(),
            description: data.description !== undefined ? data.description.trim() || null : undefined,
            code: data.code !== undefined ? data.code.trim() || null : undefined,
            isDefault: data.isDefault,
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Línea de tiempo actualizada: ${updated.name}`,
        metadata: { name: updated.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return updated;
}

/**
 * Eliminar una línea de tiempo (solo si no es la única del programa)
 */
export async function deleteTimelineAction(id: string) {
    const session = await requireAdmin();

    const timeline = await prisma.curriculumTimeline.findUnique({
        where: { id },
        include: {
            periods: {
                include: {
                    courses: true
                }
            }
        }
    });

    if (!timeline) {
        throw new Error("Línea de tiempo no encontrada");
    }

    // Verificar que el programa tenga más de 1 línea de tiempo
    const count = await prisma.curriculumTimeline.count({
        where: { programId: timeline.programId }
    });

    if (count <= 1) {
        throw new Error("No es posible eliminar la única línea de tiempo del programa. El programa debe tener al menos una línea.");
    }

    // Si era la por defecto, promover otra
    if (timeline.isDefault) {
        const nextTimeline = await prisma.curriculumTimeline.findFirst({
            where: { programId: timeline.programId, id: { not: id } }
        });
        if (nextTimeline) {
            await prisma.curriculumTimeline.update({
                where: { id: nextTimeline.id },
                data: { isDefault: true }
            });
        }
    }

    const deleted = await prisma.curriculumTimeline.delete({
        where: { id }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "OTHER",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Línea de tiempo eliminada: ${timeline.name}`,
        metadata: { name: timeline.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return deleted;
}

/**
 * Duplicar una línea de tiempo existente, clonando sus periodos y materias base (plantilla)
 */
export async function duplicateTimelineAction(timelineId: string, newName: string) {
    const session = await requireAdmin();

    if (!newName || newName.trim().length < 2) {
        throw new Error("El nombre de la nueva línea de tiempo debe tener al menos 2 caracteres");
    }

    const source = await prisma.curriculumTimeline.findUnique({
        where: { id: timelineId },
        include: {
            periods: {
                include: {
                    courses: {
                        where: { groupId: null } // solo materias plantilla
                    }
                }
            }
        }
    });

    if (!source) {
        throw new Error("Línea de tiempo origen no encontrada");
    }

    // Crear la nueva línea
    const duplicated = await prisma.curriculumTimeline.create({
        data: {
            programId: source.programId,
            name: newName.trim(),
            description: `Copia de ${source.name}`,
            isDefault: false,
        }
    });

    // Clonar periodos y sus cursos plantilla
    for (const period of source.periods) {
        const newPeriod = await prisma.period.create({
            data: {
                name: period.name,
                description: period.description,
                order: period.order,
                esEspecial: period.esEspecial,
                programId: source.programId,
                timelineId: duplicated.id,
            }
        });

        for (const course of period.courses) {
            await prisma.course.create({
                data: {
                    title: course.title,
                    description: course.description,
                    badge: course.badge,
                    badgeColor: course.badgeColor,
                    weeklyHours: course.weeklyHours,
                    periodId: newPeriod.id,
                    order: course.order,
                }
            });
        }
    }

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "OTHER",
        entityId: duplicated.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Línea de tiempo duplicada: ${duplicated.name} (desde ${source.name})`,
        metadata: { name: duplicated.name, sourceId: source.id },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return duplicated;
}
