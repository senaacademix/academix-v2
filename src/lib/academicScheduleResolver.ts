import prisma from "@/lib/prisma";
import { isScheduleCurrent, toCalendarYMD } from "@/lib/dateUtils";

export interface ResolvedCurrentSchedule {
  schedule: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    isPublished: boolean;
  } | null;
  startDate: Date | null;
  endDate: Date | null;
  startDateUTC: Date | null;
  endDateUTC: Date | null;
  startDateISO: string | null;
  endDateISO: string | null;
}

/**
 * Resuelve de forma determinista el horario académico vigente (actual) para un grupo/materia,
 * priorizando las franjas del grupo, horarios del curso, horario del programa y el horario
 * académico global vigente en Colombia.
 */
export async function resolveCurrentAcademicSchedule(options: {
  groupId?: string | null;
  programId?: string | null;
  groupSlots?: Array<{ academicSchedule?: any }> | null;
  courseSchedules?: Array<any> | null;
}): Promise<ResolvedCurrentSchedule> {
  const { groupId, programId, groupSlots, courseSchedules } = options;

  // 1. Horarios de las franjas (slots) del grupo
  const slotSchedules = (groupSlots || [])
    .map((s) => s.academicSchedule)
    .filter(Boolean);

  // 2. Horarios asignados directamente a cursos
  const courseScheds = (courseSchedules || [])
    .map((c) => c?.academicSchedule || c)
    .filter(Boolean);

  const related = [...slotSchedules, ...courseScheds];

  // Prioridad 1: Horario relacionado que esté vigente según calendario colombiano
  let found = related.find((s) => s?.startDate && s?.endDate && isScheduleCurrent(s.startDate, s.endDate))
    || related.find((s) => s?.isActive);

  // 3. Si no se pasó en los slots pero hay groupId, consultar franjas del grupo
  if (!found && groupId) {
    const slots = await prisma.scheduleGroupSlot.findMany({
      where: { groupId },
      include: { academicSchedule: true }
    });
    const dbSlotSchedules = slots.map(s => s.academicSchedule).filter(Boolean);
    found = dbSlotSchedules.find(s => isScheduleCurrent(s.startDate, s.endDate))
      || dbSlotSchedules.find(s => s.isActive);
  }

  // 4. Si aún no se encuentra, buscar en los horarios académicos del programa o globales
  if (!found) {
    const allSchedules = await prisma.academicSchedule.findMany({
      where: programId ? {
        OR: [
          { programId },
          { programId: null }
        ]
      } : {},
      orderBy: { startDate: 'desc' }
    });

    found = allSchedules.find(s => isScheduleCurrent(s.startDate, s.endDate) && s.isPublished)
      || allSchedules.find(s => isScheduleCurrent(s.startDate, s.endDate))
      || allSchedules.find(s => s.isActive && s.isPublished)
      || allSchedules.find(s => s.isActive)
      || allSchedules[0]
      || null;
  }

  let startDate: Date | null = found?.startDate ? new Date(found.startDate) : null;
  let endDate: Date | null = found?.endDate ? new Date(found.endDate) : null;

  // 5. Fallback a configuración del sistema
  if (!startDate || !endDate) {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "settings" },
      select: { scheduleStartDate: true, scheduleEndDate: true }
    });
    if (settings?.scheduleStartDate && settings?.scheduleEndDate) {
      startDate = new Date(settings.scheduleStartDate);
      endDate = new Date(settings.scheduleEndDate);
    }
  }

  if (!startDate || !endDate) {
    return {
      schedule: found || null,
      startDate: null,
      endDate: null,
      startDateUTC: null,
      endDateUTC: null,
      startDateISO: null,
      endDateISO: null,
    };
  }

  const startYMD = toCalendarYMD(startDate);
  const endYMD = toCalendarYMD(endDate);

  const startDateUTC = startYMD ? new Date(`${startYMD}T00:00:00.000Z`) : new Date(startDate);
  const endDateUTC = endYMD ? new Date(`${endYMD}T23:59:59.999Z`) : new Date(endDate);

  return {
    schedule: found || null,
    startDate,
    endDate,
    startDateUTC,
    endDateUTC,
    startDateISO: startDate.toISOString(),
    endDateISO: endDate.toISOString(),
  };
}
