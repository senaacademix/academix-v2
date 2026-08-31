"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  AcademicScheduleItem, 
  BasicSchedulePayload, 
  SaveGroupSlotsPayload,
  AvailableGroupOption 
} from "../types";

async function getSession() {
  return await auth.api.getSession({ headers: await headers() });
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || (session.user.role !== "admin" && session.user.role !== "gestor" && session.user.role !== "observer")) {
    throw new Error("No autorizado: Se requiere rol de coordinador o gestor");
  }
  return session;
}

/**
 * Obtener todos los profesores registrados para gestión en el panel de horarios
 */
export async function getTeachersListAction() {
  await requireAdmin();
  const teachers = await prisma.user.findMany({
    where: { role: "teacher", banned: { not: true } },
    select: {
      id: true,
      name: true,
      email: true,
      profile: {
        select: {
          identificacion: true
        }
      }
    },
    orderBy: { name: "asc" }
  });
  return teachers;
}

/**
 * Obtener todos los horarios académicos registrados
 */
export async function getSchedulesAction(): Promise<AcademicScheduleItem[]> {
  try {
    await requireAdmin();

    const schedules = await prisma.academicSchedule.findMany({
      orderBy: { startDate: "desc" },
      include: {
        groupSlots: {
          include: {
            period: {
              select: {
                id: true,
                name: true
              }
            },
            group: {
              select: {
                id: true,
                name: true,
                categoria: true,
                program: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: [
            { groupId: "asc" },
            { dayOfWeek: "asc" }
          ]
        }
      }
    });

    const now = new Date();

    return schedules.map((item) => {
      const isCurrent = now >= item.startDate && now <= item.endDate;
      const isPublished = isCurrent ? item.isPublished : true;
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        startDate: item.startDate.toISOString(),
        endDate: item.endDate.toISOString(),
        isActive: isCurrent,
        isPublished,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        groupSlots: item.groupSlots.map((slot) => ({
          id: slot.id,
          academicScheduleId: slot.academicScheduleId,
          groupId: slot.groupId,
          periodId: slot.periodId,
          period: slot.period,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          group: {
            id: slot.group.id,
            name: slot.group.name,
            categoria: slot.group.categoria,
            program: {
              id: slot.group.program.id,
              name: slot.group.program.name
            }
          }
        }))
      };
    });
  } catch (error) {
    console.error("Error al obtener horarios académicos:", error);
    return [];
  }
}

/**
 * Obtener un horario por su ID
 */
export async function getScheduleByIdAction(id: string): Promise<AcademicScheduleItem | null> {
  try {
    await requireAdmin();

    const item = await prisma.academicSchedule.findUnique({
      where: { id },
      include: {
        groupSlots: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                categoria: true,
                program: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!item) return null;
    const now = new Date();
    const isCurrent = now >= item.startDate && now <= item.endDate;
    const isPublished = isCurrent ? item.isPublished : true;

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      startDate: item.startDate.toISOString(),
      endDate: item.endDate.toISOString(),
      isActive: isCurrent,
      isPublished,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      groupSlots: item.groupSlots.map((slot) => ({
        id: slot.id,
        academicScheduleId: slot.academicScheduleId,
        groupId: slot.groupId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        group: {
          id: slot.group.id,
          name: slot.group.name,
          categoria: slot.group.categoria,
          program: {
            id: slot.group.program.id,
            name: slot.group.program.name
          }
        }
      }))
    };
  } catch (error) {
    console.error("Error al obtener horario por id:", error);
    return null;
  }
}

/**
 * Obtener todos los grupos disponibles agrupados por programa
 */
export async function getAvailableGroupsAction(): Promise<AvailableGroupOption[]> {
  try {
    const session = await requireAdmin();

    const whereClause: any = {
      NOT: {
        categoria: "PRODUCTIVA"
      }
    };

    if (session.user.role === "gestor") {
      whereClause.program = {
        gestores: {
          some: {
            id: session.user.id
          }
        }
      };
    }

    const groups = await prisma.group.findMany({
      where: whereClause,
      orderBy: [
        { program: { name: "asc" } },
        { name: "asc" }
      ],
      select: {
        id: true,
        name: true,
        categoria: true,
        programId: true,
        program: {
          select: {
            id: true,
            name: true,
            periods: {
              select: {
                id: true,
                name: true,
                esEspecial: true
              },
              orderBy: { order: "asc" }
            }
          }
        },
        environment: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      categoria: g.categoria || "LECTIVA",
      programId: g.programId,
      programName: g.program.name,
      periodName: null,
      environmentName: g.environment?.name || null,
      availablePeriods: (g.program as any).periods || []
    }));
  } catch (error) {
    console.error("Error al obtener grupos disponibles:", error);
    return [];
  }
}

/**
 * Helper para validar traslape de rangos de fechas de horarios
 */
async function validateNoScheduleDateConflict(startDate: Date, endDate: Date, excludeScheduleId?: string) {
  // Dos rangos [A_start, A_end] y [B_start, B_end] se traslapan si: A_start <= B_end AND A_end >= B_start
  const conflictingSchedule = await prisma.academicSchedule.findFirst({
    where: {
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  });

  if (conflictingSchedule) {
    const formatDate = (d: Date) => {
      return d.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    };

    const startFmt = formatDate(startDate);
    const endFmt = formatDate(endDate);
    const confStartFmt = formatDate(conflictingSchedule.startDate);
    const confEndFmt = formatDate(conflictingSchedule.endDate);

    throw new Error(
      `Conflicto de Fechas: El rango propuesto (${startFmt} a ${endFmt}) se traslapa con el horario existente "${conflictingSchedule.name}" (${confStartFmt} a ${confEndFmt}). Ningún horario puede traslaparse en fechas.`
    );
  }
}

/**
 * 1. Crear Horario Académico básico (Nombre, Fechas y Descripción)
 */
export async function createBasicScheduleAction(data: BasicSchedulePayload) {
  const session = await requireAdmin();

  if (!data.name || !data.name.trim()) {
    throw new Error("El nombre del horario es obligatorio");
  }
  if (!data.startDate || !data.endDate) {
    throw new Error("Las fechas de inicio y fin son obligatorias");
  }

  const startDate = new Date(data.startDate + (data.startDate.includes("T") ? "" : "T00:00:00.000Z"));
  const endDate = new Date(data.endDate + (data.endDate.includes("T") ? "" : "T23:59:59.999Z"));

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Las fechas proporcionadas no son válidas");
  }

  if (startDate > endDate) {
    throw new Error("La fecha de inicio no puede ser posterior a la fecha de fin");
  }

  // Validar conflicto de rango de fechas con otros horarios existentes
  await validateNoScheduleDateConflict(startDate, endDate);

  const now = new Date();
  const shouldBeActive = now >= startDate && now <= endDate;

  const newSchedule = await prisma.academicSchedule.create({
    data: {
      name: data.name.trim(),
      description: data.description ? data.description.trim() : null,
      startDate,
      endDate,
      isActive: shouldBeActive
    }
  });

  const { auditLogger } = await import("@/features/admin/services/auditLogger");
  await auditLogger.log({
    action: "CREATE",
    entity: "SCHEDULE",
    entityId: newSchedule.id,
    userId: session.user.id,
    userName: session.user.name || "Admin",
    userRole: "admin",
    description: `Creación de horario académico: "${newSchedule.name}"`,
    metadata: { scheduleId: newSchedule.id, name: newSchedule.name, isActive: shouldBeActive },
    success: true
  });

  revalidatePath("/dashboard/admin/schedules");
  return { success: true, scheduleId: newSchedule.id };
}

/**
 * 1.1 Actualizar Horario Académico básico (Nombre, Fechas, Descripción)
 */
export async function updateBasicScheduleAction(id: string, data: BasicSchedulePayload) {
  const session = await requireAdmin();

  if (!id) throw new Error("ID del horario no proporcionado");
  if (!data.name || !data.name.trim()) {
    throw new Error("El nombre del horario es obligatorio");
  }
  if (!data.startDate || !data.endDate) {
    throw new Error("Las fechas de inicio y fin son obligatorias");
  }

  const currentSchedule = await prisma.academicSchedule.findUnique({
    where: { id },
    select: { id: true, name: true, startDate: true, endDate: true }
  });

  if (!currentSchedule) {
    throw new Error("El horario académico no existe");
  }

  const startDate = new Date(data.startDate + (data.startDate.includes("T") ? "" : "T00:00:00.000Z"));
  const endDate = new Date(data.endDate + (data.endDate.includes("T") ? "" : "T23:59:59.999Z"));

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Las fechas proporcionadas no son válidas");
  }

  if (startDate > endDate) {
    throw new Error("La fecha de inicio no puede ser posterior a la fecha de fin");
  }

  // Validar conflicto de rango de fechas excluyendo el horario actual
  await validateNoScheduleDateConflict(startDate, endDate, id);

  const now = new Date();
  const newIsActive = now >= startDate && now <= endDate;

  await prisma.academicSchedule.update({
    where: { id },
    data: {
      name: data.name.trim(),
      description: data.description ? data.description.trim() : null,
      startDate,
      endDate,
      isActive: newIsActive
    }
  });

  const { auditLogger } = await import("@/features/admin/services/auditLogger");
  await auditLogger.log({
    action: "UPDATE",
    entity: "SCHEDULE",
    entityId: id,
    userId: session.user.id,
    userName: session.user.name || "Admin",
    userRole: "admin",
    description: `Actualización de datos básicos de horario: "${data.name}"`,
    metadata: { scheduleId: id, name: data.name },
    success: true
  });

  revalidatePath("/dashboard/admin/schedules");
  return { success: true };
}

/**
 * 2. Guardar / Asignar Grupos y sus Franjas Horarias (Lunes a Domingo) para un Horario específico
 */
export async function saveScheduleGroupSlotsAction(payload: SaveGroupSlotsPayload) {
  const session = await requireAdmin();

  const { scheduleId, groupsConfig } = payload;
  if (!scheduleId) throw new Error("ID del horario no especificado");

  const schedule = await prisma.academicSchedule.findUnique({
    where: { id: scheduleId },
    select: { name: true, startDate: true, endDate: true }
  });

  if (!schedule) throw new Error("El horario académico no existe");

  await prisma.$transaction(async (tx) => {
    // 1. Limpiar franjas previas del horario
    await tx.scheduleGroupSlot.deleteMany({
      where: { academicScheduleId: scheduleId }
    });

    // 2. Crear las nuevas franjas por grupo
    if (groupsConfig && groupsConfig.length > 0) {
      const slotsToCreate: {
        academicScheduleId: string;
        groupId: string;
        periodId?: string | null;
        dayOfWeek: any;
        startTime: string;
        endTime: string;
      }[] = [];

      for (const groupConf of groupsConfig) {
        for (const slot of groupConf.slots) {
          if (slot.startTime && slot.endTime) {
            slotsToCreate.push({
              academicScheduleId: scheduleId,
              groupId: groupConf.groupId,
              periodId: groupConf.periodId || null,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime
            });
          }
        }
      }

      if (slotsToCreate.length > 0) {
        await tx.scheduleGroupSlot.createMany({
          data: slotsToCreate
        });
      }
    }
  });

  const { auditLogger } = await import("@/features/admin/services/auditLogger");
  await auditLogger.log({
    action: "UPDATE",
    entity: "SCHEDULE",
    entityId: scheduleId,
    userId: session.user.id,
    userName: session.user.name || "Admin",
    userRole: "admin",
    description: `Asignación de ${groupsConfig.length} grupos y franjas horarias al horario "${schedule.name}"`,
    metadata: { scheduleId, groupsCount: groupsConfig.length },
    success: true
  });

  revalidatePath("/dashboard/admin/schedules");
  return { success: true };
}

/**
 * Eliminar un Horario Académico
 */
export async function deleteScheduleAction(id: string) {
  const session = await requireAdmin();

  if (!id) throw new Error("ID del horario no proporcionado");

  const schedule = await prisma.academicSchedule.findUnique({
    where: { id },
    select: { name: true }
  });

  await prisma.academicSchedule.delete({
    where: { id }
  });

  const { auditLogger } = await import("@/features/admin/services/auditLogger");
  await auditLogger.log({
    action: "DELETE",
    entity: "SCHEDULE",
    entityId: id,
    userId: session.user.id,
    userName: session.user.name || "Admin",
    userRole: "admin",
    description: `Eliminación de horario académico: "${schedule?.name || id}"`,
    metadata: { scheduleId: id },
    success: true
  });

  revalidatePath("/dashboard/admin/schedules");
  return { success: true };
}

/**
 * Activar un Horario como el Único Horario Vigente Activo
 */
export async function setActiveScheduleAction(id: string) {
  const session = await requireAdmin();

  if (!id) throw new Error("ID del horario no proporcionado");

  const schedule = await prisma.academicSchedule.findUnique({
    where: { id },
    select: { id: true, name: true }
  });

  if (!schedule) throw new Error("El horario académico no existe");

  await prisma.$transaction(async (tx) => {
    // 1. Desactivar todos los horarios
    await tx.academicSchedule.updateMany({
      data: { isActive: false }
    });

    // 2. Activar únicamente el horario seleccionado
    await tx.academicSchedule.update({
      where: { id },
      data: { isActive: true }
    });
  });

  const { auditLogger } = await import("@/features/admin/services/auditLogger");
  await auditLogger.log({
    action: "UPDATE",
    entity: "SCHEDULE",
    entityId: id,
    userId: session.user.id,
    userName: session.user.name || "Admin",
    userRole: "admin",
    description: `Activación de horario académico como vigente principal: "${schedule.name}"`,
    metadata: { scheduleId: id, name: schedule.name },
    success: true
  });

  revalidatePath("/dashboard/admin/schedules");
  return { success: true, scheduleName: schedule.name };
}

/**
 * Alternar estado entre Público y Borrador (solo permitido para el horario vigente)
 */
export async function togglePublishScheduleAction(id: string) {
  const session = await requireAdmin();

  if (!id) throw new Error("ID del horario no proporcionado");

  const schedule = await prisma.academicSchedule.findUnique({
    where: { id },
    select: { id: true, name: true, startDate: true, endDate: true, isPublished: true }
  });

  if (!schedule) throw new Error("El horario académico no existe");

  const now = new Date();
  const isCurrent = now >= schedule.startDate && now <= schedule.endDate;

  if (!isCurrent) {
    throw new Error("Solo el horario vigente puede alternar su estado entre Público y Borrador. Los demás horarios son siempre públicos.");
  }

  const currentPublished = schedule.isPublished ?? true;
  const nextState = !currentPublished;

  await prisma.academicSchedule.update({
    where: { id },
    data: { isPublished: nextState }
  });

  const { auditLogger } = await import("@/features/admin/services/auditLogger");
  await auditLogger.log({
    action: "UPDATE",
    entity: "SCHEDULE",
    entityId: id,
    userId: session.user.id,
    userName: session.user.name || "Admin",
    userRole: "admin",
    description: `Cambio de estado de publicación de horario: "${schedule.name}" a ${nextState ? "PÚBLICO" : "BORRADOR"}`,
    metadata: { scheduleId: id, name: schedule.name, isPublished: nextState },
    success: true
  });

  revalidatePath("/dashboard/admin/schedules");
  return { success: true, isPublished: nextState };
}
