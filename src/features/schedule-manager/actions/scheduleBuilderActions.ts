"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { DayOfWeek } from "@/generated/prisma/client";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user.role !== "admin" && session.user.role !== "gestor" && session.user.role !== "observer")) {
    throw new Error("No autorizado. Se requieren permisos de coordinador o gestor.");
  }
  return session;
}

export interface ScheduleBuilderData {
  schedule: {
    id: string;
    name: string;
    description: string | null;
    startDate: string;
    endDate: string;
    isActive: boolean;
    isPublished: boolean;
  };
  groups: Array<{
    id: string;
    name: string;
    categoria: string;
    studentCount: number;
    program: {
      id: string;
      name: string;
    };
    period: {
      id: string;
      name: string;
      description: string | null;
    } | null;
    environment: {
      id: string;
      name: string;
      location: string | null;
    } | null;
    daySlotsConfig: Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
    }>;
    trimesterCourses: Array<{
      id: string;
      title: string;
      description: string | null;
      weeklyHours: number;
      qualifiedTeacherIds: string[];
    }>;
    scheduledClasses: Array<{
      id: string; // courseId
      title: string;
      description: string | null;
      weeklyHours: number;
      teacher: {
        id: string;
        name: string;
        email: string;
      } | null;
      schedules: Array<{
        id: string; // courseScheduleId
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
        teacher: {
          id: string;
          name: string;
          email: string;
        } | null;
      }>;
    }>;
  }>;
  teachers: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    maxHours: number;
    availability: Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
    }>;
    qualifiedCourseTitles: string[];
    scheduledSlots: Array<{
      groupId: string;
      groupName: string;
      courseTitle: string;
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
    }>;
  }>;
  environments: Array<{
    id: string;
    name: string;
    capacity: number;
    location: string | null;
    resources: string[];
  }>;
}

/**
 * Obtener todos los datos necesarios para el constructor de horarios de un período
 */
export async function getScheduleBuilderDataAction(scheduleId: string, programId?: string): Promise<ScheduleBuilderData | null> {
  try {
    const session = await requireAdmin();

    if (!scheduleId) return null;

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

    // 1. Horario Académico
    const academicSchedule = await prisma.academicSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        groupSlots: {
          where: Object.keys(groupSlotsWhere).length > 0 ? groupSlotsWhere : undefined,
          include: {
            period: {
              include: {
                courses: {
                  include: {
                    qualifiedTeachers: { select: { id: true } }
                  },
                  orderBy: { order: "asc" }
                }
              }
            },
            group: {
              include: {
                program: { select: { id: true, name: true } },
                students: { select: { id: true } },
                environment: {
                  select: { id: true, name: true, location: true }
                },
                courses: {
                  where: {
                    academicScheduleId: scheduleId
                  },
                  include: {
                    teacher: { select: { id: true, name: true, email: true } },
                    schedules: {
                      include: {
                        teacher: { select: { id: true, name: true, email: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!academicSchedule) {
      throw new Error("El horario académico no existe");
    }

    const now = new Date();
    const isCurrent = now >= academicSchedule.startDate && now <= academicSchedule.endDate;
    const isPublished = isCurrent ? academicSchedule.isPublished : true;

    // 2. Todos los Profesores y su disponibilidad (estrictamente para este horario)
    const teacherWhere: any = { role: "teacher", banned: { not: true } };
    if (effectiveProgramId) {
      teacherWhere.OR = [
        { programs: { some: { id: effectiveProgramId } } },
        { groupsTaught: { some: { programId: effectiveProgramId } } },
        { coursesTaught: { some: { OR: [
          { group: { programId: effectiveProgramId } },
          { period: { programId: effectiveProgramId } }
        ] } } }
      ];
    } else if (session.user.role === "gestor") {
      teacherWhere.OR = [
        { programs: { some: { gestores: { some: { id: session.user.id } } } } },
        { groupsTaught: { some: { program: { gestores: { some: { id: session.user.id } } } } } },
        { coursesTaught: { some: { OR: [
          { group: { program: { gestores: { some: { id: session.user.id } } } } },
          { period: { program: { gestores: { some: { id: session.user.id } } } } }
        ] } } }
      ];
    }

    const allTeachers = await prisma.user.findMany({
      where: teacherWhere,
      include: {
        availabilities: {
          where: { academicScheduleId: scheduleId }
        },
        teacherScheduleQualifications: {
          where: { academicScheduleId: scheduleId },
          include: { course: { select: { title: true } } }
        },
        qualifiedCourses: {
          select: { title: true }
        },
        coursesTaught: {
          include: {
            group: { select: { id: true, name: true } },
            schedules: {
              include: {
                teacher: { select: { id: true, name: true } }
              }
            }
          }
        },
        scheduledSlotsTaught: {
          include: {
            course: {
              include: {
                group: { select: { id: true, name: true } }
              }
            }
          }
        }
      },
      orderBy: { name: "asc" }
    });

    // 3. Ambientes de Formación
    const environments = await prisma.trainingEnvironment.findMany({
      where: effectiveProgramId
        ? { isActive: true, OR: [{ programId: effectiveProgramId }, { programId: null }] }
        : { isActive: true },
      orderBy: { name: "asc" }
    });

    // Agrupar franjas por grupo dentro de este horario
    const groupMap = new Map<string, any>();

    academicSchedule.groupSlots.forEach((slot) => {
      const g = slot.group;
      if (!groupMap.has(g.id)) {
        groupMap.set(g.id, {
          group: g,
          period: slot.period,
          daySlots: []
        });
      }
      groupMap.get(g.id).daySlots.push({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime
      });
    });

    const groupsData = Array.from(groupMap.values()).map(({ group: g, period, daySlots }) => {
      // Materias/Actividades del trimestre actual asignado al grupo en este horario
      const trimesterCourses = (period?.courses || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        weeklyHours: c.weeklyHours || 0,
        qualifiedTeacherIds: (c.qualifiedTeachers || []).map((t: any) => t.id)
      }));

      // Clases ya programadas para este grupo
      const scheduledClasses = (g.courses || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        weeklyHours: c.weeklyHours || 0,
        teacher: c.teacher ? {
          id: c.teacher.id,
          name: c.teacher.name || "Sin nombre",
          email: c.teacher.email
        } : null,
        schedules: (c.schedules || []).map((s: any) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          teacher: s.teacher ? {
            id: s.teacher.id,
            name: s.teacher.name || "Sin nombre",
            email: s.teacher.email
          } : (c.teacher ? {
            id: c.teacher.id,
            name: c.teacher.name || "Sin nombre",
            email: c.teacher.email
          } : null)
        }))
      }));

      return {
        id: g.id,
        name: g.name,
        categoria: g.categoria || "LECTIVA",
        studentCount: g.students?.length || 25,
        program: {
          id: g.program.id,
          name: g.program.name
        },
        period: period ? {
          id: period.id,
          name: period.name,
          description: period.description
        } : null,
        environment: g.environment ? {
          id: g.environment.id,
          name: g.environment.name,
          location: g.environment.location
        } : null,
        daySlotsConfig: daySlots,
        trimesterCourses,
        scheduledClasses
      };
    });

    const teachersData = allTeachers.map((t) => {
      const scheduledSlotsMap = new Map<string, {
        groupId: string;
        groupName: string;
        courseTitle: string;
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
      }>();

      // 1. Slots where this teacher is explicitly assigned to the slot
      (t.scheduledSlotsTaught || []).forEach((s) => {
        if (s.course?.group) {
          const key = `${s.id}`;
          scheduledSlotsMap.set(key, {
            groupId: s.course.group.id,
            groupName: s.course.group.name,
            courseTitle: s.course.title,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime
          });
        }
      });

      // 2. Slots where teacher is course-level teacher and slot has no different teacher
      (t.coursesTaught || []).forEach((c) => {
        if (c.group && c.schedules) {
          c.schedules.forEach((s) => {
            if (!s.teacher || s.teacher.id === t.id) {
              const key = `${s.id}`;
              if (!scheduledSlotsMap.has(key)) {
                scheduledSlotsMap.set(key, {
                  groupId: c.group!.id,
                  groupName: c.group!.name,
                  courseTitle: c.title,
                  dayOfWeek: s.dayOfWeek,
                  startTime: s.startTime,
                  endTime: s.endTime
                });
              }
            }
          });
        }
      });

      const scheduledSlots = Array.from(scheduledSlotsMap.values());

      const qualifiedCourseTitles: string[] = Array.from(
        new Set(
          (t.teacherScheduleQualifications || []).map((q: any) => q.course?.title).filter(Boolean)
        )
      );

      const activeAvailabilities = t.availabilities || [];

      return {
        id: t.id,
        name: t.name || "Sin nombre",
        email: t.email,
        avatar: t.image || null,
        maxHours: 40,
        availability: activeAvailabilities.map((a) => ({
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime
        })),
        qualifiedCourseTitles,
        scheduledSlots
      };
    });

    return {
      schedule: {
        id: academicSchedule.id,
        name: academicSchedule.name,
        description: academicSchedule.description,
        startDate: academicSchedule.startDate.toISOString(),
        endDate: academicSchedule.endDate.toISOString(),
        isActive: isCurrent,
        isPublished
      },
      groups: groupsData,
      teachers: teachersData,
      environments: environments.map((e) => ({
        id: e.id,
        name: e.name,
        capacity: e.capacity,
        location: e.location,
        resources: e.resources || []
      }))
    };
  } catch (error) {
    console.error("Error al obtener datos del constructor de horarios:", error);
    return null;
  }
}

/**
 * Asignar o actualizar una clase/sesión de materia para un grupo en una franja horaria
 */
export async function assignGroupClassScheduleAction(data: {
  scheduleId: string;
  groupId: string;
  courseTitle: string;
  description?: string;
  periodId?: string;
  teacherId?: string | null;
  environmentId?: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string; // "08:00"
  endTime: string;   // "12:00"
  weeklyHours?: number;
  editingCourseScheduleId?: string;
}) {
  const session = await requireAdmin();

  if (!data.groupId) throw new Error("Grupo no especificado");
  if (!data.courseTitle || !data.courseTitle.trim()) throw new Error("Título de la materia es obligatorio");
  if (!data.startTime || !data.endTime) throw new Error("Horas de inicio y fin son obligatorias");

  const [sh, sm] = data.startTime.split(":").map(Number);
  const [eh, em] = data.endTime.split(":").map(Number);
  if (eh * 60 + em <= sh * 60 + sm) {
    throw new Error("La hora de fin debe ser posterior a la hora de inicio");
  }

  // 0. Validar rango horario de la jornada del grupo en este horario
  const groupDaySlot = await prisma.scheduleGroupSlot.findFirst({
    where: {
      academicScheduleId: data.scheduleId,
      groupId: data.groupId,
      dayOfWeek: data.dayOfWeek,
    },
  });

  if (groupDaySlot) {
    if (data.startTime < groupDaySlot.startTime || data.endTime > groupDaySlot.endTime) {
      throw new Error(
        `El horario (${data.startTime} - ${data.endTime}) está fuera de la jornada configurada del grupo para el ${data.dayOfWeek} (${groupDaySlot.startTime} - ${groupDaySlot.endTime})`
      );
    }
  }

  // 1. Validar si el profesor tiene colisión en otro grupo a esa misma hora y día
  const resolvedTeacherId = data.teacherId && data.teacherId !== "NONE" ? data.teacherId : null;

  if (resolvedTeacherId) {
    const teacherCollision = await prisma.courseSchedule.findFirst({
      where: {
        id: data.editingCourseScheduleId ? { not: data.editingCourseScheduleId } : undefined,
        dayOfWeek: data.dayOfWeek,
        OR: [
          { teacherId: resolvedTeacherId },
          { AND: [{ teacherId: null }, { course: { teacherId: resolvedTeacherId } }] }
        ],
        course: {
          groupId: { not: data.groupId }
        },
        AND: [
          {
            OR: [
              {
                AND: [
                  { startTime: { lte: data.startTime } },
                  { endTime: { gt: data.startTime } }
                ]
              },
              {
                AND: [
                  { startTime: { lt: data.endTime } },
                  { endTime: { gte: data.endTime } }
                ]
              },
              {
                AND: [
                  { startTime: { gte: data.startTime } },
                  { endTime: { lte: data.endTime } }
                ]
              }
            ]
          }
        ]
      },
      include: {
        course: {
          include: {
            group: { select: { name: true } },
            teacher: { select: { name: true } }
          }
        },
        teacher: { select: { name: true } }
      }
    });

    if (teacherCollision) {
      const collisionTeacherName = teacherCollision.teacher?.name || teacherCollision.course.teacher?.name || "seleccionado";
      throw new Error(
        `Colisión de docente: El profesor ${collisionTeacherName} ya tiene clase asignada con la ficha ${teacherCollision.course.group?.name || ""} el ${data.dayOfWeek} de ${teacherCollision.startTime} a ${teacherCollision.endTime}`
      );
    }
  }

  // 2. Si se asignó un ambiente, actualizar el ambiente del grupo si corresponde
  if (data.environmentId && data.environmentId !== "NONE") {
    await prisma.group.update({
      where: { id: data.groupId },
      data: { environmentId: data.environmentId }
    });
  }

  // 3. Buscar o crear el curso asignado al grupo en este horario específico
  let groupCourse = await prisma.course.findFirst({
    where: {
      groupId: data.groupId,
      academicScheduleId: data.scheduleId,
      title: { equals: data.courseTitle.trim(), mode: "insensitive" }
    }
  });

  if (!groupCourse) {
    groupCourse = await prisma.course.create({
      data: {
        title: data.courseTitle.trim(),
        description: data.description ? data.description.trim() : null,
        groupId: data.groupId,
        academicScheduleId: data.scheduleId,
        periodId: data.periodId || null,
        teacherId: resolvedTeacherId,
        weeklyHours: data.weeklyHours || 0
      }
    });
  } else {
    // Si el curso no tiene profesor asignado por defecto y este slot tiene uno, guardarlo como fallback
    if (!groupCourse.teacherId && resolvedTeacherId) {
      await prisma.course.update({
        where: { id: groupCourse.id },
        data: { teacherId: resolvedTeacherId }
      });
    }
  }

  // 4. Crear o Actualizar franja de horario en CourseSchedule para el grupo
  let resultSlotId: string;
  if (data.editingCourseScheduleId) {
    const updatedSlot = await prisma.courseSchedule.update({
      where: { id: data.editingCourseScheduleId },
      data: {
        courseId: groupCourse.id,
        teacherId: resolvedTeacherId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime
      }
    });
    resultSlotId = updatedSlot.id;
  } else {
    const newScheduleSlot = await prisma.courseSchedule.create({
      data: {
        courseId: groupCourse.id,
        teacherId: resolvedTeacherId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime
      }
    });
    resultSlotId = newScheduleSlot.id;
  }

  // Log de auditoría
  const { auditLogger } = await import("@/features/admin/services/auditLogger");
  await auditLogger.log({
    action: data.editingCourseScheduleId ? "UPDATE" : "CREATE",
    entity: "SCHEDULE",
    entityId: resultSlotId,
    userId: session.user.id,
    userName: session.user.name || "Admin",
    userRole: "admin",
    description: `${data.editingCourseScheduleId ? "Actualización" : "Asignación"} de clase "${data.courseTitle}" al grupo ID ${data.groupId} (${data.dayOfWeek} ${data.startTime}-${data.endTime})`,
    metadata: { courseScheduleId: resultSlotId, groupId: data.groupId, title: data.courseTitle },
    success: true
  });

  revalidatePath(`/dashboard/admin/schedules/${data.scheduleId}`);
  revalidatePath("/dashboard/admin/schedules");
  return { success: true, courseScheduleId: resultSlotId, courseId: groupCourse.id };
}

/**
 * Eliminar una franja de clase de un grupo
 */
export async function deleteGroupClassScheduleAction(scheduleId: string, courseScheduleId: string) {
  const session = await requireAdmin();

  if (!courseScheduleId) throw new Error("ID de franja de clase no especificado");

  const slot = await prisma.courseSchedule.findUnique({
    where: { id: courseScheduleId },
    include: {
      course: { select: { id: true, title: true, groupId: true } }
    }
  });

  if (!slot) throw new Error("La franja de clase no existe");

  await prisma.courseSchedule.delete({
    where: { id: courseScheduleId }
  });

  // Si el curso ya no tiene más franjas, opcionalmente verificar si se conserva o elimina
  const remainingSlots = await prisma.courseSchedule.count({
    where: { courseId: slot.courseId }
  });

  if (remainingSlots === 0) {
    await prisma.course.delete({
      where: { id: slot.courseId }
    });
  }

  const { auditLogger } = await import("@/features/admin/services/auditLogger");
  await auditLogger.log({
    action: "DELETE",
    entity: "SCHEDULE",
    entityId: courseScheduleId,
    userId: session.user.id,
    userName: session.user.name || "Admin",
    userRole: "admin",
    description: `Eliminación de franja de clase "${slot.course.title}" de grupo ${slot.course.groupId}`,
    metadata: { courseScheduleId },
    success: true
  });

  if (scheduleId) {
    revalidatePath(`/dashboard/admin/schedules/${scheduleId}`);
  }
  revalidatePath("/dashboard/admin/schedules");
  return { success: true };
}
