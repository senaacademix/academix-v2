"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DayOfWeek } from "@/generated/prisma/client";
import { formatName } from "@/lib/utils";

export interface DashboardMetricData {
  stat1: { title: string; value: string; description: string; change?: string; isPositive?: boolean };
  stat2: { title: string; value: string; description: string; change?: string; isPositive?: boolean };
  stat3: { title: string; value: string; description: string; change?: string; isPositive?: boolean };
  stat4: { title: string; value: string; description: string; change?: string; isPositive?: boolean };
  events: {
    id: string;
    title: string;
    time: string;
    tag?: string;
  }[];
  progress: {
    title: string;
    subtitle: string;
    progressPercentage: number;
    completedTasks: number;
    totalTasks: number;
  };
}

const DAY_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

export async function getDashboardMetricsAction(): Promise<DashboardMetricData> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return {
      stat1: { title: "Asistencia General", value: "—", description: "Inicia sesión para ver tu información" },
      stat2: { title: "Ficha / Grupo", value: "—", description: "Sin asignación" },
      stat3: { title: "Rendimiento Promedio", value: "—", description: "Sin registros" },
      stat4: { title: "Actividades Pendientes", value: "—", description: "Sin pendientes" },
      events: [],
      progress: {
        title: "Progreso Académico",
        subtitle: "Período Actual",
        progressPercentage: 0,
        completedTasks: 0,
        totalTasks: 0,
      },
    };
  }

  const userId = session.user.id;
  const role = session.user.role;
  const now = new Date();
  const currentDayOfWeek = DAY_MAP[now.getDay()] || DayOfWeek.MONDAY;

  if (role === "student") {
    // 1. Fetch user with direct group, group enrollments, and course enrollments
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        groupId: true,
        group: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            program: { select: { startDate: true, endDate: true } },
            courses: {
              include: {
                teacher: { select: { name: true, profile: { select: { nombres: true, apellido: true } } } },
                schedules: { orderBy: { startTime: "asc" } },
                activities: {
                  orderBy: { createdAt: "asc" },
                  include: {
                    grades: { where: { userId } },
                  },
                },
              },
            },
          },
        },
        groupEnrollments: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                courses: {
                  include: {
                    teacher: { select: { name: true, profile: { select: { nombres: true, apellido: true } } } },
                    schedules: { orderBy: { startTime: "asc" } },
                    activities: {
                      orderBy: { createdAt: "asc" },
                      include: {
                        grades: { where: { userId } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        enrollments: {
          where: { status: "APPROVED" },
          include: {
            course: {
              include: {
                teacher: { select: { name: true, profile: { select: { nombres: true, apellido: true } } } },
                schedules: { orderBy: { startTime: "asc" } },
                activities: {
                  orderBy: { createdAt: "asc" },
                  include: {
                    grades: { where: { userId } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // 2. Fetch all student attendance records
    const attendances = await prisma.attendance.findMany({
      where: { userId },
    });

    const totalAtt = attendances.length;
    const presentAtt = attendances.filter((a) => a.status === "PRESENT").length;
    const absentAtt = attendances.filter((a) => a.status === "ABSENT").length;

    const attPercentage = totalAtt > 0 ? ((presentAtt / totalAtt) * 100).toFixed(1) : "100.0";
    const attDescription =
      totalAtt > 0
        ? `${presentAtt} de ${totalAtt} asistencias registradas${absentAtt > 0 ? ` (${absentAtt} faltas)` : ""}`
        : "1 de 1 asistencias registradas";

    // 3. Collect and deduplicate all courses across group, groupEnrollments, and enrollments
    const directGroupCourses = user?.group?.courses || [];
    const geGroupCourses = (user?.groupEnrollments || []).flatMap((ge) => ge.group?.courses || []);
    const directCourses = (user?.enrollments || []).map((e) => e.course).filter(Boolean);

    const allCoursesMap = new Map<string, any>();
    [...directGroupCourses, ...geGroupCourses, ...directCourses].forEach((c) => {
      if (c && !allCoursesMap.has(c.id)) {
        allCoursesMap.set(c.id, c);
      }
    });
    const uniqueCourses = Array.from(allCoursesMap.values());
    const courseCount = uniqueCourses.length;

    // 4. Grades and Performance
    const studentGrades = await prisma.studentGrade.findMany({
      where: { userId },
    });

    const validGrades = studentGrades.filter((g) => typeof g.score === "number" && !isNaN(g.score));
    const avgScore =
      validGrades.length > 0
        ? (validGrades.reduce((acc, g) => acc + g.score, 0) / validGrades.length).toFixed(1)
        : null;

    // 5. Activities & Pending tasks
    const allActivities = uniqueCourses.flatMap((c) => c.activities || []);
    const gradedActivityIds = new Set(validGrades.map((g) => g.activityId));
    const submittedActivityIds = new Set(
      studentGrades.filter((g) => g.submissionLink && g.submissionLink.trim().length > 0).map((g) => g.activityId)
    );

    const completedActivitiesCount = allActivities.filter(
      (a) => gradedActivityIds.has(a.id) || submittedActivityIds.has(a.id)
    ).length;
    const pendingActivitiesCount = Math.max(0, allActivities.length - completedActivitiesCount);

    // 6. Today's Events / Classes
    const todaySchedules = uniqueCourses.flatMap((c) =>
      (c.schedules || [])
        .filter((s: any) => s.dayOfWeek === currentDayOfWeek)
        .map((s: any) => ({
          id: `${c.id}-${s.id}`,
          title: c.title,
          time: `${s.startTime} - ${s.endTime}`,
          tag: "Hoy",
        }))
    );

    // Primary group name
    const mainGroupName = user?.group?.name || user?.groupEnrollments?.[0]?.group?.name;

    // 7. Academic Progress
    let progressPercentage = 0;
    const startDate = user?.group?.startDate || user?.group?.program?.startDate;
    const endDate = user?.group?.endDate || user?.group?.program?.endDate;

    if (startDate && endDate) {
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      const nowMs = now.getTime();
      if (endMs > startMs) {
        progressPercentage = Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / (endMs - startMs)) * 100)));
      }
    } else if (allActivities.length > 0) {
      progressPercentage = Math.round((completedActivitiesCount / allActivities.length) * 100);
    } else {
      progressPercentage = 50;
    }

    return {
      stat1: {
        title: "Asistencia General",
        value: `${attPercentage}%`,
        description: attDescription,
        isPositive: parseFloat(attPercentage) >= 80,
      },
      stat2: {
        title: "Ficha de Formación",
        value: mainGroupName ? `Ficha ${mainGroupName}` : "Sin Ficha",
        description: `${courseCount} ${courseCount === 1 ? "materia asignada" : "materias asignadas"}`,
        isPositive: !!mainGroupName,
      },
      stat3: {
        title: "Rendimiento Promedio",
        value: avgScore !== null ? `${avgScore} / 5.0` : "Sin Calificaciones",
        description:
          validGrades.length > 0
            ? `Promedio de ${validGrades.length} ${validGrades.length === 1 ? "evaluación" : "evaluaciones"}`
            : "Aún no tienes notas registradas",
        isPositive: avgScore !== null ? parseFloat(avgScore) >= 3.0 : true,
      },
      stat4: {
        title: "Actividades Pendientes",
        value: `${pendingActivitiesCount} ${pendingActivitiesCount === 1 ? "Actividad" : "Actividades"}`,
        description:
          pendingActivitiesCount === 0
            ? "¡Estás al día con todas tus entregas!"
            : `${pendingActivitiesCount} por entregar este período`,
        isPositive: pendingActivitiesCount === 0,
      },
      events: todaySchedules,
      progress: {
        title: "Progreso del Período",
        subtitle: mainGroupName ? `Ficha ${mainGroupName}` : "Período Académico",
        progressPercentage,
        completedTasks: completedActivitiesCount,
        totalTasks: Math.max(allActivities.length, completedActivitiesCount),
      },
    };
  } else if (role === "teacher") {
    // 1. Teacher courses & groups
    const teacherCourses = await prisma.course.findMany({
      where: {
        OR: [
          { teacherId: userId },
          { group: { teachers: { some: { id: userId } } } }
        ]
      },
      include: {
        group: true,
        activities: true,
        schedules: {
          orderBy: { startTime: "asc" },
        },
      },
    });

    const groupsTaught = await prisma.group.findMany({
      where: {
        OR: [{ teachers: { some: { id: userId } } }, { courses: { some: { teacherId: userId } } }],
      },
      include: {
        students: true,
        program: true,
      },
    });

    const totalStudentsSet = new Set<string>();
    groupsTaught.forEach((g) => g.students.forEach((s) => totalStudentsSet.add(s.id)));

    // 2. Attendance records taken by this teacher's courses
    const teacherCourseIds = teacherCourses.map((c) => c.id);
    const teacherAttendances = await prisma.attendance.findMany({
      where: {
        courseId: { in: teacherCourseIds },
      },
    });

    const totalAttCount = teacherAttendances.length;
    const presentAttCount = teacherAttendances.filter((a) => a.status === "PRESENT").length;
    const teacherAttRate = totalAttCount > 0 ? ((presentAttCount / totalAttCount) * 100).toFixed(1) : "100";

    // 3. Activities created
    const totalTeacherActivities = teacherCourses.flatMap((c) => c.activities || []).length;

    // 4. Today's Classes for teacher
    const todaySchedules = teacherCourses.flatMap((c) =>
      (c.schedules || [])
        .filter((s) => s.dayOfWeek === currentDayOfWeek)
        .map((s) => ({
          id: s.id,
          title: `${c.title} ${c.group ? `(${c.group.name})` : ""}`,
          time: `${s.startTime} - ${s.endTime}`,
          tag: "Hoy",
        }))
    );

    // 5. Semester progress
    let avgProgress = 0;
    const groupsWithDates = groupsTaught.filter((g) => g.startDate && g.endDate);
    if (groupsWithDates.length > 0) {
      const sum = groupsWithDates.reduce((acc, g) => {
        const start = new Date(g.startDate!).getTime();
        const end = new Date(g.endDate!).getTime();
        const nowMs = now.getTime();
        const pct = end > start ? Math.min(100, Math.max(0, Math.round(((nowMs - start) / (end - start)) * 100))) : 50;
        return acc + pct;
      }, 0);
      avgProgress = Math.round(sum / groupsWithDates.length);
    } else {
      avgProgress = 65;
    }

    return {
      stat1: {
        title: "Grupos / Fichas",
        value: `${groupsTaught.length} ${groupsTaught.length === 1 ? "Ficha" : "Fichas"}`,
        description: groupsTaught.length > 0 ? groupsTaught.map((g) => g.name).slice(0, 3).join(", ") : "Sin fichas asignadas",
        isPositive: groupsTaught.length > 0,
      },
      stat2: {
        title: "Aprendices a Cargo",
        value: `${totalStudentsSet.size} Aprendices`,
        description: "Estudiantes en tus fichas asignadas",
        isPositive: totalStudentsSet.size > 0,
      },
      stat3: {
        title: "Asistencia de Grupos",
        value: `${teacherAttRate}%`,
        description: totalAttCount > 0 ? `${totalAttCount} registros de asistencia tomados` : "Sin inasistencias registradas",
        isPositive: parseFloat(teacherAttRate) >= 80,
      },
      stat4: {
        title: "Evaluaciones Activas",
        value: `${totalTeacherActivities} ${totalTeacherActivities === 1 ? "Evaluación" : "Evaluaciones"}`,
        description: `${teacherCourses.length} ${teacherCourses.length === 1 ? "materia impartida" : "materias impartidas"}`,
        isPositive: totalTeacherActivities > 0,
      },
      events: todaySchedules,
      progress: {
        title: "Progreso de Formación",
        subtitle: groupsTaught.length > 0 ? `${groupsTaught.length} fichas activas` : "Período Académico",
        progressPercentage: avgProgress,
        completedTasks: groupsTaught.length,
        totalTasks: Math.max(groupsTaught.length, 1),
      },
    };
  } else if (role === "gestor") {
    // Gestor stats scoped to assigned programs
    const [groupsCount, coursesCount, programsCount, studentsCount] = await Promise.all([
      prisma.group.count({ where: { program: { gestores: { some: { id: userId } } } } }),
      prisma.course.count({ where: { OR: [{ group: { program: { gestores: { some: { id: userId } } } } }, { period: { program: { gestores: { some: { id: userId } } } } }] } }),
      prisma.program.count({ where: { gestores: { some: { id: userId } } } }),
      prisma.user.count({ where: { group: { program: { gestores: { some: { id: userId } } } } } }),
    ]);

    return {
      stat1: {
        title: "Aprendices Asignados",
        value: `${studentsCount}`,
        description: "Estudiantes en tus programas",
        isPositive: true,
      },
      stat2: {
        title: "Fichas / Grupos",
        value: `${groupsCount} ${groupsCount === 1 ? "Ficha" : "Fichas"}`,
        description: "Fichas bajo tu gestión",
        isPositive: true,
      },
      stat3: {
        title: "Materias Activas",
        value: `${coursesCount}`,
        description: "Materias en tus programas",
        isPositive: true,
      },
      stat4: {
        title: "Programas Asignados",
        value: `${programsCount}`,
        description: "Programas bajo tu coordinación",
        isPositive: true,
      },
      events: [],
      progress: {
        title: "Gestión Académica",
        subtitle: "Programas Asignados",
        progressPercentage: 100,
        completedTasks: groupsCount,
        totalTasks: Math.max(groupsCount, 1),
      },
    };
  } else {
    // Admin stats
    const [usersCount, groupsCount, coursesCount, programsCount] = await Promise.all([
      prisma.user.count(),
      prisma.group.count(),
      prisma.course.count(),
      prisma.program.count(),
    ]);

    return {
      stat1: {
        title: "Usuarios Registrados",
        value: `${usersCount}`,
        description: "Estudiantes, docentes y directivos",
        isPositive: true,
      },
      stat2: {
        title: "Fichas / Grupos",
        value: `${groupsCount} ${groupsCount === 1 ? "Ficha" : "Fichas"}`,
        description: "Grupos activos en el sistema",
        isPositive: true,
      },
      stat3: {
        title: "Materias Creadas",
        value: `${coursesCount}`,
        description: "Estructura académica general",
        isPositive: true,
      },
      stat4: {
        title: "Programas de Formación",
        value: `${programsCount}`,
        description: "Programas y carreras activas",
        isPositive: true,
      },
      events: [],
      progress: {
        title: "Gestión Institucional",
        subtitle: "Sistema Académico",
        progressPercentage: 100,
        completedTasks: groupsCount,
        totalTasks: Math.max(groupsCount, 1),
      },
    };
  }
}
