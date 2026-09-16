import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { formatName } from "@/lib/utils";

// Persistent cache for resilience
const courseStudentsCache = new Map<string, any>();

export async function populateCoursesFallbackDescriptions(courses: any[]) {
    if (!courses || courses.length === 0) return courses;

    const coursesToLookup = courses.filter(c => c && (!c.description || !c.description.trim()) && c.title);
    if (coursesToLookup.length === 0) return courses;

    const titles = Array.from(new Set(coursesToLookup.map(c => c.title.trim()).filter(Boolean)));
    if (titles.length === 0) return courses;

    const templates = await prisma.course.findMany({
        where: {
            groupId: null,
            description: { not: null },
            OR: titles.map(t => ({
                title: { equals: t, mode: "insensitive" }
            }))
        },
        select: {
            id: true,
            title: true,
            periodId: true,
            description: true,
            period: {
                select: {
                    id: true,
                    programId: true
                }
            }
        },
        orderBy: { updatedAt: "desc" }
    });

    if (templates.length === 0) return courses;

    const updatesToPersist: { id: string; description: string }[] = [];

    courses.forEach(c => {
        if (c && (!c.description || !c.description.trim()) && c.title) {
            const cTitle = c.title.trim().toLowerCase();
            const matchingTemplates = templates.filter(
                t => t.title.trim().toLowerCase() === cTitle && t.description && t.description.trim().length > 0
            );

            if (matchingTemplates.length > 0) {
                // 1. Match by periodId if present
                let bestMatch = c.periodId
                    ? matchingTemplates.find(t => t.periodId === c.periodId)
                    : null;

                // 2. Match by programId if present
                const targetProgId = c.group?.programId || c.programId;
                if (!bestMatch && targetProgId) {
                    bestMatch = matchingTemplates.find(t => t.period?.programId === targetProgId);
                }

                // 3. Match any template with the same title
                if (!bestMatch) {
                    bestMatch = matchingTemplates[0];
                }

                if (bestMatch?.description) {
                    c.description = bestMatch.description;
                    if (c.id) {
                        updatesToPersist.push({ id: c.id, description: bestMatch.description });
                    }
                }
            }
        }
    });

    // Auto-heal: persist resolved descriptions back to the database for group courses
    if (updatesToPersist.length > 0) {
        (async () => {
            try {
                for (const item of updatesToPersist) {
                    await prisma.course.updateMany({
                        where: {
                            id: item.id,
                            OR: [{ description: null }, { description: "" }]
                        },
                        data: { description: item.description }
                    });
                }
            } catch (err) {
                console.error("Error auto-healing course descriptions in database:", err);
            }
        })();
    }

    return courses;
}



export const courseService = {
    async createCourse(data: {
        title: string;
        description?: string;
        externalUrl?: string;
        docProjectId?: string;
        periodId?: string;
        weeklyHours?: number;
        badge?: string | null;
        badgeColor?: string | null;
        schedules?: Array<{
            dayOfWeek: string;
            startTime: string;
            endTime: string;
        }>;
    }) {
        const { schedules, docProjectId: _ignored, ...courseData } = data;

        const cleanData: any = {
            title: courseData.title.trim(),
            description: courseData.description ? courseData.description.trim() : null,
            externalUrl: courseData.externalUrl || null,
            periodId: courseData.periodId || null,
            weeklyHours: courseData.weeklyHours || 0,
            badge: courseData.badge || null,
            badgeColor: courseData.badgeColor || null,
        };

        const course = await prisma.course.create({
            data: cleanData,
        });

        // Create schedules if provided
        if (schedules && schedules.length > 0) {
            await prisma.courseSchedule.createMany({
                data: schedules.map(schedule => ({
                    courseId: course.id,
                    dayOfWeek: schedule.dayOfWeek as any,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                })),
            });
        }

        return course;
    },

    async cloneCourse(sourceCourseId: string, data: {
        title: string;
        description?: string;
        externalUrl?: string;
        docProjectId?: string;
        periodId?: string;
        weeklyHours?: number;
        badge?: string | null;
        badgeColor?: string | null;
        schedules?: Array<{
            dayOfWeek: string;
            startTime: string;
            endTime: string;
        }>;
    }) {
        // 1. Get source course with all data needed for cloning
        const sourceCourse = await prisma.course.findUnique({
            where: { id: sourceCourseId },
            include: { schedules: true }
        });

        if (!sourceCourse) {
            throw new Error("Course not found");
        }

        // 2. Create new course
        const { schedules, docProjectId: _ignored, ...courseData } = data;
        const cleanData: any = {
            title: courseData.title.trim(),
            description: courseData.description ? courseData.description.trim() : null,
            externalUrl: courseData.externalUrl || null,
            periodId: courseData.periodId || null,
            weeklyHours: courseData.weeklyHours || 0,
            badge: courseData.badge || null,
            badgeColor: courseData.badgeColor || null,
        };

        const newCourse = await prisma.course.create({
            data: cleanData,
        });

        // 3. Clone schedules: use provided ones if any, otherwise clone from source
        const schedulesToCreate = schedules && schedules.length > 0
            ? schedules
            : sourceCourse.schedules.map(s => ({
                dayOfWeek: s.dayOfWeek as string,
                startTime: s.startTime,
                endTime: s.endTime
            }));

        if (schedulesToCreate.length > 0) {
            await prisma.courseSchedule.createMany({
                data: schedulesToCreate.map(schedule => ({
                    courseId: newCourse.id,
                    dayOfWeek: schedule.dayOfWeek as any,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                })),
            });
        }

        return newCourse;
    },

    async updateCourse(courseId: string, data: {
        title?: string;
        description?: string;
        externalUrl?: string | null;
        docProjectId?: string | null;
        periodId?: string | null;
        weeklyHours?: number | null;
        badge?: string | null;
        badgeColor?: string | null;
        schedules?: Array<{
            dayOfWeek: string;
            startTime: string;
            endTime: string;
        }>;
    }) {
        const { schedules, docProjectId: _ignored, ...rawCourseData } = data;

        const currentCourse = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, title: true, periodId: true, groupId: true }
        });

        const cleanCourseData: any = {};
        if (rawCourseData.title !== undefined) cleanCourseData.title = rawCourseData.title.trim();
        if (rawCourseData.description !== undefined) {
            cleanCourseData.description = rawCourseData.description ? rawCourseData.description.trim() : null;
        }
        if (rawCourseData.externalUrl !== undefined) cleanCourseData.externalUrl = rawCourseData.externalUrl;
        if (rawCourseData.periodId !== undefined) cleanCourseData.periodId = rawCourseData.periodId;
        if (rawCourseData.weeklyHours !== undefined) cleanCourseData.weeklyHours = rawCourseData.weeklyHours;
        if (rawCourseData.badge !== undefined) cleanCourseData.badge = rawCourseData.badge;
        if (rawCourseData.badgeColor !== undefined) cleanCourseData.badgeColor = rawCourseData.badgeColor;

        const course = await prisma.course.update({
            where: { id: courseId },
            data: cleanCourseData,
        });

        // If this is a template/curricular course (groupId is null), cascade description, weeklyHours, badge, badgeColor, title to all group courses
        if (currentCourse && !currentCourse.groupId) {
            const groupCourseUpdates: any = {};
            if (cleanCourseData.description !== undefined) groupCourseUpdates.description = cleanCourseData.description;
            if (cleanCourseData.weeklyHours !== undefined) groupCourseUpdates.weeklyHours = cleanCourseData.weeklyHours;
            if (cleanCourseData.badge !== undefined) groupCourseUpdates.badge = cleanCourseData.badge;
            if (cleanCourseData.badgeColor !== undefined) groupCourseUpdates.badgeColor = cleanCourseData.badgeColor;
            if (cleanCourseData.title !== undefined) groupCourseUpdates.title = cleanCourseData.title;

            if (Object.keys(groupCourseUpdates).length > 0) {
                await prisma.course.updateMany({
                    where: {
                        groupId: { not: null },
                        title: { equals: currentCourse.title, mode: "insensitive" }
                    },
                    data: groupCourseUpdates
                });
            }
        }

        // Update schedules if provided
        if (schedules !== undefined) {
            // Delete existing schedules
            await prisma.courseSchedule.deleteMany({
                where: { courseId },
            });

            // Create new schedules
            if (schedules.length > 0) {
                await prisma.courseSchedule.createMany({
                    data: schedules.map(schedule => ({
                        courseId,
                        dayOfWeek: schedule.dayOfWeek as any,
                        startTime: schedule.startTime,
                        endTime: schedule.endTime,
                    })),
                });
            }
        }

        return course;
    },

    async getTeacherCourses(teacherId: string) {
        const courses = await prisma.course.findMany({
            where: {
                OR: [
                    { teacherId: teacherId },
                    {
                        group: {
                            teachers: { some: { id: teacherId } }
                        }
                    }
                ]
            },
            orderBy: { createdAt: "desc" },
            include: {
                schedules: true,
                group: true,
                teacher: { include: { profile: true } },
                _count: {
                    select: { enrollments: true },
                }
            },
        });
        return await populateCoursesFallbackDescriptions(courses);
    },

    async getTeacherGroups(teacherId: string) {
        const groups = await prisma.group.findMany({
            where: {
                OR: [
                    { teachers: { some: { id: teacherId } } },
                    { courses: { some: { teacherId: teacherId } } }
                ]
            },
            orderBy: { createdAt: "desc" },
            include: {
                program: true,
                students: {
                    where: {
                        banned: { not: true }
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        banned: true,
                        profile: {
                            select: {
                                identificacion: true,
                                nombres: true,
                                apellido: true,
                                telefono: true,
                                novedad: true,
                                novedadColor: true,
                            }
                        }
                    },
                    orderBy: {
                        name: "asc"
                    }
                },
                courses: {
                    where: {
                        teacherId: teacherId
                    },
                    include: {
                        schedules: true,
                        academicSchedule: {
                            select: {
                                id: true,
                                name: true,
                                startDate: true,
                                endDate: true,
                                isActive: true,
                                isPublished: true
                            }
                        },
                        teacher: {
                            select: {
                                name: true,
                                profile: { select: { nombres: true, apellido: true } }
                            }
                        },
                        sharedContent: {
                            orderBy: { createdAt: "desc" },
                            select: {
                                id: true,
                                title: true,
                                links: true,
                                createdAt: true,
                            }
                        }
                    }
                },
                scheduleSlots: {
                    include: {
                        academicSchedule: {
                            select: {
                                id: true,
                                name: true,
                                startDate: true,
                                endDate: true,
                                isActive: true,
                                isPublished: true
                            }
                        }
                    }
                }
            }
        });

        const allGroupCourses = groups.flatMap(g => g.courses || []);
        if (allGroupCourses.length > 0) {
            await populateCoursesFallbackDescriptions(allGroupCourses);
        }

        return groups;
    },

    async getStudentCourses(userId: string) {
        const student = await prisma.user.findUnique({
            where: { id: userId },
            select: { groupId: true }
        });

        const enrollments = await prisma.enrollment.findMany({
            where: {
                userId,
                status: 'APPROVED',
                course: {
                    OR: [
                        { group: null },
                        { group: { OR: [
                            { endDate: null },
                            { endDate: { gte: new Date() } }
                        ] } }
                    ]
                }
            },
            include: {
                course: {
                    include: {
                        schedules: true,
                        group: true,
                        teacher: { include: { profile: true } }
                    }
                }
            }
        });

        let groupCourses: any[] = [];
        if (student?.groupId) {
            groupCourses = await prisma.course.findMany({
                where: {
                    groupId: student.groupId,
                    group: {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: new Date() } }
                        ]
                    }
                },
                include: {
                    schedules: true,
                    group: true,
                    teacher: { include: { profile: true } }
                }
            });
        }

        const combined = [...enrollments.map(e => e.course)];
        groupCourses.forEach(gc => {
            if (!combined.some(c => c.id === gc.id)) {
                combined.push(gc);
            }
        });

        return await populateCoursesFallbackDescriptions(combined);
    },

    async getAllCourses() {
        return await prisma.course.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { enrollments: true },
                },
            },
        });
    },

    async getCourseById(courseId: string) {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                group: true,
                _count: {
                    select: {
                        enrollments: true
                    },
                },
            },
        });
        if (course && (!course.description || !course.description.trim())) {
            await populateCoursesFallbackDescriptions([course]);
        }
        return course;
    },

    async deleteCourse(courseId: string) {
        return await prisma.course.delete({
            where: { id: courseId },
        });
    },

    async enrollStudent(userId: string, courseId: string, status: 'PENDING' | 'APPROVED' = 'PENDING') {
        // Check if course registration is open (group hasn't ended yet)
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: {
                group: {
                    select: {
                        endDate: true
                    }
                }
            },
        });

        if (!course) {
            throw new Error("Course not found");
        }

        if (course.group?.endDate && new Date() > new Date(course.group.endDate)) {
            throw new Error("Course registration is closed (group period has ended)");
        }

        // Check if already enrolled
        const existing = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId,
                },
            },
        });

        if (existing) return existing;

        return await prisma.enrollment.create({
            data: {
                userId,
                courseId,
                status: status as any,
            },
        });
    },

    async getStudentEnrollments(userId: string) {
        const enrollments = await prisma.enrollment.findMany({
            where: {
                userId,
                status: 'APPROVED',
                course: {
                    OR: [
                        { group: null },
                        { group: { OR: [
                            { endDate: null },
                            { endDate: { gte: new Date() } }
                        ] } }
                    ]
                }
            },
            include: {
                course: {
                    include: {
                        sharedContent: {
                            orderBy: { createdAt: "asc" }
                        },
                        group: true,
                        gradeCategories: {
                            include: {
                                groups: {
                                    include: {
                                        items: true
                                    }
                                }
                            }
                        }
                    },
                },
            },
        });

        // Fetch all additional data for all enrollments in bulk to avoid N+1 problem
        const courseIds = enrollments.map(e => e.courseId);
        
        const [allRemarks, allAttendances] = await Promise.all([
            prisma.remark.findMany({
                where: {
                    courseId: { in: courseIds },
                    userId: userId
                },
                orderBy: { date: "desc" }
            }),
            prisma.attendance.findMany({
                where: {
                    courseId: { in: courseIds },
                    userId: userId,
                    status: { not: "PRESENT" }
                },
                orderBy: { date: "desc" }
            })
        ]);

        // Map remarks and attendances to their respective courses
        const enrichedEnrollments = enrollments.map((enrollment) => {
            const remarks = allRemarks.filter(r => r.courseId === enrollment.courseId);
            const attendances = allAttendances.filter(a => a.courseId === enrollment.courseId);

            return {
                ...enrollment,
                averageGrade: 0,
                remarks,
                attendances
            };
        });

        const courses = enrichedEnrollments.map(e => e.course);
        await populateCoursesFallbackDescriptions(courses);

        return enrichedEnrollments;
    },

    async getStudentPendingEnrollments(userId: string) {
        const enrollments = await prisma.enrollment.findMany({
            where: {
                userId,
                status: 'PENDING'
            },
            select: {
                courseId: true
            }
        });
        return enrollments.map(e => e.courseId);
    },

    async getPendingEnrollments(teacherId: string) {
        return await prisma.enrollment.findMany({
            where: {
                status: 'PENDING'
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: {
                            select: {
                                nombres: true,
                                apellido: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    },

    async updateEnrollmentStatus(enrollmentId: string, status: 'APPROVED' | 'REJECTED') {
        // We no longer delete on REJECTED, we just update the status to suspend access
        return await prisma.enrollment.update({
            where: { id: enrollmentId },
            data: { status: status as any }
        });
    },



    async getCourseStudents(courseId: string) {
        try {
            const students = await prisma.enrollment.findMany({
                where: { 
                    courseId,
                    user: {
                        banned: { not: true }
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                            banned: true,
                            profile: {
                                select: {
                                    identificacion: true,
                                    nombres: true,
                                    apellido: true,
                                    telefono: true,
                                    dataProcessingConsent: true,
                                    novedad: true,
                                    novedadColor: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    user: {
                        name: 'asc'
                    }
                }
            });

            courseStudentsCache.set(courseId, students);
            return students;
        } catch (error) {
            console.error(`[Resilience] Error fetching students for course ${courseId}:`, error);
            if (courseStudentsCache.has(courseId)) {
                console.warn(`[Resilience] Using stale fallback student data for course ${courseId}`);
                return courseStudentsCache.get(courseId);
            }
            throw error;
        }
    },

    async searchStudents(query: string) {
        return await prisma.user.findMany({
            where: {
                role: "student",
                banned: { not: true },
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    {
                        profile: {
                            OR: [
                                { identificacion: { contains: query, mode: "insensitive" } },
                                { nombres: { contains: query, mode: "insensitive" } },
                                { apellido: { contains: query, mode: "insensitive" } },
                                { telefono: { contains: query, mode: "insensitive" } },
                            ],
                        },
                    },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                profile: {
                    select: {
                        identificacion: true,
                        nombres: true,
                        apellido: true,
                        telefono: true,
                        dataProcessingConsent: true,
                    },
                },
            },
            take: 10,
        });
    },

    async removeStudentFromCourse(userId: string, courseId: string) {
        return await prisma.enrollment.deleteMany({
            where: {
                userId,
                courseId,
            },
        });
    },



    async getStudentCourseEnrollment(userId: string, courseId: string) {
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId,
                },
            },
            include: {
                course: {
                    include: {
                        sharedContent: {
                            orderBy: { createdAt: "asc" }
                        }
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                identificacion: true,
                                nombres: true,
                                apellido: true,
                                dataProcessingConsent: true,
                            }
                        }
                    }
                }
            },
        });

        if (!enrollment) return null;

        // Fetch remarks and attendance
        const remarks = await prisma.remark.findMany({
            where: {
                courseId: courseId,
                userId: userId
            },
            orderBy: { date: "desc" }
        });

        const attendances = await prisma.attendance.findMany({
            where: {
                courseId: courseId,
                userId: userId,
                status: { not: "PRESENT" }
            },
            orderBy: { date: "desc" }
        });

        return {
            ...enrollment,
            averageGrade: 0,
            remarks,
            attendances
        };
    },



    async getStudentsForTeacher(teacherId: string) {
        const enrollments = await prisma.enrollment.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            distinct: ['userId'],
            orderBy: {
                user: {
                    name: 'asc'
                }
            }
        });

        return enrollments.map(e => e.user);
    },

    async getCourseGradesReport(courseId: string) {
        // 1. Fetch Course, Categories, Groups, and Items
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                gradeCategories: {
                    include: {
                        groups: {
                            include: {
                                items: {
                                    orderBy: { createdAt: 'asc' }
                                }
                            },
                            orderBy: { createdAt: 'asc' }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!course) throw new Error("Course not found");

        const { calculateFinalGrade } = await import("@/lib/gradeUtils");

        // 2. Fetch Enrolled Students
        const enrollments = await prisma.enrollment.findMany({
            where: {
                courseId: courseId,
                status: 'APPROVED'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                identificacion: true,
                                nombres: true,
                                apellido: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                user: { name: 'asc' }
            }
        });

        // 4. Transform for Export (Flattened with hierarchical info)
        return enrollments.map(enrollment => {
            const student = enrollment.user;
            const { categoriesGrades, finalGrade } = calculateFinalGrade(
                student.id, 
                course.gradeCategories as any,
                []
            );

            const row: any = {
                'ID': student.profile?.identificacion || student.id.substring(0, 8),
                'Estudiante': formatName(student.name, student.profile),
                'Correo': student.email
            };

            // Add each category/group grade for Excel compatibility
            categoriesGrades.forEach(cat => {
                row[`${cat.name} (Total)`] = cat.grade.toFixed(2);
                cat.groups.forEach(group => {
                    row[`${cat.name} - ${group.name}`] = group.grade.toFixed(2);
                });
            });

            row['Nota Final'] = finalGrade.toFixed(2);
            row['_hierarchy'] = categoriesGrades; // Hidden field for advanced exporters

            return row;
        });
    },
    async getCourseAttendanceReport(courseId: string) {
        // 1. Fetch Course to ensure it exists
        const course = await prisma.course.findUnique({
            where: { id: courseId },
        });

        if (!course) throw new Error("Course not found");

        // 2. Fetch Enrolled Students
        const enrollments = await prisma.enrollment.findMany({
            where: {
                courseId: courseId,
                status: 'APPROVED' // Only active students
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                identificacion: true,
                                nombres: true,
                                apellido: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                user: { name: 'asc' }
            }
        });

        // 3. Fetch All Attendance Records for this course
        const attendances = await prisma.attendance.findMany({
            where: {
                courseId: courseId
            },
            orderBy: {
                date: 'asc'
            }
        });

        // 4. Fetch All Remarks for this course
        const remarks = await prisma.remark.findMany({
            where: {
                courseId: courseId
            },
            orderBy: {
                date: 'asc'
            }
        });

        // 5. Get all unique dates from both attendances and remarks
        const attendanceDates = attendances.map(a => a.date.toISOString().split('T')[0]);
        const remarkDates = remarks.map(r => r.date.toISOString().split('T')[0]);
        const uniqueDates = Array.from(new Set([...attendanceDates, ...remarkDates])).sort();

        // 6. Process Data
        const reportData = enrollments.map(enrollment => {
            const student = enrollment.user;
            const row: any = {
                'ID': student.profile?.identificacion || student.id.substring(0, 8),
                'Estudiante': formatName(student.name, student.profile),
                'Correo': student.email
            };

            uniqueDates.forEach(dateStr => {
                const attendance = attendances.find(a =>
                    a.userId === student.id &&
                    a.date.toISOString().split('T')[0] === dateStr
                );

                const studentRemarks = remarks.filter(r => 
                    r.userId === student.id && 
                    r.date.toISOString().split('T')[0] === dateStr
                );

                let attendanceData: any = '-';
                if (attendance || studentRemarks.length > 0) {
                    let status = 'P'; // Default is Present if there is no attendance record
                    if (attendance) {
                        switch (attendance.status) {
                            case 'ABSENT': status = 'A'; break;
                            case 'LATE': status = 'L'; break;
                        }
                    }
                    
                    attendanceData = {
                        status: status,
                        justification: attendance?.justification,
                        arrivalTime: attendance?.arrivalTime,
                        remarks: studentRemarks.map(r => ({
                            type: r.type,
                            title: r.title,
                            description: r.description
                        }))
                    };
                }

                row[dateStr] = attendanceData;
            });

            return row;
        });

        return reportData;
    },

    async getTeacherDashboardStats(teacherId: string) {
        const [
            pendingEnrollmentsCount,
            courses
        ] = await Promise.all([
            prisma.enrollment.count({
                where: {
                    status: 'PENDING'
                }
            }),
            prisma.course.findMany({
                include: {
                    _count: {
                        select: { enrollments: true }
                    }
                }
            })
        ]);

        const totalStudents = courses.reduce((acc, course) => acc + course._count.enrollments, 0);
        
        return {
            pendingEnrollmentsCount,
            pendingGradingCount: 0,
            activeCoursesCount: courses.length,
            totalStudentsCount: totalStudents,
            recentPendingGrading: []
        };
    },
};
