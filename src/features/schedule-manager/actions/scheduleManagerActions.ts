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
import { isScheduleCurrent, formatCalendarDate } from "@/lib/dateUtils";

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
export async function getTeachersListAction(programId?: string, academicScheduleId?: string) {
  const session = await requireAdmin();
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

  const targetScheduleId = academicScheduleId && academicScheduleId !== "all" ? academicScheduleId : null;

  const teachers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      profile: {
        select: {
          identificacion: true
        }
      },
      teacherScheduleLocks: targetScheduleId ? {
        where: { academicScheduleId: targetScheduleId },
        select: {
          availabilityLocked: true,
          qualificationsLocked: true,
          allowPastAttendanceEdit: true
        }
      } : false
    },
    orderBy: { name: "asc" }
  });

  return teachers.map((t) => {
    const lock = (t as any).teacherScheduleLocks?.[0];
    return {
      id: t.id,
      name: t.name,
      email: t.email,
      profile: t.profile,
      scheduleLock: lock ? {
        availabilityLocked: lock.availabilityLocked,
        qualificationsLocked: lock.qualificationsLocked,
        allowPastAttendanceEdit: lock.allowPastAttendanceEdit
      } : {
        availabilityLocked: false,
        qualificationsLocked: false,
        allowPastAttendanceEdit: false
      }
    };
  });
}

/**
 * Obtener todos los horarios académicos registrados (filtrables por programa de formación)
 */
export async function getSchedulesAction(programId?: string): Promise<AcademicScheduleItem[]> {
  try {
    const session = await requireAdmin();

    const effectiveProgramId = programId && programId !== "all" && programId !== "ALL" ? programId : undefined;

    const groupSlotsWhere: any = {};
    if (effectiveProgramId) {
      groupSlotsWhere.group = { programId: effectiveProgramId };
    } else if (session.user.role === "gestor") {
      groupSlotsWhere.group = {
        program: {
          gestores: {
            some: { id: session.user.id }
          }
        }
      };
    }

    const schedules = await prisma.academicSchedule.findMany({
      orderBy: { startDate: "desc" },
      include: {
        groupSlots: {
          where: Object.keys(groupSlotsWhere).length > 0 ? groupSlotsWhere : undefined,
          include: {
            period: {
              select: {
                id: true,
                name: true,
                timeline: {
                  select: {
                    id: true,
                    name: true
                  }
                }
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

    return schedules.map((item) => {
      const isCurrent = isScheduleCurrent(item.startDate, item.endDate);
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
            period: {
              select: {
                id: true,
                name: true,
                timeline: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
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
          }
        }
      }
    });

    if (!item) return null;
    const isCurrent = isScheduleCurrent(item.startDate, item.endDate);
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
  } catch (error) {
    console.error("Error al obtener horario por id:", error);
    return null;
  }
}

/**
 * Obtener todos los grupos disponibles agrupados por programa (filtrable por programId)
 */
export async function getAvailableGroupsAction(programId?: string): Promise<AvailableGroupOption[]> {
  try {
    const session = await requireAdmin();

    const whereClause: any = {
      NOT: {
        categoria: "PRODUCTIVA"
      }
    };

    if (programId && programId !== "all" && programId !== "ALL") {
      whereClause.programId = programId;
    } else if (session.user.role === "gestor") {
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
                esEspecial: true,
                timelineId: true,
                timeline: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
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
      availablePeriods: ((g.program as any).periods || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        esEspecial: p.esEspecial,
        timelineId: p.timelineId,
        timelineName: p.timeline?.name || "Jornada Regular",
      }))
    }));
  } catch (error) {
    console.error("Error al obtener grupos disponibles:", error);
    return [];
  }
}

/**
 * Helper para validar unicidad de nombre de horario
 */
async function checkScheduleNameUnique(name: string, excludeScheduleId?: string): Promise<string | null> {
  const existing = await prisma.academicSchedule.findFirst({
    where: {
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
      name: { equals: name.trim(), mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (existing) {
    return `Ya existe un horario con el nombre "${name.trim()}". Por favor utiliza un nombre diferente.`;
  }
  return null;
}

/**
 * Helper para validar traslape de rangos de fechas de horarios
 * No permite crear ni actualizar horarios donde alguna parte de los rangos esté en ambos horarios.
 */
async function checkScheduleDateConflict(startDate: Date, endDate: Date, excludeScheduleId?: string): Promise<string | null> {
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
    const formatDate = (d: Date | string) => formatCalendarDate(d, "dd 'de' MMM 'de' yyyy");

    const startFmt = formatDate(startDate);
    const endFmt = formatDate(endDate);
    const confStartFmt = formatDate(conflictingSchedule.startDate);
    const confEndFmt = formatDate(conflictingSchedule.endDate);

    return `Conflicto de Fechas: El rango propuesto (${startFmt} a ${endFmt}) se traslapa con el horario existente "${conflictingSchedule.name}" (${confStartFmt} a ${confEndFmt}). Ninguna fecha puede pertenecer a más de un horario.`;
  }
  return null;
}

/**
 * 1. Crear Horario Académico básico (Nombre, Fechas y Descripción)
 */
export async function createBasicScheduleAction(data: BasicSchedulePayload): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
  try {
    const session = await requireAdmin();

    if (!data.name || !data.name.trim()) {
      return { success: false, error: "El nombre del horario es obligatorio" };
    }
    if (!data.startDate || !data.endDate) {
      return { success: false, error: "Las fechas de inicio y fin son obligatorias" };
    }

    const startDate = new Date(data.startDate + (data.startDate.includes("T") ? "" : "T00:00:00.000Z"));
    const endDate = new Date(data.endDate + (data.endDate.includes("T") ? "" : "T23:59:59.999Z"));

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, error: "Las fechas proporcionadas no son válidas" };
    }

    if (startDate > endDate) {
      return { success: false, error: "La fecha de inicio no puede ser posterior a la fecha de fin" };
    }

    // Validar nombre único para evitar confusión de horarios duplicados
    const nameConflict = await checkScheduleNameUnique(data.name);
    if (nameConflict) {
      return { success: false, error: nameConflict };
    }

    // Validar que ninguna parte del rango de fechas se traslape con otros horarios existentes
    const dateConflict = await checkScheduleDateConflict(startDate, endDate);
    if (dateConflict) {
      return { success: false, error: dateConflict };
    }

    const shouldBeActive = isScheduleCurrent(startDate, endDate);

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
      userRole: session.user.role || "admin",
      description: `Creación de horario académico: "${newSchedule.name}"`,
      metadata: {
        scheduleId: newSchedule.id,
        name: newSchedule.name,
        isActive: shouldBeActive,
        programId: data.programId,
      },
      success: true
    });

    revalidatePath("/dashboard/admin/schedules");
    revalidatePath("/dashboard/gestor/schedules");
    return { success: true, scheduleId: newSchedule.id };
  } catch (err: any) {
    console.warn("createBasicScheduleAction error:", err.message);
    return { success: false, error: err.message || "Error al crear el horario" };
  }
}

/**
 * 1.1 Actualizar Horario Académico básico (Nombre, Fechas, Descripción)
 */
export async function updateBasicScheduleAction(id: string, data: BasicSchedulePayload): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdmin();

    if (!id) return { success: false, error: "ID del horario no proporcionado" };
    if (!data.name || !data.name.trim()) {
      return { success: false, error: "El nombre del horario es obligatorio" };
    }
    if (!data.startDate || !data.endDate) {
      return { success: false, error: "Las fechas de inicio y fin son obligatorias" };
    }

    const currentSchedule = await prisma.academicSchedule.findUnique({
      where: { id },
      select: { id: true, name: true, startDate: true, endDate: true }
    });

    if (!currentSchedule) {
      return { success: false, error: "El horario académico no existe" };
    }

    const startDate = new Date(data.startDate + (data.startDate.includes("T") ? "" : "T00:00:00.000Z"));
    const endDate = new Date(data.endDate + (data.endDate.includes("T") ? "" : "T23:59:59.999Z"));

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, error: "Las fechas proporcionadas no son válidas" };
    }

    if (startDate > endDate) {
      return { success: false, error: "La fecha de inicio no puede ser posterior a la fecha de fin" };
    }

    // Validar nombre único excluyendo el horario actual
    const nameConflict = await checkScheduleNameUnique(data.name, id);
    if (nameConflict) {
      return { success: false, error: nameConflict };
    }

    // Validar que ninguna parte del rango de fechas se traslape con otros horarios existentes
    const dateConflict = await checkScheduleDateConflict(startDate, endDate, id);
    if (dateConflict) {
      return { success: false, error: dateConflict };
    }

    const newIsActive = isScheduleCurrent(startDate, endDate);

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
    revalidatePath("/dashboard/gestor/schedules");
    return { success: true };
  } catch (err: any) {
    console.warn("updateBasicScheduleAction error:", err.message);
    return { success: false, error: err.message || "Error al actualizar el horario" };
  }
}

/**
 * 2. Guardar / Asignar Grupos y sus Franjas Horarias (Lunes a Domingo) para un Horario específico
 */
export async function saveScheduleGroupSlotsAction(payload: SaveGroupSlotsPayload) {
  const session = await requireAdmin();

  const { scheduleId, programId, groupsConfig } = payload;
  if (!scheduleId) throw new Error("ID del horario no especificado");

  const schedule = await prisma.academicSchedule.findUnique({
    where: { id: scheduleId },
    select: { name: true, startDate: true, endDate: true }
  });

  if (!schedule) throw new Error("El horario académico no existe");

  await prisma.$transaction(async (tx) => {
    // 1. Limpiar franjas previas del horario (solo para el programa si se especifica)
    const deleteWhere: any = { academicScheduleId: scheduleId };
    if (programId && programId !== "all" && programId !== "ALL") {
      deleteWhere.group = { programId };
    }
    await tx.scheduleGroupSlot.deleteMany({
      where: deleteWhere
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
    userRole: session.user.role || "admin",
    description: `Asignación de ${groupsConfig.length} grupos y franjas horarias al horario "${schedule.name}"`,
    metadata: { scheduleId, groupsCount: groupsConfig.length },
    success: true
  });

  revalidatePath("/dashboard/admin/schedules");
  revalidatePath("/dashboard/gestor/schedules");
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
    userRole: session.user.role || "admin",
    description: `Eliminación de horario académico: "${schedule?.name || id}"`,
    metadata: { scheduleId: id },
    success: true
  });

  revalidatePath("/dashboard/admin/schedules");
  revalidatePath("/dashboard/gestor/schedules");
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
    userRole: session.user.role || "admin",
    description: `Activación de horario académico como vigente principal: "${schedule.name}"`,
    metadata: { scheduleId: id, name: schedule.name },
    success: true
  });

  revalidatePath("/dashboard/admin/schedules");
  revalidatePath("/dashboard/gestor/schedules");
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

  const isCurrent = isScheduleCurrent(schedule.startDate, schedule.endDate);

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
    userRole: session.user.role || "admin",
    description: `Cambio de estado de publicación de horario: "${schedule.name}" a ${nextState ? "PÚBLICO" : "BORRADOR"}`,
    metadata: { scheduleId: id, name: schedule.name, isPublished: nextState },
    success: true
  });

  revalidatePath("/dashboard/admin/schedules");
  revalidatePath("/dashboard/gestor/schedules");
  return { success: true, isPublished: nextState };
}
