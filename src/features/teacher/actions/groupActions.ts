"use server";

import prisma from "@/lib/prisma";
import { AttendanceStatus, RemarkType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";
import { isDateInColombianWeek, parseDateStringToUTCMidday } from "@/lib/dateUtils";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

function isDateInCurrentWeek(date: Date | string): boolean {
    return isDateInColombianWeek(date);
}

async function checkIsCourseWeekLocked(courseId: string, dateObj: Date): Promise<boolean> {
    if (isDateInCurrentWeek(dateObj)) return false;

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
            group: {
                select: {
                    program: {
                        select: { allowPastAttendanceEdit: true }
                    }
                }
            },
            period: {
                select: {
                    program: {
                        select: { allowPastAttendanceEdit: true }
                    }
                }
            }
        }
    });

    const allowPast = course?.group?.program?.allowPastAttendanceEdit ?? course?.period?.program?.allowPastAttendanceEdit ?? false;

    return !allowPast;
}

async function requireTeacher() {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin" && session.user.role !== "gestor")) {
        throw new Error("Unauthorized: Teacher access required");
    }
    return session.user;
}

async function verifyCourseTeacher(courseId: string, teacherId: string) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true }
    });
    if (!course || course.teacherId !== teacherId) {
        throw new Error("Unauthorized: You do not have permission to modify this course");
    }
}

export async function resetStudentPassword(studentId: string) {
    try {
        const caller = await requireTeacher();

        const student = await prisma.user.findUnique({
            where: { id: studentId },
            include: { profile: true }
        });

        if (!student) throw new Error("Estudiante no encontrado");

        // Validación estricta: Solo se permite restablecer contraseñas a usuarios con rol estudiante
        if (student.role !== "student") {
            throw new Error("No autorizado: Solo se puede restablecer la contraseña de usuarios con rol de estudiante");
        }

        // Si el solicitante es un docente, validar que el estudiante pertenezca a sus cursos o grupos
        if (caller.role === "teacher") {
            const teachesStudentCourse = await prisma.course.findFirst({
                where: {
                    teacherId: caller.id,
                    enrollments: {
                        some: { userId: studentId }
                    }
                }
            });

            const teachesStudentGroup = student.groupId
                ? await prisma.group.findFirst({
                    where: {
                        id: student.groupId,
                        teachers: { some: { id: caller.id } }
                    }
                })
                : null;

            if (!teachesStudentCourse && !teachesStudentGroup) {
                throw new Error("No autorizado: Solo puedes restablecer la contraseña de estudiantes asignados a tus materias o grupos");
            }
        }

        const defaultPassword = student.profile?.identificacion?.trim();

        if (!defaultPassword) {
            throw new Error("El estudiante no tiene número de identificación registrado en su perfil.");
        }

        // Hash the password (same logic as student creation / teacher password recovery)
        const { hashPassword } = await import("better-auth/crypto");
        const hashedPassword = await hashPassword(defaultPassword);

        // Find and update the Account record or create it if not present
        const existingAccount = await prisma.account.findFirst({
            where: { userId: studentId, providerId: "credential" }
        });

        if (existingAccount) {
            await prisma.account.update({
                where: { id: existingAccount.id },
                data: { password: hashedPassword }
            });
        } else {
            await prisma.account.create({
                data: {
                    id: crypto.randomUUID(),
                    accountId: crypto.randomUUID(),
                    providerId: "credential",
                    userId: studentId,
                    password: hashedPassword
                }
            });
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error resetting password:", error);
        return { success: false, error: error.message };
    }
}

export async function saveAttendanceBatch(
    courseId: string, 
    date: string, 
    records: { studentId: string; status: AttendanceStatus; arrivalTime?: string; departureTime?: string; justification?: string }[]
) {
    try {
        const teacher = await requireTeacher();
        await verifyCourseTeacher(courseId, teacher.id);

        const dateObj = parseDateStringToUTCMidday(date);

        // Check week locking config per program
        const isLocked = await checkIsCourseWeekLocked(courseId, dateObj);
        if (isLocked) {
            const approvedRequest = await prisma.attendancePermissionRequest.findFirst({
                where: {
                    courseId,
                    teacherId: teacher.id,
                    date: dateObj,
                    status: "APPROVED"
                }
            });
            if (!approvedRequest) {
                throw new Error("WEEK_LOCKED");
            }
        }

        // Delete existing attendance for this course and date
        await prisma.attendance.deleteMany({
            where: {
                courseId,
                date: dateObj
            }
        });

        const parseArrivalTime = (timeStr: string | undefined | null) => {
            if (!timeStr) return null;
            const dateParsed = new Date(timeStr);
            if (!isNaN(dateParsed.getTime())) {
                return dateParsed;
            }
            if (/^\d{2}:\d{2}$/.test(timeStr)) {
                const yyyy = dateObj.getUTCFullYear();
                const mm = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
                const dd = String(dateObj.getUTCDate()).padStart(2, "0");
                const fullDateTimeStr = `${yyyy}-${mm}-${dd}T${timeStr}:00`;
                const d = new Date(fullDateTimeStr);
                if (!isNaN(d.getTime())) {
                    return d;
                }
            }
            return null;
        };

        if (records.length > 0) {
            await prisma.attendance.createMany({
                data: records.map(r => ({
                    courseId,
                    userId: r.studentId,
                    date: dateObj,
                    status: r.status,
                    arrivalTime: parseArrivalTime(r.arrivalTime),
                    departureTime: parseArrivalTime(r.departureTime),
                    justification: r.justification
                }))
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error saving attendance:", error);
        return { success: false, error: error.message };
    }
}

export async function saveRemarkBatch(
    teacherId: string,
    courseId: string, 
    studentIds: string[], 
    type: RemarkType, 
    title: string, 
    description: string
) {
    try {
        const teacher = await requireTeacher();
        if (teacher.id !== teacherId) throw new Error("Unauthorized");
        await verifyCourseTeacher(courseId, teacher.id);

        if (studentIds.length === 0) throw new Error("No students selected");

        const finalData = studentIds.map(studentId => {
            return {
                userId: studentId,
                teacherId,
                courseId,
                type,
                title,
                description,
                date: new Date()
            };
        });

        await prisma.remark.createMany({
            data: finalData
        });

        revalidatePath("/dashboard/teacher");
        return { success: true };
    } catch (error: any) {
        console.error("Error saving remarks:", error);
        return { success: false, error: error.message };
    }
}


export async function getGroupAttendanceHistory(groupId: string) {
    try {
        const user = await requireTeacher();
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: { courses: true }
        });

        if (!group) return [];

        // Filter courses: teachers only see their own courses, admins see all
        const coursesTaught = user.role === "admin"
            ? group.courses
            : group.courses.filter(c => c.teacherId === user.id);

        const courseIds = coursesTaught.map(c => c.id);

        const attendances = await prisma.attendance.findMany({
            where: {
                courseId: { in: courseIds }
            },
            include: {
                course: true,
                user: {
                    include: {
                        profile: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        return attendances;
    } catch (error) {
        console.error("Error fetching attendance history:", error);
        return [];
    }
}

export async function getGroupRemarksHistory(groupId: string) {
    try {
        const user = await requireTeacher();
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: { courses: true }
        });

        if (!group) return [];

        // Filter courses: teachers only see their own courses, admins see all
        const coursesTaught = user.role === "admin"
            ? group.courses
            : group.courses.filter(c => c.teacherId === user.id);

        const courseIds = coursesTaught.map(c => c.id);

        const remarks = await prisma.remark.findMany({
            where: {
                courseId: { in: courseIds }
            },
            include: {
                course: true,
                user: {
                    include: {
                        profile: true
                    }
                },
                teacher: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        return remarks;
    } catch (error) {
        console.error("Error fetching remarks history:", error);
        return [];
    }
}export async function getTeacherComprehensiveGroupAnalyticsAction(groupId: string) {
    const user = await requireTeacher();

    const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
            program: true,
            environment: true,
            students: {
                where: user.role === "admin" ? {} : { banned: { not: true } },
                select: { id: true, name: true, banned: true, profile: { select: { identificacion: true, novedad: true, novedadColor: true } } }
            },
            courses: {
                select: {
                    id: true,
                    title: true,
                    teacherId: true,
                    activities: {
                        select: {
                            grades: {
                                select: { score: true, userId: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!group) throw new Error("Grupo no encontrado");

    // Filter courses: teachers only see their own courses, admins see all
    const coursesTaught = user.role === "admin"
        ? group.courses
        : group.courses.filter(c => c.teacherId === user.id);

    const courseIds = coursesTaught.map(c => c.id);

    // Fetch attendances
    const attendances = await prisma.attendance.findMany({
        where: { courseId: { in: courseIds } },
        select: { status: true, date: true, userId: true, courseId: true }
    });

    // Fetch remarks
    const remarks = await prisma.remark.findMany({
        where: { courseId: { in: courseIds } },
        select: {
            id: true,
            type: true,
            title: true,
            description: true,
            date: true,
            userId: true,
            courseId: true,
            course: { select: { title: true } },
            user: { select: { name: true, profile: { select: { nombres: true, apellido: true } } } },
            teacher: { select: { name: true, profile: { select: { nombres: true, apellido: true } } } }
        }
    });

    const uniqueDates = new Set([
        ...attendances.map(a => new Date(a.date).toISOString().split('T')[0]),
        ...remarks.map(r => new Date(r.date).toISOString().split('T')[0])
    ]);
    const totalCourseClasses = uniqueDates.size;

    // Filter students: teachers do not see banned students, admins see all
    const studentsToProcess = user.role === "admin"
        ? group.students
        : group.students.filter(s => !s.banned);

    // Calculate students stats
    const totalStudents = studentsToProcess.length;
    const bannedStudents = group.students.filter(s => s.banned).length;
    const activeStudents = user.role === "admin" ? totalStudents - bannedStudents : totalStudents;

    // Calculate courses average grades
    const coursesStats = coursesTaught.map(course => {
        const allGrades = course.activities.flatMap(a => a.grades);
        const sum = allGrades.reduce((acc, g) => acc + g.score, 0);
        const avg = allGrades.length > 0 ? sum / allGrades.length : 0;
        return {
            title: course.title,
            averageGrade: Number(avg.toFixed(2)),
            totalGrades: allGrades.length
        };
    });

    // Calculate individual student metrics
    const studentMetrics = studentsToProcess.map(student => {
        const sAttendances = attendances.filter(a => a.userId === student.id);
        const absent = sAttendances.filter(a => a.status === 'ABSENT').length;
        const late = sAttendances.filter(a => a.status === 'LATE').length;
        const present = Math.max(0, totalCourseClasses - absent - late);

        const sRemarks = remarks.filter(r => r.userId === student.id);
        const attention = sRemarks.filter(r => r.type === 'ATTENTION').length;
        const commendation = sRemarks.filter(r => r.type === 'COMMENDATION').length;

        let totalScore = 0;
        let gradesCount = 0;
        const courseGrades: Record<string, number> = {};

        const courseAttendances: Record<string, { present: number, absent: number, late: number }> = {};
        const courseRemarks: Record<string, { attention: number, commendation: number }> = {};

        coursesTaught.forEach(c => {
            // Grades
            let cScore = 0;
            let cCount = 0;
            c.activities.forEach(a => {
                a.grades.filter(g => g.userId === student.id).forEach(g => {
                    cScore += g.score;
                    cCount++;
                    totalScore += g.score;
                    gradesCount++;
                });
            });
            courseGrades[c.id] = cCount > 0 ? Number((cScore / cCount).toFixed(2)) : 0;

            // Attendances
            const cAtts = attendances.filter(a => a.userId === student.id && a.courseId === c.id);
            const cAbsent = cAtts.filter(a => a.status === 'ABSENT').length;
            const cLate = cAtts.filter(a => a.status === 'LATE').length;
            // Assuming course total classes is total dates for that course
            const cDates = new Set(attendances.filter(a => a.courseId === c.id).map(a => new Date(a.date).toISOString().split('T')[0]));
            const cPresent = Math.max(0, cDates.size - cAbsent - cLate);
            courseAttendances[c.id] = { present: cPresent, absent: cAbsent, late: cLate };

            // Remarks
            const cRems = remarks.filter(r => r.userId === student.id && r.courseId === c.id);
            const cAtten = cRems.filter(r => r.type === 'ATTENTION').length;
            const cComm = cRems.filter(r => r.type === 'COMMENDATION').length;
            courseRemarks[c.id] = { attention: cAtten, commendation: cComm };
        });

        const gradesAvg = gradesCount > 0 ? Number((totalScore / gradesCount).toFixed(2)) : 0;

        return {
            id: student.id,
            name: student.name,
            identificacion: student.profile?.identificacion || 'N/A',
            banned: student.banned,
            gradesAvg,
            courseGrades,
            courseAttendances,
            courseRemarks,
            attendances: { present, absent, late },
            remarks: { attention, commendation }
        };
    }).sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    const coursesList = coursesTaught.map(c => ({ id: c.id, title: c.title }));

    return {
        studentMetrics,
        coursesList,
        groupName: group.name,
        groupDescription: group.description,
        program: group.program?.name,
        period: null,
        environment: group.environment?.name,
        startDate: group.startDate,
        endDate: group.endDate,
        students: {
            total: totalStudents,
            active: activeStudents,
            banned: bannedStudents
        },
        totalCourseClasses,
        attendances,
        remarks,
        coursesStats
    };
}

export async function saveSingleAttendanceAction(
    courseId: string,
    studentId: string,
    dateStr: string,
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "UNMARKED" | "LEAVE_EARLY",
    justification?: string,
    arrivalTime?: string | null,
    departureTime?: string | null
) {
    try {
        const teacher = await requireTeacher();
        await verifyCourseTeacher(courseId, teacher.id);

        const dateObj = parseDateStringToUTCMidday(dateStr);

        // Check week locking config per program
        const isLocked = await checkIsCourseWeekLocked(courseId, dateObj);
        if (isLocked) {
            const approvedRequest = await prisma.attendancePermissionRequest.findFirst({
                where: {
                    courseId,
                    teacherId: teacher.id,
                    date: dateObj,
                    status: "APPROVED"
                }
            });
            if (!approvedRequest) {
                throw new Error("WEEK_LOCKED");
            }
        }

        // Find existing record using compound unique key constraint
        const existing = await prisma.attendance.findUnique({
            where: {
                courseId_userId_date: {
                    courseId,
                    userId: studentId,
                    date: dateObj
                }
            }
        });

        let savedRecord: any = null;

        if (status === "UNMARKED" as any) {
            if (existing) {
                await prisma.attendance.delete({
                    where: { id: existing.id }
                });
            }
        } else if (status === "PRESENT") {
            savedRecord = await prisma.attendance.upsert({
                where: {
                    courseId_userId_date: {
                        courseId,
                        userId: studentId,
                        date: dateObj
                    }
                },
                update: {
                    status: "PRESENT",
                    justification: null,
                    arrivalTime: null,
                    departureTime: null
                },
                create: {
                    courseId,
                    userId: studentId,
                    date: dateObj,
                    status: "PRESENT",
                    justification: null,
                    arrivalTime: null,
                    departureTime: null
                }
            });
        } else {
            const dbStatus = (status === "EXCUSED" || status === "ABSENT") ? "ABSENT" : (status as any);
            const dbJustification = status === "EXCUSED" ? (justification || "Justificado en planilla") : null;

            // Handle arrivalTime parse if late or arrivalTime provided
            let dbArrivalTime: Date | null = null;
            if (arrivalTime) {
                const dateParsed = new Date(arrivalTime);
                if (!isNaN(dateParsed.getTime())) {
                    dbArrivalTime = dateParsed;
                } else if (/^\d{2}:\d{2}$/.test(arrivalTime)) {
                    const yyyy = dateObj.getUTCFullYear();
                    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
                    const dd = String(dateObj.getUTCDate()).padStart(2, "0");
                    const fullDateTimeStr = `${yyyy}-${mm}-${dd}T${arrivalTime}:00`;
                    const d = new Date(fullDateTimeStr);
                    if (!isNaN(d.getTime())) {
                        dbArrivalTime = d;
                    }
                }
            } else if (dbStatus === "LATE") {
                dbArrivalTime = existing?.arrivalTime || new Date();
            }

            // Handle departureTime parse if leave early or departureTime provided
            let dbDepartureTime: Date | null = null;
            if (departureTime) {
                const dateParsed = new Date(departureTime);
                if (!isNaN(dateParsed.getTime())) {
                    dbDepartureTime = dateParsed;
                } else if (/^\d{2}:\d{2}$/.test(departureTime)) {
                    const yyyy = dateObj.getUTCFullYear();
                    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
                    const dd = String(dateObj.getUTCDate()).padStart(2, "0");
                    const fullDateTimeStr = `${yyyy}-${mm}-${dd}T${departureTime}:00`;
                    const d = new Date(fullDateTimeStr);
                    if (!isNaN(d.getTime())) {
                        dbDepartureTime = d;
                    }
                }
            } else if (dbStatus === "LEAVE_EARLY") {
                dbDepartureTime = existing?.departureTime || new Date();
            }

            savedRecord = await prisma.attendance.upsert({
                where: {
                    courseId_userId_date: {
                        courseId,
                        userId: studentId,
                        date: dateObj
                    }
                },
                update: {
                    status: dbStatus as any,
                    justification: dbJustification,
                    arrivalTime: dbArrivalTime,
                    departureTime: dbDepartureTime
                },
                create: {
                    courseId,
                    userId: studentId,
                    date: dateObj,
                    status: dbStatus as any,
                    justification: dbJustification,
                    arrivalTime: dbArrivalTime,
                    departureTime: dbDepartureTime
                }
            });
        }



        return { success: true, record: savedRecord };
    } catch (error: any) {
        console.error("Error saving single attendance:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteRemarkAction(remarkId: string) {
    try {
        const teacher = await requireTeacher();

        const remark = await prisma.remark.findUnique({
            where: { id: remarkId },
            include: { course: true }
        });

        if (!remark) throw new Error("Observación no encontrada");

        // Permisos: admin o creador de la observación o profesor del curso
        if (teacher.role !== "admin" && remark.teacherId !== teacher.id && remark.course.teacherId !== teacher.id) {
            throw new Error("No tienes permisos para retirar esta observación.");
        }

        await prisma.remark.delete({
            where: { id: remarkId }
        });

        revalidatePath("/dashboard/teacher");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting remark:", error);
        return { success: false, error: error.message };
    }
}



export async function requestAttendanceEditPermissionAction(courseId: string, dateStr: string, reason?: string) {
    try {
        const teacher = await requireTeacher();
        await verifyCourseTeacher(courseId, teacher.id);

        const dateObj = parseDateStringToUTCMidday(dateStr);

        // Check if there is already a PENDING or APPROVED request
        const existing = await prisma.attendancePermissionRequest.findFirst({
            where: {
                courseId,
                teacherId: teacher.id,
                date: dateObj,
                status: { in: ["PENDING", "APPROVED"] }
            }
        });

        if (existing) {
            return { success: false, error: `Ya existe una solicitud ${existing.status === "PENDING" ? "pendiente" : "aprobada"} para esta fecha.` };
        }

        await prisma.attendancePermissionRequest.create({
            data: {
                courseId,
                teacherId: teacher.id,
                date: dateObj,
                status: "PENDING",
                reason
            }
        });

        revalidatePath("/dashboard/teacher");
        return { success: true };
    } catch (error: any) {
        console.error("Error requesting edit permission:", error);
        return { success: false, error: error.message };
    }
}

export async function getAttendanceEditPermissionStatusAction(courseId: string, dateStr: string) {
    try {
        await requireTeacher();
        
        const dateObj = parseDateStringToUTCMidday(dateStr);

        const isLocked = await checkIsCourseWeekLocked(courseId, dateObj);

        return { 
            success: true, 
            isLocked,
            hasPermission: !isLocked,
            requestStatus: null,
            reason: null,
            limitSettingsActive: isLocked
        };
    } catch (error: any) {
        console.error("Error fetching permission status:", error);
        return { success: false, error: error.message };
    }
}

export async function getPendingAttendancePermissionRequestsAction() {
    try {
        // Require admin role
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) {
            throw new Error("Unauthorized");
        }

        const requests = await prisma.attendancePermissionRequest.findMany({
            orderBy: { createdAt: "desc" }
        });

        // Resolve teacher names and course names manually
        const resolvedRequests = [];
        for (const req of requests) {
            const teacher = await prisma.user.findUnique({ where: { id: req.teacherId } });
            const course = await prisma.course.findUnique({ where: { id: req.courseId }, include: { group: true } });
            resolvedRequests.push({
                ...req,
                teacherName: teacher?.name || "Desconocido",
                courseName: course?.title || "Desconocido",
                groupName: course?.group?.name || "Sin Grupo"
            });
        }

        return { success: true, requests: resolvedRequests };
    } catch (error: any) {
        console.error("Error fetching pending requests:", error);
        return { success: false, error: error.message };
    }
}

export async function respondToAttendancePermissionRequestAction(requestId: string, status: "APPROVED" | "REJECTED") {
    try {
        // Require admin role
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) {
            throw new Error("Unauthorized");
        }

        await prisma.attendancePermissionRequest.update({
            where: { id: requestId },
            data: { status }
        });

        revalidatePath("/dashboard/admin/settings");
        revalidatePath("/dashboard/teacher");
        return { success: true };
    } catch (error: any) {
        console.error("Error responding to permission request:", error);
        return { success: false, error: error.message };
    }
}

export async function resetStudentDailyAttempts(studentId: string) {
    try {
        await requireTeacher();

        const timeHeaders = await headers();
        const timezone = timeHeaders.get("x-vercel-ip-timezone") || "America/Bogota";
        const todayStr = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date());

        await prisma.studentAccessLog.upsert({
            where: {
                userId_date: {
                    userId: studentId,
                    date: todayStr
                }
            },
            update: {
                count: 0
            },
            create: {
                userId: studentId,
                date: todayStr,
                count: 0
            }
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error: any) {
        console.error("Error resetting student daily attempts:", error);
        return { success: false, error: error.message || "Failed to reset attempts" };
    }
}

export async function notifyEmailSentBatchAction(_studentIds: string[], _type: "PLAN" | "REMARK" | "GENERAL") {
    return { success: true };
}

