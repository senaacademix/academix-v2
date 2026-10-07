"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { courseService, populateCoursesFallbackDescriptions } from "../../teacher/services/courseService";
import prisma from "@/lib/prisma";
import { isScheduleCurrent } from "@/lib/dateUtils";

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

  // CASO A: ESTUDIANTE (Solo consulta su ficha y el horario vigente)
  if (role === "student") {
    // 1. Obtener exclusivamente la ficha/grupo del estudiante
    const studentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { groupId: true },
    });

    if (!studentUser?.groupId) {
      return {
        isDraft: true,
        isPublished: false,
        allSchedules: [],
        currentSchedule: null,
        courses: [] as any[],
        events: [] as any[],
        scheduleTitle: "Sin Ficha Asignada",
        scheduleStartDate: null,
        scheduleEndDate: null,
      };
    }

    // 2. Obtener lista liviana de horarios (solo metadatos) para identificar el vigente
    const schedulesMeta = await prisma.academicSchedule.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isPublished: true,
      },
      orderBy: { startDate: "desc" },
    });

    const vigenteMeta = schedulesMeta.find((s) => isScheduleCurrent(s.startDate, s.endDate));

    if (!vigenteMeta) {
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

    if (!vigenteMeta.isPublished) {
      return {
        isDraft: true,
        isPublished: false,
        allSchedules: [],
        currentSchedule: {
          id: vigenteMeta.id,
          name: vigenteMeta.name,
          startDate: vigenteMeta.startDate,
          endDate: vigenteMeta.endDate,
          isActive: true,
          isPublished: false,
        },
        courses: [] as any[],
        events: [] as any[],
        scheduleTitle: vigenteMeta.name,
        scheduleStartDate: vigenteMeta.startDate,
        scheduleEndDate: vigenteMeta.endDate,
      };
    }

    // 3. Cargar ÚNICAMENTE los datos del horario vigente correspondientes a la ficha del estudiante
    const vigenteSchedule = await prisma.academicSchedule.findUnique({
      where: { id: vigenteMeta.id },
      include: {
        events: {
          where: {
            OR: [
              { targetAudience: "PUBLIC" },
              { targetAudience: "STUDENTS" },
              { groupId: studentUser.groupId },
            ],
          },
        },
        groupSlots: {
          where: { groupId: studentUser.groupId },
          include: {
            period: {
              include: {
                timeline: true,
              },
            },
            group: {
              include: {
                program: { select: { id: true, name: true } },
                environment: { select: { id: true, name: true, location: true } },
                courses: {
                  where: {
                    OR: [
                      { academicScheduleId: vigenteMeta.id },
                      { academicScheduleId: null },
                    ],
                  },
                  include: {
                    teacher: { select: { id: true, name: true, email: true } },
                    schedules: {
                      include: {
                        teacher: { select: { id: true, name: true, email: true } },
                      },
                    },
                    group: { select: { id: true, name: true } },
                    period: {
                      include: {
                        timeline: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

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

    const courseMap = new Map<string, any>();
    vigenteSchedule.groupSlots.forEach((slot: any) => {
      slot.group.courses.forEach((c: any) => {
        if (c.academicScheduleId && c.academicScheduleId !== vigenteSchedule.id) return;
        if (!courseMap.has(c.id)) {
          courseMap.set(c.id, {
            id: c.id,
            title: c.title,
            description: c.description,
            weeklyHours: c.weeklyHours || 0,
            teacher: c.teacher,
            group: c.group,
            environment: slot.group.environment,
            period: slot.period || c.period,
            periodId: slot.periodId || c.periodId,
            periodName: slot.period?.name || c.period?.name || null,
            timelineName: slot.period?.timeline?.name || c.period?.timeline?.name || slot.group.program?.name || null,
            programId: slot.group.program?.id,
            programName: slot.group.program?.name,
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
    });

    const courses = Array.from(courseMap.values());
    await populateCoursesFallbackDescriptions(courses);
    const studentEvents = (vigenteSchedule.events || []).filter(
      (e: any) => e.targetAudience === "PUBLIC" || e.targetAudience === "STUDENTS" || e.groupId === studentUser.groupId
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

  // 1. Obtener todos los horarios académicos registrados (DOCENTE / GESTOR / OBSERVADOR / ADMIN)
  const academicSchedules: any[] = await prisma.academicSchedule.findMany({
    include: {
      events: true,
      groupSlots: {
        include: {
          period: {
            include: {
              timeline: true,
            },
          },
          group: {
            include: {
              program: { select: { id: true, name: true } },
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
                  period: {
                    include: {
                      timeline: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { startDate: "desc" },
  });

  // CASO B: DOCENTE / ADMINISTRADOR (Visualiza todos sus horarios con selector, por defecto el vigente)
  const allSchedulesList = academicSchedules.map((s) => {
    const isCurrent = isScheduleCurrent(s.startDate, s.endDate);
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
        academicSchedules.find((s) => isScheduleCurrent(s.startDate, s.endDate)) ||
        academicSchedules[0];
    }

    const isCurrent = isScheduleCurrent(selectedSchedule.startDate, selectedSchedule.endDate);
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
        if (c.academicScheduleId && c.academicScheduleId !== selectedSchedule.id) return;
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
              period: slot.period || c.period,
              periodId: slot.periodId || c.periodId,
              periodName: slot.period?.name || c.period?.name || null,
              timelineName: slot.period?.timeline?.name || c.period?.timeline?.name || slot.group.program?.name || null,
              programId: slot.group.program?.id,
              programName: slot.group.program?.name,
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
    await populateCoursesFallbackDescriptions(courses);
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
