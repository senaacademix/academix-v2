"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { SaveScheduleEventPayload, ScheduleEventItem } from "../types";

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

export interface ScheduleEventsPageData {
  schedule: {
    id: string;
    name: string;
    description: string | null;
    startDate: string; // ISO
    endDate: string;   // ISO
    isActive: boolean;
    isPublished: boolean;
  };
  events: ScheduleEventItem[];
}

/**
 * Obtener horario y sus eventos registrados
 */
export async function getScheduleEventsDataAction(scheduleId: string): Promise<ScheduleEventsPageData | null> {
  try {
    await requireAdmin();

    const schedule = await prisma.academicSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        events: {
          orderBy: [
            { date: "asc" },
            { startTime: "asc" }
          ]
        }
      }
    });

    if (!schedule) return null;

    return {
      schedule: {
        id: schedule.id,
        name: schedule.name,
        description: schedule.description,
        startDate: schedule.startDate.toISOString(),
        endDate: schedule.endDate.toISOString(),
        isActive: schedule.isActive,
        isPublished: schedule.isPublished,
      },
      events: schedule.events.map((e) => ({
        id: e.id,
        academicScheduleId: e.academicScheduleId,
        title: e.title,
        description: e.description,
        date: e.date.toISOString().split("T")[0],
        startTime: e.startTime,
        endTime: e.endTime,
        targetAudience: (e.targetAudience as any) || "PUBLIC",
        location: e.location,
        linkUrl: e.linkUrl,
        color: e.color,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
    };
  } catch (error: any) {
    console.error("Error in getScheduleEventsDataAction:", error);
    throw new Error(error.message || "Error al cargar los eventos del horario");
  }
}

/**
 * Crear un nuevo evento de horario
 */
export async function createScheduleEventAction(
  payload: SaveScheduleEventPayload
): Promise<{ success: boolean; data?: ScheduleEventItem; error?: string }> {
  try {
    await requireAdmin();

    const schedule = await prisma.academicSchedule.findUnique({
      where: { id: payload.academicScheduleId },
    });

    if (!schedule) {
      return { success: false, error: "El horario especificado no existe." };
    }

    if (!payload.title || !payload.title.trim()) {
      return { success: false, error: "El título del evento es obligatorio." };
    }

    if (!payload.date) {
      return { success: false, error: "La fecha del evento es obligatoria." };
    }

    if (!payload.startTime || !payload.endTime) {
      return { success: false, error: "Las horas de inicio y fin son obligatorias." };
    }

    if (payload.startTime >= payload.endTime) {
      return { success: false, error: "La hora de inicio debe ser anterior a la hora de fin." };
    }

    const [year, month, day] = payload.date.split("-").map(Number);
    const eventDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    const scheduleStart = new Date(schedule.startDate);
    scheduleStart.setUTCHours(0, 0, 0, 0);

    const scheduleEnd = new Date(schedule.endDate);
    scheduleEnd.setUTCHours(23, 59, 59, 999);

    if (eventDate < scheduleStart || eventDate > scheduleEnd) {
      const startFormatted = scheduleStart.toISOString().split("T")[0];
      const endFormatted = scheduleEnd.toISOString().split("T")[0];
      return {
        success: false,
        error: `La fecha seleccionada (${payload.date}) está fuera del periodo de vigencia del horario (${startFormatted} a ${endFormatted}).`,
      };
    }

    const created = await prisma.scheduleEvent.create({
      data: {
        academicScheduleId: payload.academicScheduleId,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        date: eventDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        targetAudience: payload.targetAudience || "PUBLIC",
        location: payload.location?.trim() || null,
        linkUrl: payload.linkUrl?.trim() || null,
        color: payload.color || "blue",
      },
    });

    revalidatePath("/dashboard/admin/schedules");
    revalidatePath(`/dashboard/admin/schedules/${payload.academicScheduleId}/events`);

    return {
      success: true,
      data: {
        id: created.id,
        academicScheduleId: created.academicScheduleId,
        title: created.title,
        description: created.description,
        date: created.date.toISOString().split("T")[0],
        startTime: created.startTime,
        endTime: created.endTime,
        targetAudience: created.targetAudience as any,
        location: created.location,
        linkUrl: created.linkUrl,
        color: created.color,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("Error creating schedule event:", error);
    return { success: false, error: error.message || "Error al crear el evento" };
  }
}

/**
 * Actualizar un evento de horario existente
 */
export async function updateScheduleEventAction(
  payload: SaveScheduleEventPayload
): Promise<{ success: boolean; data?: ScheduleEventItem; error?: string }> {
  try {
    await requireAdmin();

    if (!payload.id) {
      return { success: false, error: "ID de evento no proporcionado." };
    }

    const existing = await prisma.scheduleEvent.findUnique({
      where: { id: payload.id },
      include: { academicSchedule: true },
    });

    if (!existing) {
      return { success: false, error: "El evento no existe." };
    }

    if (!payload.title || !payload.title.trim()) {
      return { success: false, error: "El título del evento es obligatorio." };
    }

    if (!payload.startTime || !payload.endTime) {
      return { success: false, error: "Las horas de inicio y fin son obligatorias." };
    }

    if (payload.startTime >= payload.endTime) {
      return { success: false, error: "La hora de inicio debe ser anterior a la hora de fin." };
    }

    const schedule = existing.academicSchedule;
    const [year, month, day] = payload.date.split("-").map(Number);
    const eventDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    const scheduleStart = new Date(schedule.startDate);
    scheduleStart.setUTCHours(0, 0, 0, 0);

    const scheduleEnd = new Date(schedule.endDate);
    scheduleEnd.setUTCHours(23, 59, 59, 999);

    if (eventDate < scheduleStart || eventDate > scheduleEnd) {
      const startFormatted = scheduleStart.toISOString().split("T")[0];
      const endFormatted = scheduleEnd.toISOString().split("T")[0];
      return {
        success: false,
        error: `La fecha seleccionada (${payload.date}) está fuera del periodo de vigencia del horario (${startFormatted} a ${endFormatted}).`,
      };
    }

    const updated = await prisma.scheduleEvent.update({
      where: { id: payload.id },
      data: {
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        date: eventDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        targetAudience: payload.targetAudience || "PUBLIC",
        location: payload.location?.trim() || null,
        linkUrl: payload.linkUrl?.trim() || null,
        color: payload.color || "blue",
      },
    });

    revalidatePath("/dashboard/admin/schedules");
    revalidatePath(`/dashboard/admin/schedules/${payload.academicScheduleId}/events`);

    return {
      success: true,
      data: {
        id: updated.id,
        academicScheduleId: updated.academicScheduleId,
        title: updated.title,
        description: updated.description,
        date: updated.date.toISOString().split("T")[0],
        startTime: updated.startTime,
        endTime: updated.endTime,
        targetAudience: updated.targetAudience as any,
        location: updated.location,
        linkUrl: updated.linkUrl,
        color: updated.color,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("Error updating schedule event:", error);
    return { success: false, error: error.message || "Error al actualizar el evento" };
  }
}

/**
 * Eliminar un evento de horario
 */
export async function deleteScheduleEventAction(
  eventId: string,
  scheduleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    await prisma.scheduleEvent.delete({
      where: { id: eventId },
    });

    revalidatePath("/dashboard/admin/schedules");
    revalidatePath(`/dashboard/admin/schedules/${scheduleId}/events`);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting schedule event:", error);
    return { success: false, error: error.message || "Error al eliminar el evento" };
  }
}
