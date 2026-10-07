"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { auditLogger } from "@/features/admin/services/auditLogger";

async function getSession() {
  return await auth.api.getSession({ headers: await headers() });
}

export interface StudentGroupHistoryItem {
  id: string;
  groupId: string;
  groupName: string;
  programName: string;
  status: "ACTIVE" | "TRANSFERRED" | "COMPLETED" | "WITHDRAWN";
  isCurrent: boolean;
  joinedAt: string;
  leftAt?: string | null;
  notes?: string | null;
  averageGrade?: number;
  attendanceRate?: number;
  remarksCount?: number;
  improvementPlansCount?: number;
  timelineName?: string | null;
  periodName?: string | null;
}

export async function getStudentGroupHistoryAction(studentId?: string) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "No autorizado" };
  }

  const targetId = studentId && studentId !== "me" ? studentId : session.user.id;
  const requester = session.user;
  const isSelf = requester.id === targetId;
  const isStaff = ["admin", "gestor", "coordinador", "manager", "teacher", "observer"].includes(requester.role || "");

  if (!isSelf && !isStaff) {
    return { success: false, error: "No tienes permisos para ver este historial" };
  }

  try {
    // Check student existence
    const student = await prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        name: true,
        email: true,
        groupId: true,
        createdAt: true,
        profile: { select: { nombres: true, apellido: true, identificacion: true } },
        group: { select: { id: true, name: true, program: { select: { name: true } } } },
      },
    });

    if (!student) {
      return { success: false, error: "Estudiante no encontrado" };
    }

    // 1. Fetch existing GroupEnrollment records
    let enrollments = await prisma.groupEnrollment.findMany({
      where: { studentId: targetId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            program: {
              select: {
                name: true,
                timelines: { select: { id: true, name: true, isDefault: true } },
              },
            },
            scheduleSlots: {
              include: {
                period: {
                  include: {
                    timeline: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ isCurrent: "desc" }, { joinedAt: "desc" }],
    });

    // Backfill missing GroupEnrollments only if the current active group isn't enrolled
    const hasCurrentEnrollment = student.groupId
      ? enrollments.some((e) => e.groupId === student.groupId && e.isCurrent)
      : enrollments.length > 0;

    if (!hasCurrentEnrollment) {
      const discoveredGroupIds = new Set<string>();
      if (student.groupId) discoveredGroupIds.add(student.groupId);
      enrollments.forEach((e) => discoveredGroupIds.add(e.groupId));

      const [attGroups, grGroups, remGroups] = await Promise.all([
        prisma.attendance.findMany({
          where: { userId: targetId },
          select: { course: { select: { groupId: true } } },
        }),
        prisma.studentGrade.findMany({
          where: { userId: targetId },
          select: { activity: { select: { course: { select: { groupId: true } } } } },
        }),
        prisma.remark.findMany({
          where: { userId: targetId },
          select: { course: { select: { groupId: true } } },
        }),
      ]);

      attGroups.forEach((a) => { if (a.course?.groupId) discoveredGroupIds.add(a.course.groupId); });
      grGroups.forEach((g) => { if (g.activity?.course?.groupId) discoveredGroupIds.add(g.activity.course.groupId); });
      remGroups.forEach((r) => { if (r.course?.groupId) discoveredGroupIds.add(r.course.groupId); });

      const existingGroupIds = new Set(enrollments.map((e) => e.groupId));
      for (const gId of Array.from(discoveredGroupIds)) {
        if (!existingGroupIds.has(gId)) {
          const isCurrentGroup = student.groupId === gId;
          await prisma.groupEnrollment.create({
            data: {
              studentId: targetId,
              groupId: gId,
              status: isCurrentGroup ? "ACTIVE" : "TRANSFERRED",
              isCurrent: isCurrentGroup,
              joinedAt: student.createdAt || new Date(),
              leftAt: isCurrentGroup ? null : new Date(),
              notes: isCurrentGroup ? "Ficha activa de formación" : "Ficha registrada previamente en el historial académico",
            },
          });
        }
      }

      if (student.groupId) {
        await prisma.groupEnrollment.updateMany({
          where: { studentId: targetId, groupId: { not: student.groupId } },
          data: { isCurrent: false },
        });
        await prisma.groupEnrollment.updateMany({
          where: { studentId: targetId, groupId: student.groupId },
          data: { isCurrent: true, status: "ACTIVE", leftAt: null },
        });
      }

      // Re-fetch enrollments after backfill
      enrollments = await prisma.groupEnrollment.findMany({
        where: { studentId: targetId },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              program: {
                select: {
                  name: true,
                  timelines: { select: { id: true, name: true, isDefault: true } },
                },
              },
              scheduleSlots: {
                include: {
                  period: {
                    include: {
                      timeline: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ isCurrent: "desc" }, { joinedAt: "desc" }],
      });
    }

    // Compute metrics in bulk (avoid N+1 queries per group)
    const [allGrades, allAttendances, allRemarks, improvementPlansCount] = await Promise.all([
      prisma.studentGrade.findMany({
        where: { userId: targetId },
        select: {
          score: true,
          activity: { select: { course: { select: { groupId: true } } } },
        },
      }),
      prisma.attendance.findMany({
        where: { userId: targetId },
        select: {
          status: true,
          course: { select: { groupId: true } },
        },
      }),
      prisma.remark.findMany({
        where: { userId: targetId },
        select: {
          course: { select: { groupId: true } },
        },
      }),
      prisma.improvementPlan.count({
        where: { studentId: targetId },
      }),
    ]);

    // Group metrics in memory by groupId
    const gradesByGroup = new Map<string, number[]>();
    allGrades.forEach((g) => {
      const gId = g.activity?.course?.groupId;
      if (gId && g.score !== null && g.score > 0) {
        const list = gradesByGroup.get(gId) || [];
        list.push(g.score);
        gradesByGroup.set(gId, list);
      }
    });

    const attendancesByGroup = new Map<string, { total: number; present: number }>();
    allAttendances.forEach((a) => {
      const gId = a.course?.groupId;
      if (gId) {
        const stats = attendancesByGroup.get(gId) || { total: 0, present: 0 };
        stats.total++;
        if (a.status === "PRESENT" || a.status === "LATE") {
          stats.present++;
        }
        attendancesByGroup.set(gId, stats);
      }
    });

    const remarksByGroup = new Map<string, number>();
    allRemarks.forEach((r) => {
      const gId = r.course?.groupId;
      if (gId) {
        remarksByGroup.set(gId, (remarksByGroup.get(gId) || 0) + 1);
      }
    });

    // Enriched history items with statistics per group
    const historyItems: StudentGroupHistoryItem[] = enrollments.map((en: any) => {
      const validScores = gradesByGroup.get(en.groupId) || [];
      const avgGrade =
        validScores.length > 0
          ? validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length
          : 0;

      const attStats = attendancesByGroup.get(en.groupId) || { total: 0, present: 0 };
      const attRate = attStats.total > 0 ? (attStats.present / attStats.total) * 100 : 100;

      const remarksCount = remarksByGroup.get(en.groupId) || 0;

      const slot = en.group?.scheduleSlots?.find((s: any) => s.period?.timeline?.name);
      const timelineName =
        slot?.period?.timeline?.name ||
        en.group?.scheduleSlots?.find((s: any) => s.period)?.period?.timeline?.name ||
        en.group?.program?.timelines?.find((t: any) => t.isDefault)?.name ||
        en.group?.program?.timelines?.[0]?.name ||
        null;

      const periodName =
        slot?.period?.name ||
        en.group?.scheduleSlots?.find((s: any) => s.period)?.period?.name ||
        en.group?.period?.name ||
        null;

        return {
          id: en.id,
          groupId: en.groupId,
          groupName: en.group?.name || "Ficha Desconocida",
          programName: en.group?.program?.name || "Programa General",
          status: en.status,
          isCurrent: en.isCurrent,
          joinedAt: en.joinedAt.toISOString(),
          leftAt: en.leftAt ? en.leftAt.toISOString() : null,
          notes: en.notes,
          averageGrade: avgGrade,
          attendanceRate: attRate,
          remarksCount,
          improvementPlansCount,
          timelineName,
          periodName,
        };
    });

    const allSystemGroups = await prisma.group.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          identificacion: student.profile?.identificacion || "S/I",
          currentGroup: student.group ? `${student.group.name}` : "Sin Ficha Activa",
        },
        history: historyItems,
        allGroups: allSystemGroups,
      },
    };
  } catch (error: any) {
    console.error("Error fetching student group history:", error);
    return { success: false, error: error.message || "Error al obtener el historial de fichas" };
  }
}

export async function syncUserGroupChange(
  studentId: string,
  oldGroupId: string | null,
  newGroupId: string | null,
  reason?: string
) {
  const now = new Date();

  // 1. If student was in oldGroupId, preserve oldGroupId as TRANSFERRED
  if (oldGroupId && oldGroupId !== newGroupId) {
    const oldEnrollment = await prisma.groupEnrollment.findFirst({
      where: { studentId, groupId: oldGroupId },
    });

    if (!oldEnrollment) {
      await prisma.groupEnrollment.create({
        data: {
          studentId,
          groupId: oldGroupId,
          status: "TRANSFERRED",
          isCurrent: false,
          joinedAt: now,
          leftAt: now,
          notes: reason || "Ficha histórica preservada en el traslado",
        },
      });
    } else {
      await prisma.groupEnrollment.update({
        where: { id: oldEnrollment.id },
        data: {
          isCurrent: false,
          status: "TRANSFERRED",
          leftAt: oldEnrollment.leftAt || now,
          notes: reason || oldEnrollment.notes || "Ficha histórica preservada en el traslado",
        },
      });
    }
  }

  const targetGroupId = newGroupId && newGroupId !== "none" ? newGroupId : null;

  // Deactivate current status on all other enrollments
  await prisma.groupEnrollment.updateMany({
    where: { studentId, groupId: targetGroupId ? { not: targetGroupId } : undefined },
    data: { isCurrent: false },
  });

  // 2. Activate or create newGroupId enrollment as current active
  if (targetGroupId) {
    const newEnrollment = await prisma.groupEnrollment.findFirst({
      where: { studentId, groupId: targetGroupId },
    });

    if (!newEnrollment) {
      await prisma.groupEnrollment.create({
        data: {
          studentId,
          groupId: targetGroupId,
          status: "ACTIVE",
          isCurrent: true,
          joinedAt: now,
          leftAt: null,
          notes: reason || "Ficha activa de formación",
        },
      });
    } else {
      await prisma.groupEnrollment.update({
        where: { id: newEnrollment.id },
        data: {
          status: "ACTIVE",
          isCurrent: true,
          leftAt: null,
        },
      });
    }
  }

  // Update User.groupId
  await prisma.user.update({
    where: { id: studentId },
    data: { groupId: targetGroupId },
  });
}

export async function transferStudentGroupAction(data: {
  studentId: string;
  newGroupId: string | null;
  reason?: string;
}) {
  const session = await getSession();
  if (!session?.user || !["admin", "gestor", "coordinador", "manager"].includes(session.user.role || "")) {
    return { success: false, error: "No tienes permisos administrativos para trasladar estudiantes" };
  }

  const { studentId, newGroupId, reason } = data;

  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true, groupId: true, createdAt: true },
    });

    if (!student) {
      return { success: false, error: "Estudiante no encontrado" };
    }

    await syncUserGroupChange(studentId, student.groupId, newGroupId, reason);

    const targetGroupObj = newGroupId && newGroupId !== "none"
      ? await prisma.group.findUnique({ where: { id: newGroupId }, select: { name: true } })
      : null;

    // Log action
    await auditLogger.log({
      userId: session.user.id,
      userEmail: session.user.email || "",
      userName: session.user.name || "",
      userRole: session.user.role || "",
      action: "UPDATE",
      entity: "GroupEnrollment",
      entityId: studentId,
      details: targetGroupObj
        ? `Estudiante "${student.name}" trasladado a la ficha: "${targetGroupObj.name}". Motivo: ${reason || 'Sin motivo especificado'}`
        : `Estudiante "${student.name}" desvinculado de su ficha actual.`,
    });

    return { success: true, message: "Traslado registrado exitosamente" };
  } catch (error: any) {
    console.error("Error executing student group transfer:", error);
    return { success: false, error: error.message || "Error al procesar el traslado de ficha" };
  }
}

export async function addHistoricalGroupAction(data: {
  studentId: string;
  groupId: string;
  notes?: string;
}) {
  const session = await getSession();
  if (!session?.user || !["admin", "gestor", "coordinador", "manager"].includes(session.user.role || "")) {
    return { success: false, error: "No tienes permisos para registrar fichas históricas" };
  }

  const { studentId, groupId, notes } = data;
  if (!groupId || groupId === "none") {
    return { success: false, error: "Ficha no válida" };
  }

  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true, groupId: true },
    });

    if (!student) {
      return { success: false, error: "Estudiante no encontrado" };
    }

    const isCurrentGroup = student.groupId === groupId;

    const existing = await prisma.groupEnrollment.findFirst({
      where: { studentId, groupId },
    });

    if (existing) {
      await prisma.groupEnrollment.update({
        where: { id: existing.id },
        data: {
          status: isCurrentGroup ? "ACTIVE" : "TRANSFERRED",
          isCurrent: isCurrentGroup,
          notes: notes || existing.notes || "Ficha histórica vinculada manualmente",
        },
      });
    } else {
      await prisma.groupEnrollment.create({
        data: {
          studentId,
          groupId,
          status: isCurrentGroup ? "ACTIVE" : "TRANSFERRED",
          isCurrent: isCurrentGroup,
          joinedAt: new Date(),
          leftAt: isCurrentGroup ? null : new Date(),
          notes: notes || "Ficha histórica agregada al expediente",
        },
      });
    }

    return { success: true, message: "Ficha histórica agregada correctamente" };
  } catch (error: any) {
    console.error("Error adding historical group:", error);
    return { success: false, error: error.message || "Error al registrar la ficha histórica" };
  }
}
