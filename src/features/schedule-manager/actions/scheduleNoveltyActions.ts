"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ScheduleNoveltyType } from "@/generated/prisma/client";

export interface CreateNoveltyInput {
  groupId?: string | null;
  isGeneral?: boolean;
  type: ScheduleNoveltyType;
  title: string;
  description?: string;
  startDate: string; // ISO date string or "YYYY-MM-DD"
  endDate: string;   // ISO date string or "YYYY-MM-DD"
  courseId?: string | null;
  newEnvironmentId?: string | null;
}

export async function createScheduleNoveltyAction(input: CreateNoveltyInput) {
  try {
    if (!input.isGeneral && !input.groupId) {
      throw new Error("Debes seleccionar una ficha específica o indicar que aplica a todas las fichas del horario");
    }
    if (!input.title || !input.title.trim()) throw new Error("El título de la novedad es obligatorio");
    if (!input.startDate || !input.endDate) throw new Error("Las fechas de inicio y fin son obligatorias");

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Formato de fecha inválido");
    }

    if (start > end) {
      throw new Error("La fecha de inicio no puede ser posterior a la fecha final");
    }

    // Validate date range if groupId is specified
    if (input.groupId) {
      const groupSlot = await prisma.scheduleGroupSlot.findFirst({
        where: { groupId: input.groupId },
        include: { academicSchedule: true },
      });

      if (groupSlot?.academicSchedule) {
        const schedStart = groupSlot.academicSchedule.startDate;
        const schedEnd = groupSlot.academicSchedule.endDate;

        if (schedStart) {
          const minStart = new Date(schedStart);
          minStart.setHours(0, 0, 0, 0);
          if (start < minStart) {
            throw new Error(
              `La fecha de inicio no puede ser anterior al inicio del horario (${schedStart.toISOString().split("T")[0]})`
            );
          }
        }

        if (schedEnd) {
          const maxEnd = new Date(schedEnd);
          maxEnd.setHours(23, 59, 59, 999);
          if (end > maxEnd) {
            throw new Error(
              `La fecha final no puede ser posterior al fin del horario (${schedEnd.toISOString().split("T")[0]})`
            );
          }
        }
      }
    }

    const novelty = await prisma.scheduleNovelty.create({
      data: {
        groupId: input.isGeneral ? null : input.groupId,
        isGeneral: !!input.isGeneral,
        type: input.type,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        startDate: start,
        endDate: end,
        courseId: input.courseId || null,
        newEnvironmentId: input.newEnvironmentId || null,
      },
      include: {
        group: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
        newEnvironment: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/dashboard/gestor/schedules");
    revalidatePath("/dashboard/admin/schedules");
    revalidatePath("/dashboard/teacher/schedules");

    return { success: true, data: novelty };
  } catch (error: any) {
    console.error("Error al crear novedad de horario:", error);
    return { success: false, error: error.message || "Error al crear novedad" };
  }
}

export async function getScheduleNoveltiesAction(groupId?: string) {
  try {
    const whereClause: any = {};
    if (groupId && groupId !== "ALL") {
      whereClause.OR = [
        { groupId: groupId },
        { isGeneral: true }
      ];
    }

    const list = await prisma.scheduleNovelty.findMany({
      where: whereClause,
      include: {
        group: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
        newEnvironment: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: list };
  } catch (error: any) {
    console.error("Error al consultar novedades de horario:", error);
    return { success: false, error: error.message || "Error al cargar novedades", data: [] };
  }
}

export async function getScheduleNoveltiesDataAction(scheduleId: string) {
  try {
    const schedule = await prisma.academicSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        groupSlots: {
          include: {
            group: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!schedule) return null;

    const groupIds = schedule.groupSlots.map((s) => s.groupId);

    const novelties = await prisma.scheduleNovelty.findMany({
      where: {
        OR: [
          { groupId: { in: groupIds } },
          { isGeneral: true }
        ]
      },
      include: {
        group: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
        newEnvironment: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const environments = await prisma.trainingEnvironment.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // Unique groups
    const groupsMap = new Map<string, { id: string; name: string }>();
    schedule.groupSlots.forEach((s) => {
      if (s.group) {
        groupsMap.set(s.group.id, { id: s.group.id, name: s.group.name });
      }
    });

    return {
      schedule: {
        id: schedule.id,
        name: schedule.name,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        isActive: schedule.isActive,
      },
      groups: Array.from(groupsMap.values()),
      environments,
      novelties,
    };
  } catch (error) {
    console.error("Error al obtener datos de novedades del horario:", error);
    return null;
  }
}

export async function deleteScheduleNoveltyAction(noveltyId: string) {
  try {
    if (!noveltyId) throw new Error("ID de novedad no especificado");

    await prisma.scheduleNovelty.delete({
      where: { id: noveltyId },
    });

    revalidatePath("/dashboard/gestor/schedules");
    revalidatePath("/dashboard/admin/schedules");
    revalidatePath("/dashboard/teacher/schedules");

    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar novedad de horario:", error);
    return { success: false, error: error.message || "Error al eliminar novedad" };
  }
}

