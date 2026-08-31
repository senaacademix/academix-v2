import prisma from "@/lib/prisma";
import { GestorDashboardStats, GestorActivityItem } from "../types/gestorTypes";

export class GestorService {
    /**
     * Get all dashboard metrics scoped to the programs managed by a specific gestor
     */
    async getDashboardStats(gestorId: string): Promise<GestorDashboardStats> {
        const [
            studentCount,
            teacherCount,
            groupCount,
            courseCount,
            activeCourseCount,
            managedProgramsList
        ] = await Promise.all([
            // Students enrolled in gestor's programs
            prisma.user.count({
                where: {
                    role: "student",
                    group: { program: { gestores: { some: { id: gestorId } } } }
                }
            }),
            // Teachers associated with gestor's programs
            prisma.user.count({
                where: {
                    role: "teacher",
                    OR: [
                        { groupsTaught: { some: { program: { gestores: { some: { id: gestorId } } } } } },
                        { coursesTaught: { some: { OR: [
                            { group: { program: { gestores: { some: { id: gestorId } } } } },
                            { period: { program: { gestores: { some: { id: gestorId } } } } }
                        ] } } },
                        { programs: { some: { gestores: { some: { id: gestorId } } } } }
                    ]
                }
            }),
            // Groups in gestor's programs
            prisma.group.count({
                where: {
                    program: { gestores: { some: { id: gestorId } } }
                }
            }),
            // Courses in gestor's programs
            prisma.course.count({
                where: {
                    OR: [
                        { group: { program: { gestores: { some: { id: gestorId } } } } },
                        { period: { program: { gestores: { some: { id: gestorId } } } } }
                    ]
                }
            }),
            // Active courses in gestor's programs
            prisma.course.count({
                where: {
                    OR: [
                        {
                            group: {
                                program: { gestores: { some: { id: gestorId } } },
                                OR: [
                                    { endDate: null },
                                    { endDate: { gte: new Date() } }
                                ]
                            }
                        },
                        {
                            period: { program: { gestores: { some: { id: gestorId } } } },
                            groupId: null
                        }
                    ]
                }
            }),
            // Managed programs list
            prisma.program.findMany({
                where: { gestores: { some: { id: gestorId } } },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    allowPastAttendanceEdit: true,
                    _count: {
                        select: {
                            groups: true,
                            periods: true,
                            environments: true,
                            teachers: true
                        }
                    }
                },
                orderBy: { name: "asc" }
            })
        ]);

        // Compute detailed stats for each individual program
        const managedProgramsWithStats = await Promise.all(
            managedProgramsList.map(async (prog: any) => {
                const [progStudents, progTeachers, progCourses, progActiveCourses] = await Promise.all([
                    prisma.user.count({
                        where: { role: "student", group: { programId: prog.id } }
                    }),
                    prisma.user.count({
                        where: {
                            role: "teacher",
                            OR: [
                                { groupsTaught: { some: { programId: prog.id } } },
                                { coursesTaught: { some: { OR: [
                                    { group: { programId: prog.id } },
                                    { period: { programId: prog.id } }
                                ] } } },
                                { programs: { some: { id: prog.id } } }
                            ]
                        }
                    }),
                    prisma.course.count({
                        where: {
                            OR: [
                                { group: { programId: prog.id } },
                                { period: { programId: prog.id } }
                            ]
                        }
                    }),
                    prisma.course.count({
                        where: {
                            OR: [
                                {
                                    group: {
                                        programId: prog.id,
                                        OR: [
                                            { endDate: null },
                                            { endDate: { gte: new Date() } }
                                        ]
                                    }
                                },
                                { period: { programId: prog.id }, groupId: null }
                            ]
                        }
                    })
                ]);

                return {
                    id: prog.id,
                    name: prog.name,
                    description: prog.description,
                    studentsCount: progStudents,
                    teachersCount: progTeachers,
                    coursesCount: progCourses,
                    activeCoursesCount: progActiveCourses,
                    groupsCount: prog._count.groups,
                    periodsCount: prog._count.periods,
                    environmentsCount: prog._count.environments,
                    _count: prog._count
                };
            })
        );

        return {
            users: {
                admin: 0,
                teacher: teacherCount,
                student: studentCount,
                total: studentCount + teacherCount
            },
            courses: {
                total: courseCount,
                active: activeCourseCount,
                archived: Math.max(0, courseCount - activeCourseCount)
            },
            groups: {
                total: groupCount
            },
            programs: {
                total: managedProgramsList.length
            },
            managedProgramsList: managedProgramsWithStats,
            activity: {
                submissions: 0
            },
            health: { connected: true }
        };
    }

    /**
     * Get recent activity scoped to the programs managed by a specific gestor
     */
    async getRecentActivity(gestorId: string, limit: number = 10): Promise<GestorActivityItem[]> {
        const gestorCourseFilter = {
            OR: [
                { group: { program: { gestores: { some: { id: gestorId } } } } },
                { period: { program: { gestores: { some: { id: gestorId } } } } }
            ]
        };

        const [recentGrades, recentRemarks, recentAttendances] = await Promise.all([
            prisma.studentGrade.findMany({
                where: {
                    activity: {
                        course: gestorCourseFilter
                    }
                },
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            profile: true,
                        }
                    },
                    activity: {
                        include: {
                            course: {
                                select: {
                                    id: true,
                                    title: true,
                                    group: { select: { programId: true } },
                                    period: { select: { programId: true } }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.remark.findMany({
                where: {
                    course: gestorCourseFilter
                },
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            profile: true,
                        }
                    },
                    course: {
                        select: {
                            id: true,
                            title: true,
                            group: { select: { programId: true } },
                            period: { select: { programId: true } }
                        }
                    }
                }
            }),
            prisma.attendance.findMany({
                where: {
                    status: { not: "PRESENT" },
                    course: gestorCourseFilter
                },
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            profile: true,
                        }
                    },
                    course: {
                        select: {
                            id: true,
                            title: true,
                            group: { select: { programId: true } },
                            period: { select: { programId: true } }
                        }
                    }
                }
            })
        ]);

        const activities: GestorActivityItem[] = [];

        recentGrades.forEach((g: any) => {
            if (g.user && g.activity) {
                activities.push({
                    type: "grade",
                    user: g.user,
                    timestamp: g.updatedAt,
                    programId: g.activity.course?.group?.programId || g.activity.course?.period?.programId || null,
                    details: {
                        activity: g.activity.title,
                        course: g.activity.course?.title || "Materia",
                        score: g.score,
                    }
                });
            }
        });

        recentRemarks.forEach((r: any) => {
            if (r.user) {
                activities.push({
                    type: "remark",
                    user: r.user,
                    timestamp: r.createdAt,
                    programId: r.course?.group?.programId || r.course?.period?.programId || null,
                    details: {
                        activity: r.title,
                        course: r.course?.title || "General",
                        score: null
                    }
                });
            }
        });

        recentAttendances.forEach((a: any) => {
            if (a.user) {
                activities.push({
                    type: "attendance",
                    user: a.user,
                    timestamp: a.updatedAt,
                    programId: a.course?.group?.programId || a.course?.period?.programId || null,
                    details: {
                        activity: `Inasistencia (${a.status})`,
                        course: a.course?.title || "Materia",
                        score: null
                    }
                });
            }
        });

        return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    /**
     * Get all programs managed by a specific gestor
     */
    async getManagedPrograms(gestorId: string) {
        return prisma.program.findMany({
            where: { gestores: { some: { id: gestorId } } },
            include: {
                _count: {
                    select: {
                        groups: true,
                        periods: true,
                        environments: true,
                        teachers: true,
                    }
                }
            },
            orderBy: { name: "asc" }
        });
    }
}

export const gestorService = new GestorService();
