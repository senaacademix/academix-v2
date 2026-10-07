import prisma from "@/lib/prisma";


export const adminService = {
    // ============ DASHBOARD METRICS ============
    async getSystemStats() {
        const [
            userCounts,
            courseCounts,
            groupCounts,
            programCounts,
            activeCourses,
            systemHealth
        ] = await Promise.all([
            // Usuarios por rol
            prisma.user.groupBy({
                by: ['role'],
                _count: true
            }),
            // Materias totales
            prisma.course.count(),
            // Grupos / Fichas totales
            prisma.group.count(),
            // Programas totales
            prisma.program.count(),
            // Materias activas
            prisma.course.count({
                where: {
                    OR: [
                        { group: null },
                        { group: {
                            OR: [
                                { endDate: null },
                                { endDate: { gte: new Date() } }
                            ]
                        } }
                    ]
                }
            }),
            { connected: true }
        ]);

        const roleCounts = {
            admin: userCounts.find(u => u.role === 'admin')?._count || 0,
            gestor: userCounts.find(u => u.role === 'gestor')?._count || 0,
            teacher: userCounts.find(u => u.role === 'teacher')?._count || 0,
            student: userCounts.find(u => u.role === 'student')?._count || 0,
            total: userCounts.reduce((acc, curr) => acc + curr._count, 0)
        };

        return {
            users: roleCounts,
            courses: {
                total: courseCounts,
                active: activeCourses,
                archived: Math.max(0, courseCounts - activeCourses)
            },
            groups: {
                total: groupCounts
            },
            programs: {
                total: programCounts
            },
            activity: {
                submissions: 0
            },
            health: systemHealth
        };
    },


    // ============ USER MANAGEMENT ============
    async getAllUsers(filters?: {
        role?: "teacher" | "student" | "admin";
        search?: string;
        courseId?: string;
        groupId?: string;
        programId?: string;
        limit?: number;
        offset?: number;
        observerUserId?: string;
        gestorUserId?: string;
    }) {
        const where: any = {};
        const andConditions: any[] = [];

        if (filters?.role) {
            where.role = filters.role;
        }

        if (filters?.groupId && filters.groupId !== 'all') {
            where.groupId = filters.groupId;
        } else if (filters?.programId && filters.programId !== 'all') {
            if (filters?.role === "teacher") {
                andConditions.push({
                    OR: [
                        { programs: { some: { id: filters.programId } } },
                        { groupsTaught: { some: { programId: filters.programId } } },
                        { coursesTaught: { some: { OR: [
                            { group: { programId: filters.programId } },
                            { period: { programId: filters.programId } }
                        ] } } }
                    ]
                });
            } else {
                where.group = { programId: filters.programId };
            }
        }

        if (filters?.courseId && filters.courseId !== 'all') {
            andConditions.push({
                OR: [
                    // Student enrolled in course
                    { enrollments: { some: { courseId: filters.courseId } } },
                    // Teacher who created the course
                    { coursesCreated: { some: { id: filters.courseId } } }
                ]
            });
        }

        if (filters?.search) {
            andConditions.push({
                OR: [
                    { name: { contains: filters.search, mode: 'insensitive' as const } },
                    { email: { contains: filters.search, mode: 'insensitive' as const } }
                ]
            });
        }

        if (filters?.gestorUserId) {
            if (filters.role === "student" && (!filters.groupId || filters.groupId === 'all') && (!filters.programId || filters.programId === 'all')) {
                andConditions.push({
                    group: {
                        program: {
                            gestores: {
                                some: { id: filters.gestorUserId }
                            }
                        }
                    }
                });
            } else if (filters.role === "teacher" && (!filters.programId || filters.programId === 'all')) {
                andConditions.push({
                    OR: [
                        { programs: { some: { gestores: { some: { id: filters.gestorUserId } } } } },
                        { groupsTaught: { some: { program: { gestores: { some: { id: filters.gestorUserId } } } } } },
                        { coursesTaught: { some: { OR: [
                            { group: { program: { gestores: { some: { id: filters.gestorUserId } } } } },
                            { period: { program: { gestores: { some: { id: filters.gestorUserId } } } } }
                        ] } } }
                    ]
                });
            }
        }

        if (filters?.observerUserId) {
            if (filters.role === "student") {
                andConditions.push({
                    group: {
                        OR: [
                            {
                                program: {
                                    observers: {
                                        some: { id: filters.observerUserId }
                                    }
                                }
                            },
                            {
                                observers: {
                                    some: { id: filters.observerUserId }
                                }
                            }
                        ]
                    }
                });
            } else if (filters.role === "teacher") {
                andConditions.push({
                    OR: [
                        { programs: { some: { observers: { some: { id: filters.observerUserId } } } } },
                        { groupsTaught: { some: { program: { observers: { some: { id: filters.observerUserId } } } } } },
                        { coursesTaught: { some: { OR: [
                            { group: { program: { observers: { some: { id: filters.observerUserId } } } } },
                            { period: { program: { observers: { some: { id: filters.observerUserId } } } } }
                        ] } } }
                    ]
                });
            }
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                take: filters?.limit || 50,
                skip: filters?.offset || 0,
                orderBy: { name: 'asc' },
                include: {
                    profile: true,
                    group: {
                        select: {
                            id: true,
                            name: true,
                            voceroPrincipalId: true,
                            voceroSuplenteId: true
                        }
                    },
                    programs: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    qualifiedCourses: {
                        select: {
                            id: true,
                            title: true,
                            schedules: {
                                select: {
                                    id: true,
                                    dayOfWeek: true,
                                    startTime: true,
                                    endTime: true
                                }
                            },
                            group: {
                                select: { id: true, name: true }
                            },
                            period: {
                                select: {
                                    id: true,
                                    name: true,
                                    program: { select: { id: true, name: true } }
                                }
                            }
                        }
                    },
                    coursesTaught: {
                        select: {
                            id: true,
                            title: true,
                            schedules: {
                                select: {
                                    id: true,
                                    dayOfWeek: true,
                                    startTime: true,
                                    endTime: true
                                }
                            },
                            group: {
                                select: { id: true, name: true }
                            },
                            period: {
                                select: {
                                    id: true,
                                    name: true,
                                    program: { select: { id: true, name: true } }
                                }
                            }
                        }
                    },
                    availabilities: {
                        select: {
                            id: true,
                            dayOfWeek: true,
                            startTime: true,
                            endTime: true
                        },
                        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
                    },
                    _count: {
                        select: {
                            enrollments: true
                        }
                    }
                }
            }),
            prisma.user.count({ where })
        ]);

        return { users, total };
    },


    async getUserDetails(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                group: {
                    include: {
                        courses: {
                            include: {
                                teacher: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                },
                enrollments: {
                    include: {
                        course: {
                            include: {
                                teacher: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                },
                remarks: {
                    include: {
                        course: true,
                        teacher: {
                            include: {
                                profile: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                attendances: {
                    include: {
                        user: true,
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    },
                    orderBy: { date: 'desc' }
                }
            }
        });

        if (!user) return null;

        // Combine direct enrollments and group courses
        const directCourses = user.enrollments.map(e => ({
            id: e.course.id,
            title: e.course.title,
            teacher: e.course.teacher,
            createdAt: e.course.createdAt,
            status: e.status,
            isDirect: true
        }));

        const groupCourses = user.group?.courses.map(c => ({
            id: c.id,
            title: c.title,
            teacher: c.teacher,
            createdAt: c.createdAt,
            status: 'APPROVED' as any,
            isDirect: false
        })) || [];

        const courses = [...directCourses];
        groupCourses.forEach(gc => {
            if (!courses.some(c => c.id === gc.id)) {
                courses.push(gc);
            }
        });

        return {
            ...user,
            courses
        };
    },

    async updateUserRole(userId: string, newRole: "teacher" | "student" | "admin") {
        return await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        });
    },

    async toggleUserBan(userId: string, banned: boolean) {
        return await prisma.user.update({
            where: { id: userId },
            data: { banned }
        });
    },

    async deleteUser(userId: string) {
        return await prisma.$transaction(async (tx) => {
            // 1. Verificar si el usuario existe
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { id: true, role: true }
            });

            if (!user) {
                return null;
            }

            // 2. Limpiar vocerías en grupos (Group.voceroPrincipalId y Group.voceroSuplenteId son campos escalares)
            await tx.group.updateMany({
                where: { voceroPrincipalId: userId },
                data: { voceroPrincipalId: null }
            });
            await tx.group.updateMany({
                where: { voceroSuplenteId: userId },
                data: { voceroSuplenteId: null }
            });

            // 3. Desvincular de grupos de trabajo colaborativo (CourseWorkGroup m:n) y de relaciones m:n
            try {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        groupId: null,
                        workGroups: { set: [] },
                        groupsTaught: { set: [] },
                        qualifiedCourses: { set: [] },
                        observedGroups: { set: [] },
                        programs: { set: [] },
                        timelines: { set: [] },
                        managedPrograms: { set: [] },
                        observedPrograms: { set: [] }
                    }
                });
            } catch (err) {
                console.warn("[deleteUser] Non-critical warning resetting user relation sets:", err);
            }

            // 4. Eliminar todas las matrículas e historial de grupos (GroupEnrollment)
            await tx.groupEnrollment.deleteMany({
                where: { studentId: userId }
            });

            // 5. Limpieza de elecciones (candidaturas y votos)
            const candidacies = await tx.electionCandidate.findMany({
                where: { studentId: userId },
                select: { id: true }
            });
            if (candidacies.length > 0) {
                const candidacyIds = candidacies.map(c => c.id);
                // Eliminar votos dirigidos a estas candidaturas
                await tx.electionVote.deleteMany({
                    where: { candidateId: { in: candidacyIds } }
                });
                // Eliminar las candidaturas
                await tx.electionCandidate.deleteMany({
                    where: { id: { in: candidacyIds } }
                });
            }
            // Eliminar votos emitidos por este usuario
            await tx.electionVote.deleteMany({
                where: { studentId: userId }
            });

            // 6. Eliminar planes de mejoramiento (como estudiante o profesor)
            await tx.improvementPlan.deleteMany({
                where: {
                    OR: [
                        { studentId: userId },
                        { teacherId: userId }
                    ]
                }
            });

            // 7. Eliminar calificaciones de actividades del estudiante
            await tx.studentGrade.deleteMany({
                where: { userId }
            });

            // 8. Eliminar observaciones (como estudiante receptor o creador)
            await tx.remark.deleteMany({
                where: {
                    OR: [
                        { userId },
                        { teacherId: userId }
                    ]
                }
            });

            // 9. Eliminar asistencias
            await tx.attendance.deleteMany({
                where: { userId }
            });

            // 10. Eliminar matrículas en asignaturas
            await tx.enrollment.deleteMany({
                where: { userId }
            });

            // 11. Eliminar registros de accesos
            await tx.studentAccessLog.deleteMany({
                where: { userId }
            });

            // 12. Si el usuario tenía asignaciones docentes o administrativas
            await tx.course.updateMany({
                where: { teacherId: userId },
                data: { teacherId: null }
            });
            await tx.courseSchedule.updateMany({
                where: { teacherId: userId },
                data: { teacherId: null }
            });
            await tx.courseWorkGroup.deleteMany({
                where: { teacherId: userId }
            });
            await tx.teacherAvailability.deleteMany({
                where: { teacherId: userId }
            });
            await tx.teacherScheduleQualification.deleteMany({
                where: { teacherId: userId }
            });
            await tx.teacherScheduleLock.deleteMany({
                where: { teacherId: userId }
            });
            await tx.sharedContent.deleteMany({
                where: { teacherId: userId }
            });
            await tx.groupElection.deleteMany({
                where: { createdByTeacherId: userId }
            });
            await tx.announcement.deleteMany({
                where: { authorId: userId }
            });

            // 13. Limpiar referencias de auditoría o modificaciones secundarias
            await tx.scheduleNovelty.updateMany({
                where: { reportedById: userId },
                data: { reportedById: null }
            });
            await tx.user.updateMany({
                where: { availabilityLastModifiedById: userId },
                data: { availabilityLastModifiedById: null }
            });
            await tx.user.updateMany({
                where: { qualificationsLastModifiedById: userId },
                data: { qualificationsLastModifiedById: null }
            });
            await tx.teacherAvailability.updateMany({
                where: { createdById: userId },
                data: { createdById: null }
            });
            await tx.teacherScheduleQualification.updateMany({
                where: { createdById: userId },
                data: { createdById: null }
            });
            await tx.teacherScheduleLock.updateMany({
                where: { lockedById: userId },
                data: { lockedById: null }
            });

            // 14. Eliminar perfil, sesiones y cuentas de autenticación
            await tx.profile.deleteMany({
                where: { userId }
            });
            await tx.session.deleteMany({
                where: { userId }
            });
            await tx.account.deleteMany({
                where: { userId }
            });

            // 15. Finalmente, eliminar el registro de usuario
            return await tx.user.delete({
                where: { id: userId }
            });
        });
    },

    async getAllCoursesAdmin(filters?: {
        status?: 'active' | 'archived' | 'all';
        search?: string;
        limit?: number;
        offset?: number;
        observerUserId?: string;
        gestorUserId?: string;
        programId?: string;
    }) {
        const where: any = {};
        const andConditions: any[] = [];

        if (filters?.status === 'active') {
            andConditions.push({
                OR: [
                    { group: null },
                    { group: {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: new Date() } }
                        ]
                    } }
                ]
            });
        } else if (filters?.status === 'archived') {
            andConditions.push({
                group: {
                    endDate: { lt: new Date() }
                }
            });
        }

        if (filters?.search) {
            andConditions.push({
                OR: [
                    { title: { contains: filters.search, mode: 'insensitive' as const } },
                    { description: { contains: filters.search, mode: 'insensitive' as const } }
                ]
            });
        }

        if (filters?.programId && filters.programId !== 'all') {
            andConditions.push({
                OR: [
                    { group: { programId: filters.programId } },
                    { period: { programId: filters.programId } }
                ]
            });
        } else if (filters?.gestorUserId) {
            andConditions.push({
                OR: [
                    { group: { program: { gestores: { some: { id: filters.gestorUserId } } } } },
                    { period: { program: { gestores: { some: { id: filters.gestorUserId } } } } }
                ]
            });
        }

        if (filters?.observerUserId) {
            andConditions.push({
                OR: [
                    {
                        group: {
                            observers: {
                                some: { id: filters.observerUserId }
                            }
                        }
                    },
                    {
                        group: {
                            program: {
                                observers: {
                                    some: { id: filters.observerUserId }
                                }
                            }
                        }
                    },
                    {
                        period: {
                            program: {
                                observers: {
                                    some: { id: filters.observerUserId }
                                }
                            }
                        }
                    }
                ]
            });
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        const [courses, total] = await Promise.all([
            prisma.course.findMany({
                where,
                take: filters?.limit || 50,
                skip: filters?.offset || 0,
                orderBy: { createdAt: 'desc' },
                include: {
                    group: true,
                    period: {
                        include: {
                            program: true
                        }
                    },
                    _count: {
                        select: {
                            enrollments: true
                        }
                    }
                }
            }),
            prisma.course.count({ where })
        ]);

        return { courses, total };
    },

    async getCourseDetailsAdmin(courseId: string) {
        return await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                group: true,
                enrollments: {
                    include: {
                        user: {
                            include: {
                                profile: true
                            }
                        }
                    }
                },

                remarks: {
                    include: {
                        user: true,
                        teacher: true
                    }
                },
                attendances: {
                    include: {
                        user: true,
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    },
                    orderBy: { date: 'desc' }
                }
            }
        });
    },



    async getAllCoursesSimple() {
        return await prisma.course.findMany({
            // Fetch all courses for filtering, regardless of date
            where: {},
            select: {
                id: true,
                title: true
            },
            orderBy: {
                title: 'asc'
            }
        });
    },

    // ============ NOTIFICATION MANAGEMENT ============


    // ============ SYSTEM STATISTICS ============


    // ============ AUDIT LOGS (Simple version) ============
    async getRecentActivity(limit: number = 20) {
        return [];
    }
};
