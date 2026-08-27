"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { courseService } from "../../teacher/services/courseService";
import prisma from "@/lib/prisma";

async function getSession() {
  return await auth.api.getSession({ headers: await headers() });
}

export async function getScheduleViewAction(requestedScheduleId?: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const role = session.user.role;
  const now = new Date();

  // 1. Obtener todos los horarios académicos registrados
  const academicSchedules: any[] = await prisma.academicSchedule.findMany({
    include: {
      events: true,
      groupSlots: {
        include: {
          group: {
            include: {
              program: { select: { id: true, name: true } },
              period: { select: { id: true, name: true } },
              environment: { select: { id: true, name: true, location: true } },
              courses: {
                include: {
                  teacher: { select: { id: true, name: true, email: true } },
                  schedules: {
                    include: {
                      teacher: { select: { id: true, name: true, email: true } },
                    },
                  },
                  group: { select: { id: true, name: true } },
                  period: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { startDate: "desc" },
  });

  // CASO A: ESTUDIANTE (Solo puede visualizar el horario VIGENTE si está PÚBLICO)
  if (role === "student") {
    // Buscar exclusivamente el horario vigente
    const vigenteSchedule = academicSchedules.find(
      (s) => now >= s.startDate && now <= s.endDate
    );

    // Si no hay horario vigente configurado
    if (!vigenteSchedule) {
      return {
        isDraft: true,
        isPublished: false,
        allSchedules: [],
        currentSchedule: null,
        courses: [] as any[],
        events: [] as any[],
        scheduleTitle: "Sin Horario Vigente",
        scheduleStartDate: null,
        scheduleEndDate: null,
      };
    }

    // Si el horario vigente está en BORRADOR
    if (!vigenteSchedule.isPublished) {
      return {
        isDraft: true,
        isPublished: false,
        allSchedules: [],
        currentSchedule: {
          id: vigenteSchedule.id,
          name: vigenteSchedule.name,
          startDate: vigenteSchedule.startDate,
          endDate: vigenteSchedule.endDate,
          isActive: true,
          isPublished: false,
        },
        courses: [] as any[],
        events: [] as any[],
        scheduleTitle: vigenteSchedule.name,
        scheduleStartDate: vigenteSchedule.startDate,
        scheduleEndDate: vigenteSchedule.endDate,
      };
    }

    // Si está PÚBLICO: Obtener las materias de la ficha/grupo del estudiante
    const studentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { groupId: true },
    });

    const courseMap = new Map<string, any>();
    vigenteSchedule.groupSlots.forEach((slot: any) => {
      if (!studentUser?.groupId || slot.groupId === studentUser.groupId) {
        slot.group.courses.forEach((c: any) => {
          if (!courseMap.has(c.id)) {
            courseMap.set(c.id, {
              id: c.id,
              title: c.title,
              description: c.description,
              weeklyHours: c.weeklyHours || 0,
              teacher: c.teacher,
              group: c.group,
              environment: slot.group.environment,
              period: c.period,
              schedules: (c.schedules || []).map((s: any) => ({
                id: s.id,
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
                teacher: s.teacher || c.teacher,
              })),
            });
          }
        });
      }
    });

    const courses = Array.from(courseMap.values());
    const studentEvents = (vigenteSchedule.events || []).filter(
      (e: any) => e.targetAudience === "PUBLIC" || e.targetAudience === "STUDENTS"
    );

    return {
      isDraft: false,
      isPublished: true,
      allSchedules: [],
      currentSchedule: {
        id: vigenteSchedule.id,
        name: vigenteSchedule.name,
        startDate: vigenteSchedule.startDate,
        endDate: vigenteSchedule.endDate,
        isActive: true,
        isPublished: true,
      },
      courses,
      events: studentEvents,
      scheduleTitle: vigenteSchedule.name,
      scheduleStartDate: vigenteSchedule.startDate,
      scheduleEndDate: vigenteSchedule.endDate,
    };
  }

  // CASO B: DOCENTE / ADMINISTRADOR (Visualiza todos sus horarios con selector, por defecto el vigente)
  const allSchedulesList = academicSchedules.map((s) => {
    const isCurrent = now >= s.startDate && now <= s.endDate;
    const isPublished = isCurrent ? s.isPublished : true;
    return {
      id: s.id,
      name: s.name,
      startDate: s.startDate,
      endDate: s.endDate,
      isActive: isCurrent,
      isPublished: isPublished,
    };
  });

  if (academicSchedules.length > 0) {
    let selectedSchedule: any = null;
    if (requestedScheduleId) {
      selectedSchedule = academicSchedules.find((s) => s.id === requestedScheduleId) || null;
    }
    if (!selectedSchedule) {
      selectedSchedule =
        academicSchedules.find((s) => now >= s.startDate && now <= s.endDate) ||
        academicSchedules[0];
    }

    const isCurrent = now >= selectedSchedule.startDate && now <= selectedSchedule.endDate;
    const isPublished = isCurrent ? selectedSchedule.isPublished : true;

    if (!isPublished) {
      return {
        isDraft: true,
        isPublished: false,
        allSchedules: allSchedulesList,
        currentSchedule: {
          id: selectedSchedule.id,
          name: selectedSchedule.name,
          startDate: selectedSchedule.startDate,
          endDate: selectedSchedule.endDate,
          isActive: isCurrent,
          isPublished: false,
        },
        courses: [] as any[],
        events: [] as any[],
        scheduleTitle: selectedSchedule.name,
        scheduleStartDate: selectedSchedule.startDate,
        scheduleEndDate: selectedSchedule.endDate,
      };
    }

    const courseMap = new Map<string, any>();
    selectedSchedule.groupSlots.forEach((slot: any) => {
      slot.group.courses.forEach((c: any) => {
        // Filtrar franjas horarias estrictamente asignadas a este profesor
        const matchingSchedules = (c.schedules || []).filter((s: any) => {
          if (role !== "teacher") return true;
          const slotTeacherId = s.teacherId || s.teacher?.id || (s.teacherId === null ? (c.teacherId || c.teacher?.id) : null);
          return slotTeacherId === userId;
        });

        if (matchingSchedules.length > 0) {
          const mapKey = `${c.id}-${slot.group.id}`;
          if (!courseMap.has(mapKey)) {
            courseMap.set(mapKey, {
              id: c.id,
              title: c.title,
              description: c.description,
              weeklyHours: c.weeklyHours || 0,
              teacher: c.teacher,
              group: c.group,
              environment: slot.group.environment,
              period: c.period,
              schedules: matchingSchedules.map((s: any) => ({
                id: s.id,
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
                teacher: s.teacher || c.teacher,
              })),
            });
          }
        }
      });
    });

    const courses = Array.from(courseMap.values());
    const teacherEvents = (selectedSchedule.events || []).filter(
      (e: any) => e.targetAudience === "PUBLIC" || (role === "teacher" && e.targetAudience === "TEACHERS")
    );

    return {
      isDraft: false,
      isPublished: true,
      allSchedules: allSchedulesList,
      currentSchedule: {
        id: selectedSchedule.id,
        name: selectedSchedule.name,
        startDate: selectedSchedule.startDate,
        endDate: selectedSchedule.endDate,
        isActive: isCurrent,
        isPublished: true,
      },
      courses,
      events: teacherEvents,
      scheduleTitle: selectedSchedule.name,
      scheduleStartDate: selectedSchedule.startDate,
      scheduleEndDate: selectedSchedule.endDate,
    };
  }

  // Fallback
  let legacyCourses: any[] = [];
  if (role === "teacher") {
    legacyCourses = await courseService.getTeacherCourses(userId);
  } else {
    legacyCourses = await courseService.getStudentCourses(userId);
  }

  return {
    isDraft: false,
    isPublished: true,
    allSchedules: [],
    currentSchedule: null,
    courses: legacyCourses,
    events: [],
    scheduleTitle: "Horario Académico",
    scheduleStartDate: null,
    scheduleEndDate: null,
  };
}
