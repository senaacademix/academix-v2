"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DayOfWeek } from "@/generated/prisma/client";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

async function requireAdmin() {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor")) {
        throw new Error("Unauthorized: Admin or Gestor access required");
    }
    return session;
}
/** Run async tasks with bounded concurrency to avoid exhausting the DB connection pool. */
async function runInBatches<T>(items: T[], fn: (item: T) => Promise<void>, concurrency = 5): Promise<void> {
    let index = 0;
    async function worker() {
        while (index < items.length) {
            const current = items[index++];
            await fn(current);
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}


async function requireAdminOrObserver() {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor" && session.user.role !== "observer")) {
        throw new Error("Unauthorized: Admin or Gestor access required");
    }
    return session;
}

// ============ PROGRAM CRUD ============

export async function getProgramsAction(programId?: string) {
    const session = await requireAdminOrObserver();
    let whereClause: any = {};
    if (session.user.role === "gestor") {
        whereClause = {
            gestores: {
                some: {
                    id: session.user.id
                }
            }
        };
    } else if (session.user.role === "observer") {
        whereClause = {
            observers: {
                some: {
                    id: session.user.id
                }
            }
        };
    }

    if (programId && programId !== "all" && programId !== "ALL") {
        whereClause.id = programId;
    }

    return await prisma.program.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
            gestores: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            teachers: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    availabilityLocked: true,
                    qualifiedCoursesLocked: true,
                    availabilities: true,
                    profile: true,
                    qualifiedCourses: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            },
            timelines: {
                orderBy: { createdAt: "asc" }
            },
            periods: {
                orderBy: { order: "asc" },
                include: {
                    timeline: true,
                    courses: {
                        where: { groupId: null },
                        orderBy: { order: "asc" },
                        include: {
                            group: true,
                            schedules: true,
                            teacher: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    icon: true
                                }
                            },
                            _count: {
                                select: {
                                    enrollments: true
                                }
                            }
                        }
                    }
                }
            },
            groups: {
                where: session.user.role === "observer" ? {
                    observers: {
                        some: { id: session.user.id }
                    }
                } : undefined,
                orderBy: { createdAt: "asc" },
                include: {
                    environment: true,
                    students: {
                        orderBy: { name: "asc" },
                        include: {
                            profile: true
                        }
                    },
                    teachers: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            icon: true
                        }
                    },
                    courses: {
                        include: {
                            group: true,
                            schedules: true,
                            teacher: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    icon: true
                                }
                            }
                        }
                    }
                }
            },
            environments: {
                orderBy: { createdAt: "desc" }
            }
        }
    });
}

export async function getGestoresAction() {
    const session = await requireAdmin();
    return await prisma.user.findMany({
        where: { role: "gestor" },
        select: {
            id: true,
            name: true,
            email: true
        },
        orderBy: { name: "asc" }
    });
}

export async function createProgramAction(data: { name: string; description?: string; startDate?: Date | null; endDate?: Date | null; scheduleTitle?: string | null; maxTeacherHours?: number | null; gestorIds?: string[] }) {
    const session = await requireAdmin();
    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre del programa debe tener al menos 2 caracteres");
    }

    const program = await prisma.program.create({
        data: {
            name: data.name,
            description: data.description || null,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            scheduleTitle: data.scheduleTitle || null,
            maxTeacherHours: data.maxTeacherHours ?? 40,
            timelines: {
                create: {
                    name: `${data.name.trim()} - Jornada Regular`,
                    description: `Programa de formación principal para ${data.name.trim()}`,
                    isDefault: true,
                }
            },
            gestores: data.gestorIds && data.gestorIds.length > 0 ? {
                connect: data.gestorIds.map(id => ({ id }))
            } : undefined
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "OTHER",
        entityId: program.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Programa de formación creado: ${program.name}`,
        metadata: { name: program.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return program;
}

export async function updateProgramAction(id: string, data: { name: string; description?: string; startDate?: Date | null; endDate?: Date | null; scheduleTitle?: string | null; maxTeacherHours?: number | null; allowPastAttendanceEdit?: boolean; gestorIds?: string[] }) {
    const session = await requireAdmin();
    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre del programa debe tener al menos 2 caracteres");
    }

    const program = await prisma.program.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description || null,
            startDate: data.startDate !== undefined ? data.startDate : undefined,
            endDate: data.endDate !== undefined ? data.endDate : undefined,
            scheduleTitle: data.scheduleTitle !== undefined ? data.scheduleTitle : undefined,
            maxTeacherHours: data.maxTeacherHours !== undefined ? (data.maxTeacherHours ?? 40) : undefined,
            allowPastAttendanceEdit: data.allowPastAttendanceEdit !== undefined ? data.allowPastAttendanceEdit : undefined,
            gestores: data.gestorIds !== undefined ? {
                set: data.gestorIds.map(id => ({ id }))
            } : undefined
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: program.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Programa de formación actualizado: ${program.name}`,
        metadata: { name: program.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/gestor");
    return program;
}

export async function toggleProgramPastAttendanceEditAction(programId: string, allowPastAttendanceEdit: boolean) {
    const session = await requireAdmin();

    const program = await prisma.program.update({
        where: { id: programId },
        data: { allowPastAttendanceEdit }
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/gestor");
    return program;
}

export async function deleteProgramAction(id: string) {
    const session = await requireAdmin();

    const program = await prisma.program.findUnique({
        where: { id },
        select: { name: true }
    });

    const result = await prisma.program.delete({
        where: { id }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "OTHER",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Programa de formación eliminado: ${program?.name || "Desconocido"}`,
        metadata: { name: program?.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return result;
}

// ============ PERIOD CRUD ============

export async function createPeriodAction(data: { name: string; description?: string; programId: string; esEspecial?: boolean; timelineId?: string | null }) {
    const session = await requireAdmin();
    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre del periodo debe tener al menos 2 caracteres");
    }
    if (!data.programId) {
        throw new Error("El programa es obligatorio");
    }

    let timelineId = data.timelineId;
    if (!timelineId) {
        const defaultTimeline = await prisma.curriculumTimeline.findFirst({
            where: { programId: data.programId, isDefault: true },
        }) || await prisma.curriculumTimeline.findFirst({
            where: { programId: data.programId },
        });
        timelineId = defaultTimeline?.id || null;
    }

    const period = await prisma.period.create({
        data: {
            name: data.name,
            description: data.description || null,
            programId: data.programId,
            esEspecial: data.esEspecial ?? false,
            timelineId: timelineId,
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "OTHER",
        entityId: period.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Periodo creado: ${period.name}`,
        metadata: { name: period.name, programId: period.programId, timelineId: period.timelineId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return period;
}

export async function updatePeriodAction(id: string, data: { name: string; description?: string; esEspecial?: boolean; timelineId?: string | null }) {
    const session = await requireAdmin();
    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre del periodo debe tener al menos 2 caracteres");
    }

    const updateData: any = {
        name: data.name,
        description: data.description || null,
        esEspecial: data.esEspecial ?? false,
    };
    if (data.timelineId !== undefined) {
        updateData.timelineId = data.timelineId;
    }

    const period = await prisma.period.update({
        where: { id },
        data: updateData,
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: period.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Periodo actualizado: ${period.name}`,
        metadata: { name: period.name, timelineId: period.timelineId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return period;
}

export async function deletePeriodAction(id: string) {
    const session = await requireAdmin();

    const period = await prisma.period.findUnique({
        where: { id },
        select: { name: true }
    });

    const result = await prisma.period.delete({
        where: { id }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "OTHER",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Periodo eliminado: ${period?.name || "Desconocido"}`,
        metadata: { name: period?.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return result;
}

// ============ GROUP CRUD ============

export async function getGroupsAction(programId?: string) {
    const session = await requireAdminOrObserver();
    let whereClause: any = {};
    if (session.user.role === "gestor") {
        whereClause = {
            program: {
                gestores: {
                    some: {
                        id: session.user.id
                    }
                }
            }
        };
    } else if (session.user.role === "observer") {
        whereClause = {
            observers: {
                some: {
                    id: session.user.id
                }
            }
        };
    }

    if (programId && programId !== "all" && programId !== "ALL") {
        whereClause.programId = programId;
    }

    return await prisma.group.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
            program: true,
            students: {
                include: {
                    profile: true
                }
            }
        }
    });
}

export async function createGroupAction(data: { name: string; description?: string; programId: string; categoria?: string }) {
    const session = await requireAdmin();
    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre del grupo debe tener al menos 2 caracteres");
    }
    if (!data.programId) {
        throw new Error("El programa es obligatorio");
    }

    const group = await prisma.group.create({
        data: {
            name: data.name,
            description: data.description || null,
            programId: data.programId,
            categoria: data.categoria || "LECTIVA",
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "GROUP",
        entityId: group.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Grupo creado: ${group.name}`,
        metadata: { name: group.name, programId: group.programId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return group;
}

export async function updateGroupAction(id: string, data: { name: string; description?: string; categoria?: string }) {
    const session = await requireAdmin();
    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre del grupo debe tener al menos 2 caracteres");
    }

    const group = await prisma.group.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description || null,
            categoria: data.categoria || "LECTIVA",
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "GROUP",
        entityId: group.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Grupo actualizado: ${group.name}`,
        metadata: { name: group.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return group;
}

export async function deleteGroupAction(id: string) {
    const session = await requireAdmin();

    const group = await prisma.group.findUnique({
        where: { id },
        select: { name: true }
    });

    const result = await prisma.group.delete({
        where: { id }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "GROUP",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Grupo eliminado: ${group?.name || "Desconocido"}`,
        metadata: { name: group?.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return result;
}

// ============ STUDENT ASSIGNMENT TO GROUP ============

export async function assignStudentToGroupAction(studentId: string, groupId: string | null) {
    const session = await requireAdmin();

    const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { name: true, groupId: true }
    });

    if (!student) {
        throw new Error("Estudiante no encontrado");
    }

    if (student.groupId !== groupId) {
        const { syncUserGroupChange } = await import("@/features/student/actions/studentGroupHistoryActions");
        await syncUserGroupChange(studentId, student.groupId, groupId, "Traslado / Asignación de ficha");
    }

    const targetGroup = groupId ? await prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true }
    }) : null;

    const result = await prisma.user.update({
        where: { id: studentId },
        data: { groupId },
        include: {
            profile: true,
            group: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: studentId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: groupId
            ? `Estudiante "${student?.name || 'Desconocido'}" trasladado/asignado a la ficha: "${targetGroup?.name || groupId}"`
            : `Estudiante "${student?.name || 'Desconocido'}" desasignado de su ficha`,
        metadata: { studentId, groupId, groupName: targetGroup?.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/admin/users");
    return result;
}

// ============ COURSE ASSIGNMENT TO PERIOD ============

export async function assignCourseToPeriodAction(courseId: string, periodId: string | null) {
    const session = await requireAdmin();

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true }
    });

    const result = await prisma.course.update({
        where: { id: courseId },
        data: { periodId }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "COURSE",
        entityId: courseId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: periodId
            ? `Materia "${course?.title || 'Desconocido'}" asignado al periodo ID: ${periodId}`
            : `Materia "${course?.title || 'Desconocido'}" removido de su periodo`,
        metadata: { courseId, periodId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return result;
}

export async function reorderCoursesAction(orderedIds: string[]) {
    await requireAdmin();
    
    if (!orderedIds || orderedIds.length === 0) return;

    await prisma.$transaction(
        orderedIds.map((id, index) =>
            prisma.course.update({
                where: { id },
                data: { order: index }
            })
        )
    );

    revalidatePath("/dashboard/admin/courses");
}

export async function reorderPeriodsAction(orderedIds: string[]) {
    await requireAdmin();
    
    if (!orderedIds || orderedIds.length === 0) return;

    await prisma.$transaction(
        orderedIds.map((id, index) =>
            prisma.period.update({
                where: { id },
                data: { order: index }
            })
        )
    );

    revalidatePath("/dashboard/admin/courses");
}

export async function registerStudentManualAction(data: {
    groupId: string;
    identificacion: string;
    nombres: string;
    apellido: string;
    email: string;
    telefono?: string;
}) {
    const session = await requireAdmin();

    if (!data.groupId) throw new Error("El grupo es obligatorio");
    if (!data.identificacion) throw new Error("El número de documento es obligatorio");
    if (!data.nombres) throw new Error("El nombre es obligatorio");
    if (!data.apellido) throw new Error("El apellido es obligatorio");
    if (!data.email) throw new Error("El correo electrónico es obligatorio");

    // Normalizar
    const emailNorm = data.email.trim().toLowerCase();
    const idenNorm = data.identificacion.trim();

    // Validar duplicados en la base de datos
    const existingUser = await prisma.user.findUnique({
        where: { email: emailNorm }
    });
    if (existingUser) {
        throw new Error(`Ya existe un usuario registrado con el correo: ${emailNorm}`);
    }

    const existingProfile = await prisma.profile.findFirst({
        where: { identificacion: idenNorm }
    });
    if (existingProfile) {
        throw new Error(`Ya existe un perfil registrado con el número de documento: ${idenNorm}`);
    }

    // Hash de la contraseña (contraseña inicial es el número de documento)
    const { hashPassword } = await import("better-auth/crypto");
    const hashedPassword = await hashPassword(idenNorm);
    const studentId = crypto.randomUUID();

    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                id: studentId,
                email: emailNorm,
                name: `${data.nombres.trim()} ${data.apellido.trim()}`,
                role: "student",
                emailVerified: true,
                groupId: data.groupId,
                accounts: {
                    create: {
                        id: crypto.randomUUID(),
                        accountId: crypto.randomUUID(),
                        providerId: "credential",
                        password: hashedPassword,
                    }
                }
            }
        });

        const profile = await tx.profile.create({
            data: {
                userId: studentId,
                identificacion: idenNorm,
                nombres: data.nombres.trim(),
                apellido: data.apellido.trim(),
                telefono: data.telefono?.trim() || null,
                dataProcessingConsent: false,
                dataProcessingConsentDate: null,
            }
        });

        return { user, profile };
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "USER",
        entityId: studentId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Estudiante registrado manualmente en grupo: ${data.nombres} ${data.apellido} (${emailNorm})`,
        metadata: { email: emailNorm, groupId: data.groupId, identificacion: idenNorm },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/gestor/courses");
    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/gestor/users");
    return result;
}

export interface StudentImportRow {
    identificacion: string;
    nombres: string;
    apellido: string;
    email: string;
    telefono?: string;
}

export interface SingleStudentImportResult {
    success: boolean;
    studentName: string;
    identificacion: string;
    email: string;
    action?: "created" | "assigned" | "updated";
    error?: string;
}

export async function registerSingleStudentAction(
    groupId: string,
    student: StudentImportRow
): Promise<SingleStudentImportResult> {
    await requireAdmin();

    const iden = student.identificacion?.toString().trim();
    const email = student.email?.toString().trim().toLowerCase();
    const nombres = student.nombres?.toString().trim() || "Estudiante";
    const apellido = student.apellido?.toString().trim() || "";
    const fullName = `${nombres} ${apellido}`.trim();
    const telefono = student.telefono?.toString().trim() || undefined;

    if (!groupId) {
        return {
            success: false,
            studentName: fullName,
            identificacion: iden || "N/A",
            email: email || "N/A",
            error: "El grupo de destino es obligatorio."
        };
    }

    if (!iden) {
        return {
            success: false,
            studentName: fullName,
            identificacion: "Faltante",
            email: email || "N/A",
            error: "Número de identificación faltante o vacío."
        };
    }

    if (!email || !email.includes("@")) {
        return {
            success: false,
            studentName: fullName,
            identificacion: iden,
            email: email || "Faltante",
            error: "Correo electrónico faltante o formato no válido."
        };
    }

    try {
        // 1. Buscar si existe por email
        let existingUser = await prisma.user.findUnique({
            where: { email },
            include: { profile: true }
        });

        // 2. Si no, buscar por documento
        if (!existingUser) {
            const profile = await prisma.profile.findFirst({
                where: { identificacion: iden },
                include: { user: true }
            });
            if (profile?.user) {
                existingUser = {
                    ...profile.user,
                    profile: profile
                } as any;
            }
        }

        if (existingUser) {
            // Asignar al grupo
            await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    groupId: groupId,
                    role: existingUser.role === "admin" ? "admin" : "student"
                }
            });

            if (existingUser.profile) {
                await prisma.profile.update({
                    where: { id: existingUser.profile.id },
                    data: {
                        identificacion: existingUser.profile.identificacion || iden,
                        nombres: existingUser.profile.nombres || nombres,
                        apellido: existingUser.profile.apellido || apellido,
                        telefono: telefono || existingUser.profile.telefono,
                    }
                });
            }

            return {
                success: true,
                studentName: fullName,
                identificacion: iden,
                email: email,
                action: "assigned"
            };
        }

        // Crear nuevo estudiante
        const { hashPassword } = await import("better-auth/crypto");
        const hashedPassword = await hashPassword(iden);
        const studentId = crypto.randomUUID();

        await prisma.$transaction(async (tx) => {
            await tx.user.create({
                data: {
                    id: studentId,
                    email: email,
                    name: fullName,
                    role: "student",
                    emailVerified: true,
                    groupId,
                    accounts: {
                        create: {
                            id: crypto.randomUUID(),
                            accountId: crypto.randomUUID(),
                            providerId: "credential",
                            password: hashedPassword,
                        }
                    }
                }
            });

            await tx.profile.create({
                data: {
                    userId: studentId,
                    identificacion: iden,
                    nombres: nombres,
                    apellido: apellido,
                    telefono: telefono || null,
                    dataProcessingConsent: false,
                    dataProcessingConsentDate: null,
                }
            });
        });

        return {
            success: true,
            studentName: fullName,
            identificacion: iden,
            email: email,
            action: "created"
        };
    } catch (e: any) {
        console.error(`Error guardando estudiante ${fullName}:`, e);
        return {
            success: false,
            studentName: fullName,
            identificacion: iden,
            email: email,
            error: e.message || "Error al insertar en la base de datos"
        };
    }
}

export async function registerStudentsBulkAction(groupId: string, list: StudentImportRow[]) {
    const session = await requireAdmin();
    if (!groupId) throw new Error("El grupo es obligatorio");
    if (!list || list.length === 0) throw new Error("La lista de estudiantes está vacía");

    // Filtrar duplicados dentro del mismo archivo excel e identificar registros incompletos
    const seenIdentificacions = new Set<string>();
    const seenEmails = new Set<string>();
    const uniqueInputList: StudentImportRow[] = [];
    const skippedErrors: string[] = [];

    for (let index = 0; index < list.length; index++) {
        const item = list[index];
        const rowNum = index + 2; // Asumiendo fila 1 encabezados, 1-based index
        const iden = item.identificacion?.toString().trim();
        const email = item.email?.toString().trim().toLowerCase();

        if (!iden) {
            skippedErrors.push(`Fila ${rowNum}: Omitido por número de identificación faltante.`);
            continue;
        }

        if (!email) {
            skippedErrors.push(`Fila ${rowNum} (Identificación: ${iden}): Omitido por correo electrónico faltante.`);
            continue;
        }

        if (seenIdentificacions.has(iden)) {
            skippedErrors.push(`Fila ${rowNum} (Identificación: ${iden}): Omitido por identificación duplicada dentro del archivo.`);
            continue;
        }

        if (seenEmails.has(email)) {
            skippedErrors.push(`Fila ${rowNum} (Correo: ${email}): Omitido por correo electrónico duplicado dentro del archivo.`);
            continue;
        }

        seenIdentificacions.add(iden);
        seenEmails.add(email);

        uniqueInputList.push({
            identificacion: iden,
            email: email,
            nombres: item.nombres?.toString().trim() || "Estudiante",
            apellido: item.apellido?.toString().trim() || "",
            telefono: item.telefono?.toString().trim() || undefined,
        });
    }

    if (uniqueInputList.length === 0) {
        return {
            successCount: 0,
            skippedCount: list.length,
            errors: ["No se encontraron estudiantes válidos con datos únicos en el archivo.", ...skippedErrors]
        };
    }

    // Verificar colisiones de correos e identificaciones en base de datos
    const emailsToCheck = uniqueInputList.map(u => u.email).filter(Boolean);
    const idensToCheck = uniqueInputList.map(u => u.identificacion).filter(Boolean);

    const existingUsers = await prisma.user.findMany({
        where: { email: { in: emailsToCheck } },
        select: { email: true }
    });
    const existingProfiles = await prisma.profile.findMany({
        where: { identificacion: { in: idensToCheck } },
        select: { identificacion: true }
    });

    const existingEmailsSet = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const existingIdensSet = new Set(existingProfiles.map(p => p.identificacion));

    const finalImportList: StudentImportRow[] = [];

    for (const student of uniqueInputList) {
        let isCollision = false;

        if (existingIdensSet.has(student.identificacion)) {
            skippedErrors.push(`Identificación ya registrada en el sistema: ${student.identificacion}`);
            isCollision = true;
        }

        if (existingEmailsSet.has(student.email)) {
            skippedErrors.push(`Correo ya registrado en el sistema: ${student.email}`);
            isCollision = true;
        }

        if (!isCollision) {
            finalImportList.push(student);
        }
    }

    if (finalImportList.length === 0) {
        return {
            successCount: 0,
            skippedCount: list.length,
            errors: ["Todos los estudiantes del archivo ya se encuentran registrados en el sistema.", ...skippedErrors]
        };
    }

    const { hashPassword } = await import("better-auth/crypto");
    let successCount = 0;
    const errors: string[] = [];

    const hashedStudents = await Promise.all(
        finalImportList.map(async (student) => {
            const password = student.identificacion;
            const hashedPassword = await hashPassword(password);
            return { student, hashedPassword };
        })
    );

    await runInBatches(hashedStudents, async ({ student, hashedPassword }) => {
        try {
            const studentId = crypto.randomUUID();

            await prisma.$transaction(async (tx) => {
                await tx.user.create({
                    data: {
                        id: studentId,
                        email: student.email,
                        name: `${student.nombres} ${student.apellido}`.trim(),
                        role: "student",
                        emailVerified: true,
                        groupId,
                        accounts: {
                            create: {
                                id: crypto.randomUUID(),
                                accountId: crypto.randomUUID(),
                                providerId: "credential",
                                password: hashedPassword,
                            }
                        }
                    }
                });

                await tx.profile.create({
                    data: {
                        userId: studentId,
                        identificacion: student.identificacion,
                        nombres: student.nombres,
                        apellido: student.apellido,
                        telefono: student.telefono || null,
                        dataProcessingConsent: false,
                        dataProcessingConsentDate: null,
                    }
                });
            });
            successCount++;
        } catch (e: any) {
            errors.push(`Error registrando a ${student.nombres} ${student.apellido}: ${e.message}`);
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "USER",
        entityId: groupId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Importación masiva de estudiantes. Registrados con éxito: ${successCount}. Omitidos/Errores: ${list.length - successCount}.`,
        metadata: { groupId, successCount, totalInput: list.length },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");

    return {
        successCount,
        skippedCount: list.length - successCount,
        errors: [...skippedErrors, ...errors]
    };
}



export async function assignTeacherToProgramAction(programId: string, teacherId: string, assign: boolean) {
    const session = await requireAdmin();

    const teacher = await prisma.user.findUnique({
        where: { id: teacherId }
    });

    if (!teacher || teacher.role !== "teacher") {
        throw new Error("El usuario seleccionado debe ser un profesor");
    }

    if (assign) {
        await prisma.program.update({
            where: { id: programId },
            data: {
                teachers: {
                    connect: { id: teacherId }
                }
            }
        });
    } else {
        await prisma.program.update({
            where: { id: programId },
            data: {
                teachers: {
                    disconnect: { id: teacherId }
                }
            }
        });
    }

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: programId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `${assign ? "Profesor asociado" : "Profesor desasociado"} del programa: ${teacher.name} (${teacher.email})`,
        metadata: { programId, teacherId, assign },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/gestor/courses");
    if (programId) {
        revalidatePath(`/dashboard/admin/courses?programId=${programId}`);
        revalidatePath(`/dashboard/gestor/courses?programId=${programId}`);
    }
    return { success: true };
}

export async function registerTeacherManualAction(data: {
    programId?: string;
    identificacion: string;
    nombres: string;
    apellido: string;
    email: string;
    telefono?: string;
}) {
    try {
        const session = await requireAdmin();

        if (!data.identificacion) return { success: false as const, error: "El número de documento es obligatorio" };
        if (!data.nombres) return { success: false as const, error: "El nombre es obligatorio" };
        if (!data.apellido) return { success: false as const, error: "El apellido es obligatorio" };
        if (!data.email) return { success: false as const, error: "El correo electrónico es obligatorio" };

        // Normalizar
        const emailNorm = data.email.trim().toLowerCase();
        const idenNorm = data.identificacion.trim();

        // Validar duplicados en la base de datos
        const existingUser = await prisma.user.findUnique({
            where: { email: emailNorm }
        });
        if (existingUser) {
            return { success: false as const, error: "Usuario existente" };
        }

        const existingProfile = await prisma.profile.findFirst({
            where: { identificacion: idenNorm }
        });
        if (existingProfile) {
            return { success: false as const, error: `Ya existe un perfil registrado con el número de documento: ${idenNorm}` };
        }

        // Hash de la contraseña (contraseña inicial es el número de documento)
        const { hashPassword } = await import("better-auth/crypto");
        const hashedPassword = await hashPassword(idenNorm);
        const teacherId = crypto.randomUUID();

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    id: teacherId,
                    email: emailNorm,
                    name: `${data.nombres.trim()} ${data.apellido.trim()}`,
                    role: "teacher",
                    emailVerified: true,
                    ...(data.programId ? {
                        programs: {
                            connect: { id: data.programId }
                        }
                    } : {}),
                    accounts: {
                        create: {
                            id: crypto.randomUUID(),
                            accountId: crypto.randomUUID(),
                            providerId: "credential",
                            password: hashedPassword,
                        }
                    }
                }
            });

            const profile = await tx.profile.create({
                data: {
                    userId: teacherId,
                    identificacion: idenNorm,
                    nombres: data.nombres.trim(),
                    apellido: data.apellido.trim(),
                    telefono: data.telefono?.trim() || null,
                    dataProcessingConsent: true,
                    dataProcessingConsentDate: new Date(),
                }
            });

            return { user, profile };
        });

        const { auditLogger } = await import("../services/auditLogger");
        await auditLogger.log({
            action: "CREATE",
            entity: "USER",
            entityId: teacherId,
            userId: session.user.id,
            userName: session.user.name || "Admin",
            userRole: (session.user.role as any) || "admin",
            description: data.programId
                ? `Profesor registrado manualmente en programa: ${data.nombres} ${data.apellido} (${emailNorm})`
                : `Profesor registrado manualmente en el banco global: ${data.nombres} ${data.apellido} (${emailNorm})`,
            metadata: { email: emailNorm, programId: data.programId, identificacion: idenNorm },
            success: true,
        });

        revalidatePath("/dashboard/admin/courses");
        revalidatePath("/dashboard/gestor/courses");
        revalidatePath("/dashboard/admin/users");
        revalidatePath("/dashboard/gestor/users");
        if (data.programId) {
            revalidatePath(`/dashboard/admin/courses?programId=${data.programId}`);
            revalidatePath(`/dashboard/gestor/courses?programId=${data.programId}`);
            revalidatePath(`/dashboard/gestor/users?programId=${data.programId}`);
        }
        return { success: true as const, ...result };
    } catch (error: any) {
        console.error("Error in registerTeacherManualAction:", error);
        return { success: false as const, error: error.message || "Error al registrar profesor" };
    }
}

export interface TeacherImportRow {
    identificacion: string;
    nombres: string;
    apellido: string;
    email: string;
    telefono?: string;
}

export interface SingleTeacherImportResult {
    success: boolean;
    teacherName: string;
    identificacion: string;
    email: string;
    action?: "created" | "assigned" | "updated";
    error?: string;
}

export async function registerSingleTeacherAction(
    programId: string | null | undefined,
    teacher: TeacherImportRow
): Promise<SingleTeacherImportResult> {
    await requireAdmin();

    const iden = teacher.identificacion?.toString().trim();
    const email = teacher.email?.toString().trim().toLowerCase();
    const nombres = teacher.nombres?.toString().trim() || "Profesor";
    const apellido = teacher.apellido?.toString().trim() || "";
    const fullName = `${nombres} ${apellido}`.trim();
    const telefono = teacher.telefono?.toString().trim() || undefined;

    if (!iden) {
        return {
            success: false,
            teacherName: fullName || "Desconocido",
            identificacion: "Faltante",
            email: email || "N/A",
            error: "Número de identificación faltante o vacío."
        };
    }

    if (!email || !email.includes("@")) {
        return {
            success: false,
            teacherName: fullName,
            identificacion: iden,
            email: email || "Faltante",
            error: "Correo electrónico faltante o formato no válido."
        };
    }

    try {
        // 1. Buscar si ya existe por correo
        let existingUser = await prisma.user.findUnique({
            where: { email },
            include: {
                profile: true,
                programs: { select: { id: true } }
            }
        });

        // 2. Si no existe por correo, buscar si existe por identificación
        if (!existingUser) {
            const profile = await prisma.profile.findFirst({
                where: { identificacion: iden },
                include: {
                    user: {
                        include: {
                            programs: { select: { id: true } }
                        }
                    }
                }
            });
            if (profile?.user) {
                existingUser = {
                    ...profile.user,
                    profile: profile
                } as any;
            }
        }

        // Si el usuario ya existe en el sistema
        if (existingUser) {
            // Vincular al programa si aún no lo está
            if (programId) {
                const isAlreadyLinked = existingUser.programs.some(p => p.id === programId);
                if (!isAlreadyLinked) {
                    await prisma.user.update({
                        where: { id: existingUser.id },
                        data: {
                            programs: {
                                connect: { id: programId }
                            }
                        }
                    });
                }
            }

            // Actualizar rol a profesor si no lo tenía
            if (existingUser.role !== "teacher" && existingUser.role !== "admin") {
                await prisma.user.update({
                    where: { id: existingUser.id },
                    data: { role: "teacher" }
                });
            }

            // Actualizar datos del perfil si faltaban
            if (existingUser.profile) {
                await prisma.profile.update({
                    where: { id: existingUser.profile.id },
                    data: {
                        identificacion: existingUser.profile.identificacion || iden,
                        nombres: existingUser.profile.nombres || nombres,
                        apellido: existingUser.profile.apellido || apellido,
                        telefono: telefono || existingUser.profile.telefono,
                    }
                });
            }

            return {
                success: true,
                teacherName: fullName,
                identificacion: iden,
                email: email,
                action: "assigned"
            };
        }

        // Si el usuario NO existe, crearlo
        const { hashPassword } = await import("better-auth/crypto");
        const hashedPassword = await hashPassword(iden);
        const teacherId = crypto.randomUUID();

        await prisma.$transaction(async (tx) => {
            await tx.user.create({
                data: {
                    id: teacherId,
                    email: email,
                    name: fullName,
                    role: "teacher",
                    emailVerified: true,
                    ...(programId ? {
                        programs: {
                            connect: { id: programId }
                        }
                    } : {}),
                    accounts: {
                        create: {
                            id: crypto.randomUUID(),
                            accountId: crypto.randomUUID(),
                            providerId: "credential",
                            password: hashedPassword,
                        }
                    }
                }
            });

            await tx.profile.create({
                data: {
                    userId: teacherId,
                    identificacion: iden,
                    nombres: nombres,
                    apellido: apellido,
                    telefono: telefono || null,
                    dataProcessingConsent: true,
                    dataProcessingConsentDate: new Date(),
                }
            });
        });

        return {
            success: true,
            teacherName: fullName,
            identificacion: iden,
            email: email,
            action: "created"
        };
    } catch (e: any) {
        console.error(`Error guardando profesor ${fullName}:`, e);
        return {
            success: false,
            teacherName: fullName,
            identificacion: iden,
            email: email,
            error: e.message || "Error al insertar en la base de datos"
        };
    }
}

export async function registerTeachersBulkAction(programId: string | null | undefined, list: TeacherImportRow[]) {
    const session = await requireAdmin();
    if (!list || list.length === 0) throw new Error("La lista de profesores está vacía");

    // Filtrar duplicados dentro del mismo archivo excel e identificar registros incompletos
    const seenIdentificacions = new Set<string>();
    const seenEmails = new Set<string>();
    const uniqueInputList: TeacherImportRow[] = [];
    const skippedErrors: string[] = [];

    for (let index = 0; index < list.length; index++) {
        const item = list[index];
        const rowNum = index + 2; // Asumiendo fila 1 encabezados, 1-based index
        const iden = item.identificacion?.toString().trim();
        const email = item.email?.toString().trim().toLowerCase();

        if (!iden) {
            skippedErrors.push(`Fila ${rowNum}: Omitido por número de identificación faltante.`);
            continue;
        }

        if (!email) {
            skippedErrors.push(`Fila ${rowNum} (Identificación: ${iden}): Omitido por correo electrónico faltante.`);
            continue;
        }

        if (seenIdentificacions.has(iden)) {
            skippedErrors.push(`Fila ${rowNum} (Identificación: ${iden}): Omitido por identificación duplicada dentro del archivo.`);
            continue;
        }

        if (seenEmails.has(email)) {
            skippedErrors.push(`Fila ${rowNum} (Correo: ${email}): Omitido por correo electrónico duplicado dentro del archivo.`);
            continue;
        }

        seenIdentificacions.add(iden);
        seenEmails.add(email);

        uniqueInputList.push({
            identificacion: iden,
            email: email,
            nombres: item.nombres?.toString().trim() || "Profesor",
            apellido: item.apellido?.toString().trim() || "",
            telefono: item.telefono?.toString().trim() || undefined,
        });
    }

    if (uniqueInputList.length === 0) {
        return {
            successCount: 0,
            skippedCount: list.length,
            errors: ["No se encontraron profesores válidos con datos únicos en el archivo.", ...skippedErrors]
        };
    }

    // Verificar colisiones de correos e identificaciones en base de datos
    const emailsToCheck = uniqueInputList.map(u => u.email).filter(Boolean);
    const idensToCheck = uniqueInputList.map(u => u.identificacion).filter(Boolean);

    const existingUsers = await prisma.user.findMany({
        where: { email: { in: emailsToCheck } },
        select: { email: true }
    });
    const existingProfiles = await prisma.profile.findMany({
        where: { identificacion: { in: idensToCheck } },
        select: { identificacion: true }
    });

    const existingEmailsSet = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const existingIdensSet = new Set(existingProfiles.map(p => p.identificacion));

    const finalImportList: TeacherImportRow[] = [];

    for (const teacher of uniqueInputList) {
        let isCollision = false;

        if (existingIdensSet.has(teacher.identificacion)) {
            skippedErrors.push(`Identificación ya registrada en el sistema: ${teacher.identificacion}`);
            isCollision = true;
        }

        if (existingEmailsSet.has(teacher.email)) {
            skippedErrors.push(`Correo ya registrado en el sistema: ${teacher.email}`);
            isCollision = true;
        }

        if (!isCollision) {
            finalImportList.push(teacher);
        }
    }

    if (finalImportList.length === 0) {
        return {
            successCount: 0,
            skippedCount: list.length,
            errors: ["Todos los profesores del archivo ya se encuentran registrados en el sistema.", ...skippedErrors]
        };
    }

    const { hashPassword } = await import("better-auth/crypto");
    let successCount = 0;
    const errors: string[] = [];

    const hashedTeachers = await Promise.all(
        finalImportList.map(async (teacher) => {
            const password = teacher.identificacion;
            const hashedPassword = await hashPassword(password);
            return { teacher, hashedPassword };
        })
    );

    await runInBatches(hashedTeachers, async ({ teacher, hashedPassword }) => {
        try {
            const teacherId = crypto.randomUUID();

            await prisma.$transaction(async (tx) => {
                await tx.user.create({
                    data: {
                        id: teacherId,
                        email: teacher.email,
                        name: `${teacher.nombres} ${teacher.apellido}`.trim(),
                        role: "teacher",
                        emailVerified: true,
                        ...(programId ? {
                            programs: {
                                connect: { id: programId }
                            }
                        } : {}),
                        accounts: {
                            create: {
                                id: crypto.randomUUID(),
                                accountId: crypto.randomUUID(),
                                providerId: "credential",
                                password: hashedPassword,
                            }
                        }
                    }
                });

                await tx.profile.create({
                    data: {
                        userId: teacherId,
                        identificacion: teacher.identificacion,
                        nombres: teacher.nombres,
                        apellido: teacher.apellido,
                        telefono: teacher.telefono || null,
                        dataProcessingConsent: true,
                        dataProcessingConsentDate: new Date(),
                    }
                });
            });
            successCount++;
        } catch (e: any) {
            errors.push(`Error registrando a ${teacher.nombres} ${teacher.apellido}: ${e.message}`);
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "USER",
        entityId: programId || "global",
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: programId 
            ? `Importación masiva de profesores. Registrados con éxito: ${successCount}. Omitidos/Errores: ${list.length - successCount}.`
            : `Importación masiva de profesores al banco global. Registrados con éxito: ${successCount}. Omitidos/Errores: ${list.length - successCount}.`,
        metadata: { programId, successCount, totalInput: list.length },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/gestor/courses");
    if (programId) {
        revalidatePath(`/dashboard/admin/courses?programId=${programId}`);
        revalidatePath(`/dashboard/gestor/courses?programId=${programId}`);
    }

    return {
        successCount,
        skippedCount: list.length - successCount,
        errors: [...skippedErrors, ...errors]
    };
}

export async function updateTeacherAction(data: {
    id: string;
    identificacion: string;
    nombres: string;
    apellido: string;
    email: string;
    telefono?: string;
}) {
    const session = await requireAdmin();

    if (!data.id) throw new Error("ID del profesor es requerido");
    if (!data.identificacion) throw new Error("El número de documento es obligatorio");
    if (!data.nombres) throw new Error("El nombre es obligatorio");
    if (!data.apellido) throw new Error("El apellido es obligatorio");
    if (!data.email) throw new Error("El correo electrónico es obligatorio");

    const emailNorm = data.email.trim().toLowerCase();
    const idenNorm = data.identificacion.trim();

    // Check email unique collision
    const otherUser = await prisma.user.findFirst({
        where: {
            email: emailNorm,
            id: { not: data.id }
        }
    });
    if (otherUser) {
        throw new Error(`Ya existe otro usuario registrado con el correo: ${emailNorm}`);
    }

    // Check identification unique collision
    const otherProfile = await prisma.profile.findFirst({
        where: {
            identificacion: idenNorm,
            userId: { not: data.id }
        }
    });
    if (otherProfile) {
        throw new Error(`Ya existe otro perfil registrado con el número de documento: ${idenNorm}`);
    }

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: data.id },
            data: {
                email: emailNorm,
                name: `${data.nombres.trim()} ${data.apellido.trim()}`,
            }
        });

        await tx.profile.upsert({
            where: { userId: data.id },
            update: {
                identificacion: idenNorm,
                nombres: data.nombres.trim(),
                apellido: data.apellido.trim(),
                telefono: data.telefono?.trim() || null,
            },
            create: {
                userId: data.id,
                identificacion: idenNorm,
                nombres: data.nombres.trim(),
                apellido: data.apellido.trim(),
                telefono: data.telefono?.trim() || null,
                dataProcessingConsent: true,
                dataProcessingConsentDate: new Date(),
            }
        });
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: data.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Profesor actualizado: ${data.nombres} ${data.apellido} (${emailNorm})`,
        metadata: { email: emailNorm, identificacion: idenNorm },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/gestor/courses");
    return { success: true };
}

export async function assignGroupsToTeacherAction(teacherId: string, groupIds: string[]) {
    const session = await requireAdmin();

    await prisma.user.update({
        where: { id: teacherId },
        data: {
            groupsTaught: {
                set: groupIds.map(id => ({ id }))
            }
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: teacherId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Grupos asignados al profesor. Total de grupos: ${groupIds.length}`,
        metadata: { teacherId, groupIds },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return { success: true };
}

export async function getTeacherGroupsAction(teacherId: string) {
    await requireAdminOrObserver();
    const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        select: {
            groupsTaught: {
                select: { id: true, name: true }
            }
        }
    });
    return teacher?.groupsTaught || [];
}

export async function scheduleGroupCourseAction(data: {
    title: string;
    description?: string;
    groupId: string;
    periodId: string;
    teacherId?: string;
    weeklyHours?: number;
    schedules: Array<{
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
    }>;
}) {
    const session = await requireAdmin();

    const draftTeachersCount = await prisma.user.count({
        where: {
            role: "teacher",
            OR: [
                { availabilityLocked: false },
                { qualifiedCoursesLocked: false }
            ]
        }
    });

    if (draftTeachersCount > 0) {
        throw new Error(`No se pueden programar horarios. Hay ${draftTeachersCount} profesor(es) con disponibilidad o materias en borrador.`);
    }

    const conflictsResult = await checkScheduleConflictsAction({
        groupId: data.groupId,
        schedules: data.schedules,
        teacherId: data.teacherId || undefined
    });

    if (conflictsResult.hasHardConflicts) {
        throw new Error(`No es posible programar la clase por colisiones en el horario: ${conflictsResult.conflicts.join(" | ")}`);
    }

    // Resolve description: use provided or fallback to template course description
    let resolvedDescription = data.description ? data.description.trim() : null;
    if (!resolvedDescription && data.periodId) {
        const templateCourse = await prisma.course.findFirst({
            where: {
                groupId: null,
                periodId: data.periodId,
                title: { equals: data.title.trim(), mode: "insensitive" }
            },
            select: { description: true }
        });
        if (templateCourse?.description) {
            resolvedDescription = templateCourse.description;
        }
    }

    const course = await prisma.course.create({
        data: {
            title: data.title,
            description: resolvedDescription,
            groupId: data.groupId,
            periodId: data.periodId,
            teacherId: data.teacherId || null,
            weeklyHours: data.weeklyHours || 0,
            schedules: {
                create: data.schedules.map(s => ({
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                }))
            }
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "COURSE",
        entityId: course.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Asignatura programada para grupo ID: ${data.groupId}`,
        metadata: { courseId: course.id, groupId: data.groupId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/gestor/courses");
    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/student");
    return course;
}

export async function updateGroupCourseScheduleAction(courseId: string, data: {
    title: string;
    description?: string;
    teacherId?: string;
    weeklyHours?: number;
    schedules: Array<{
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
    }>;
}) {
    const session = await requireAdmin();

    const draftTeachersCount = await prisma.user.count({
        where: {
            role: "teacher",
            OR: [
                { availabilityLocked: false },
                { qualifiedCoursesLocked: false }
            ]
        }
    });

    if (draftTeachersCount > 0) {
        throw new Error(`No se pueden actualizar horarios. Hay ${draftTeachersCount} profesor(es) con disponibilidad o materias en borrador.`);
    }

    const currentCourse = await prisma.course.findUnique({
        where: { id: courseId },
        select: { groupId: true, periodId: true }
    });

    if (!currentCourse || !currentCourse.groupId) {
        throw new Error("Clase no encontrada");
    }

    const conflictsResult = await checkScheduleConflictsAction({
        courseId,
        groupId: currentCourse.groupId,
        schedules: data.schedules,
        teacherId: data.teacherId || undefined
    });

    if (conflictsResult.hasHardConflicts) {
        throw new Error(`No es posible actualizar la clase por colisiones en el horario: ${conflictsResult.conflicts.join(" | ")}`);
    }

    let resolvedDescription = data.description !== undefined ? (data.description ? data.description.trim() : null) : undefined;
    if (resolvedDescription === undefined && currentCourse.periodId) {
        const templateCourse = await prisma.course.findFirst({
            where: {
                groupId: null,
                periodId: currentCourse.periodId,
                title: { equals: data.title.trim(), mode: "insensitive" }
            },
            select: { description: true }
        });
        if (templateCourse?.description) {
            resolvedDescription = templateCourse.description;
        }
    }

    await prisma.$transaction(async (tx) => {
        await tx.course.update({
            where: { id: courseId },
            data: {
                title: data.title,
                ...(resolvedDescription !== undefined ? { description: resolvedDescription } : {}),
                teacherId: data.teacherId || null,
                weeklyHours: data.weeklyHours || 0,
            }
        });

        await tx.courseSchedule.deleteMany({
            where: { courseId }
        });

        if (data.schedules.length > 0) {
            await tx.courseSchedule.createMany({
                data: data.schedules.map(s => ({
                    courseId,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime
                }))
            });
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "COURSE",
        entityId: courseId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Programación y horarios actualizados para materia ID: ${courseId}`,
        metadata: { courseId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/gestor/courses");
    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/student");
    return { success: true };
}

export async function deleteGroupCourseAction(courseId: string) {
    const session = await requireAdmin();

    await prisma.course.delete({
        where: { id: courseId }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "COURSE",
        entityId: courseId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Programación de asignatura eliminada: Materia ID ${courseId}`,
        metadata: { courseId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return { success: true };
}

export async function checkScheduleConflictsAction(data: {
    courseId?: string;
    groupId: string;
    teacherId?: string;
    academicScheduleId?: string;
    schedules: Array<{
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
    }>;
}) {
    await requireAdminOrObserver();

    const groupConflicts: string[] = [];
    const DAYS_SPANISH: Record<DayOfWeek, string> = {
        MONDAY: "Lunes",
        TUESDAY: "Martes",
        WEDNESDAY: "Miércoles",
        THURSDAY: "Jueves",
        FRIDAY: "Viernes",
        SATURDAY: "Sábado",
        SUNDAY: "Domingo"
    };

    // 1. Check internal overlaps/duplicates in the input list
    for (let i = 0; i < data.schedules.length; i++) {
        const s1 = data.schedules[i];
        for (let j = i + 1; j < data.schedules.length; j++) {
            const s2 = data.schedules[j];
            if (s1.dayOfWeek === s2.dayOfWeek) {
                const start1 = s1.startTime;
                const end1 = s1.endTime;
                const start2 = s2.startTime;
                const end2 = s2.endTime;

                const overlap = (start1 >= start2 && start1 < end2) ||
                                (end1 > start2 && end1 <= end2) ||
                                (start1 <= start2 && end1 >= end2);
                if (overlap) {
                    const dayLabel = DAYS_SPANISH[s1.dayOfWeek] || s1.dayOfWeek;
                    groupConflicts.push(`Hay un traslape interno en la lista de horarios para el día ${dayLabel}: ${start1}-${end1} y ${start2}-${end2}.`);
                }
            }
        }
    }

    // 2. Check conflicts with other group courses in DB
    for (const slot of data.schedules) {
        const groupConflict = await prisma.course.findFirst({
            where: {
                groupId: data.groupId,
                id: data.courseId ? { not: data.courseId } : undefined,
                schedules: {
                    some: {
                        dayOfWeek: slot.dayOfWeek,
                        OR: [
                            { startTime: { lte: slot.startTime }, endTime: { gt: slot.startTime } },
                            { startTime: { lt: slot.endTime }, endTime: { gte: slot.endTime } },
                            { startTime: { gte: slot.startTime }, endTime: { lte: slot.endTime } }
                        ]
                    }
                }
            },
            select: { title: true }
        });
        if (groupConflict) {
            const dayLabel = DAYS_SPANISH[slot.dayOfWeek] || slot.dayOfWeek;
            groupConflicts.push(`El grupo ya tiene la asignatura "${groupConflict.title}" programada el día ${dayLabel} entre ${slot.startTime} y ${slot.endTime}.`);
        }
    }

    const teacherBusyConflicts: string[] = [];
    const availabilityConflicts: string[] = [];

    if (data.teacherId) {
        // 4. Check if teacher has another course overlapping
        for (const slot of data.schedules) {
            const teacherConflict = await prisma.course.findFirst({
                where: {
                    teacherId: data.teacherId,
                    id: data.courseId ? { not: data.courseId } : undefined,
                    schedules: {
                        some: {
                            dayOfWeek: slot.dayOfWeek,
                            OR: [
                                { startTime: { lte: slot.startTime }, endTime: { gt: slot.startTime } },
                                { startTime: { lt: slot.endTime }, endTime: { gte: slot.endTime } },
                                { startTime: { gte: slot.startTime }, endTime: { lte: slot.endTime } }
                            ]
                        }
                    }
                },
                select: { title: true }
            });
            if (teacherConflict) {
                const dayLabel = DAYS_SPANISH[slot.dayOfWeek] || slot.dayOfWeek;
                teacherBusyConflicts.push(`El profesor ya tiene la asignatura "${teacherConflict.title}" programada el día ${dayLabel} entre ${slot.startTime} y ${slot.endTime}.`);
            }
        }

        // 5. Check if slot is within teacher availability for THIS schedule
        const activeSchedule = data.academicScheduleId 
            ? null 
            : await prisma.academicSchedule.findFirst({ where: { isActive: true }, select: { id: true } });
        const targetSchedId = data.academicScheduleId || activeSchedule?.id || null;

        const teacherAvailabilities = await prisma.teacherAvailability.findMany({
            where: { 
                teacherId: data.teacherId,
                ...(targetSchedId ? { academicScheduleId: targetSchedId } : {})
            }
        });

        if (teacherAvailabilities.length > 0) {
            for (const slot of data.schedules) {
                const dayAvailabilities = teacherAvailabilities.filter(a => a.dayOfWeek === slot.dayOfWeek);
                
                const [schStartH, schStartM] = slot.startTime.split(":").map(Number);
                const [schEndH, schEndM] = slot.endTime.split(":").map(Number);
                const schStartMin = schStartH * 60 + schStartM;
                const schEndMin = schEndH * 60 + schEndM;

                let isCovered = false;
                for (const avail of dayAvailabilities) {
                    const [avStartH, avStartM] = avail.startTime.split(":").map(Number);
                    const [avEndH, avEndM] = avail.endTime.split(":").map(Number);
                    const avStartMin = avStartH * 60 + avStartM;
                    const avEndMin = avEndH * 60 + avEndM;
                    
                    if (schStartMin >= avStartMin && schEndMin <= avEndMin) {
                        isCovered = true;
                        break;
                    }
                }

                if (!isCovered) {
                    const dayLabel = DAYS_SPANISH[slot.dayOfWeek] || slot.dayOfWeek;
                    availabilityConflicts.push(`El profesor no tiene disponibilidad registrada para cubrir el horario del día ${dayLabel} de ${slot.startTime} a ${slot.endTime}.`);
                }
            }
        }
    }

    const conflicts = [...groupConflicts, ...teacherBusyConflicts, ...availabilityConflicts];
    const hasHardConflicts = conflicts.length > 0;

    return {
        hasHardConflicts,
        hasAvailabilityConflicts: availabilityConflicts.length > 0,
        groupConflicts,
        teacherBusyConflicts,
        availabilityConflicts,
        hasConflicts: hasHardConflicts,
        conflicts
    };
}

export async function assignTeacherToCourseAction(courseId: string, teacherId: string | null) {
    const session = await requireAdmin();

    if (teacherId) {
        const currentCourse = await prisma.course.findUnique({
            where: { id: courseId },
            include: { schedules: true }
        });

        if (currentCourse && currentCourse.groupId) {
            const conflictsResult = await checkScheduleConflictsAction({
                courseId,
                groupId: currentCourse.groupId,
                teacherId,
                schedules: currentCourse.schedules.map(s => ({
                    dayOfWeek: s.dayOfWeek as DayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime
                }))
            });

            if (conflictsResult.hasHardConflicts) {
                throw new Error(`No es posible asignar al profesor por cruces de horario o disponibilidad: ${conflictsResult.conflicts.join(" | ")}`);
            }
        }
    }

    const course = await prisma.course.update({
        where: { id: courseId },
        data: {
            teacherId
        },
        include: {
            teacher: {
                select: { name: true }
            }
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "COURSE",
        entityId: courseId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: teacherId
            ? `Profesor "${course.teacher?.name || 'Desconocido'}" asignado a la materia: ${course.title}`
            : `Profesor desasignado de la materia: ${course.title}`,
        metadata: { courseId, teacherId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return course;
}

export async function getQualifiedTeachersAction(programId: string, courseTitle: string) {
    await requireAdminOrObserver();
    const program = await prisma.program.findUnique({
        where: { id: programId },
        select: {
            teachers: {
                where: {
                    role: "teacher",
                    qualifiedCourses: {
                        some: {
                            title: {
                                equals: courseTitle,
                                mode: "insensitive"
                            }
                        }
                    }
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    icon: true,
                    availabilities: {
                        select: {
                            dayOfWeek: true,
                            startTime: true,
                            endTime: true
                        }
                    }
                }
            }
        }
    });

    return program?.teachers || [];
}

export async function updateGroupEnvironmentAction(groupId: string, environmentId: string | null) {
    await requireAdmin();
    const session = await getSession();
    
    // Check if the environment is already assigned to another group
    if (environmentId) {
        const alreadyAssigned = await prisma.group.findFirst({
            where: {
                environmentId,
                id: { not: groupId }
            }
        });
        if (alreadyAssigned) {
            throw new Error(`El ambiente ya está asignado al grupo: ${alreadyAssigned.name}`);
        }
    }

    const group = await prisma.group.update({
        where: { id: groupId },
        data: {
            environmentId: environmentId || null
        },
        include: {
            environment: true
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "GROUP",
        entityId: group.id,
        userId: session!.user.id,
        userName: session!.user.name || "Admin",
        userRole: "admin",
        description: environmentId 
            ? `Ambiente "${group.environment?.name}" asignado al grupo: ${group.name}`
            : `Ambiente desasignado del grupo: ${group.name}`,
        metadata: { groupId, environmentId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return group;
}

export async function importPeriodsAndCoursesAction(programId: string, data: any[]) {
    const session = await requireAdmin();
    if (!programId) throw new Error("El programa es obligatorio");
    if (!data || data.length === 0) throw new Error("Los datos de importación están vacíos");

    let successPeriods = 0;
    let successCourses = 0;

    await Promise.all(
        data.map(async (periodItem) => {
            if (!periodItem.name) return;
            
            // 1. Create period
            const period = await prisma.period.create({
                data: {
                    name: periodItem.name,
                    description: periodItem.description || null,
                    esEspecial: periodItem.esEspecial ?? false,
                    programId: programId,
                }
            });
            successPeriods++;

            // 2. Create courses if any
            if (Array.isArray(periodItem.courses)) {
                await Promise.all(
                    periodItem.courses.map(async (courseItem: any) => {
                        if (!courseItem.title) return;
                        await prisma.course.create({
                            data: {
                                title: courseItem.title,
                                description: courseItem.description || null,
                                externalUrl: courseItem.externalUrl || null,
                                weeklyHours: courseItem.weeklyHours ? parseFloat(courseItem.weeklyHours) : 0,
                                badge: courseItem.badge || null,
                                badgeColor: courseItem.badgeColor || null,
                                periodId: period.id,
                            }
                        });
                        successCourses++;
                    })
                );
            }
        })
    );

    revalidatePath("/dashboard/admin/courses");
    return { success: true, successPeriods, successCourses };
}

export async function importGroupsAndStudentsAction(programId: string, data: any[]) {
    const session = await requireAdmin();
    if (!programId) throw new Error("El programa es obligatorio");
    if (!data || data.length === 0) throw new Error("Los datos de importación están vacíos");

    let successGroups = 0;
    let successStudents = 0;
    const errors: string[] = [];

    // Let's resolve existing periods in this program to map periodName to periodId
    const programPeriods = await prisma.period.findMany({
        where: { programId },
        select: { id: true, name: true }
    });

    const periodMap = new Map(programPeriods.map(p => [p.name.toLowerCase().trim(), p.id]));

    await runInBatches(data, async (groupItem) => {
        if (!groupItem.name) return;

        let periodId = null;
        if (groupItem.periodName) {
            periodId = periodMap.get(groupItem.periodName.toLowerCase().trim()) || null;
        }

        try {
            // Create group
            const group = await prisma.group.create({
                data: {
                    name: groupItem.name,
                    description: groupItem.description || null,
                    categoria: groupItem.categoria || "LECTIVA",
                    programId: programId,
                }
            });
            successGroups++;

            // Create students under this group if any
            if (Array.isArray(groupItem.students) && groupItem.students.length > 0) {
                const studentRows = groupItem.students.map((s: any) => ({
                    identificacion: s.identificacion,
                    email: s.email,
                    nombres: s.nombres || s.name || "Estudiante",
                    apellido: s.apellido || "",
                    telefono: s.telefono,
                }));

                const result = await registerStudentsBulkAction(group.id, studentRows);
                successStudents += result.successCount;
                if (result.errors && result.errors.length > 0) {
                    errors.push(`Grupo ${groupItem.name}: ${result.errors.join(", ")}`);
                }
            }
        } catch (err: any) {
            errors.push(`Error al crear grupo ${groupItem.name}: ${err.message}`);
        }
    }, 3);

    revalidatePath("/dashboard/admin/courses");
    return { success: true, successGroups, successStudents, errors };
}

export async function importSinglePeriodAndCoursesAction(programId: string, periodItem: any) {
    await requireAdmin();
    if (!programId) {
        return { success: false, periodName: periodItem?.name || "Sin nombre", coursesCount: 0, error: "El programa es obligatorio" };
    }
    if (!periodItem || !periodItem.name) {
        return { success: false, periodName: "Periodo sin nombre", coursesCount: 0, error: "El nombre del periodo es obligatorio" };
    }

    try {
        let period = await prisma.period.findFirst({
            where: {
                programId,
                name: { equals: periodItem.name.trim(), mode: "insensitive" }
            }
        });

        if (!period) {
            period = await prisma.period.create({
                data: {
                    name: periodItem.name.trim(),
                    description: periodItem.description || null,
                    esEspecial: periodItem.esEspecial ?? false,
                    programId: programId,
                }
            });
        }

        let coursesCreated = 0;
        if (Array.isArray(periodItem.courses)) {
            for (const courseItem of periodItem.courses) {
                if (!courseItem.title) continue;
                const existingCourse = await prisma.course.findFirst({
                    where: {
                        periodId: period.id,
                        title: { equals: courseItem.title.trim(), mode: "insensitive" },
                        groupId: null
                    }
                });

                if (!existingCourse) {
                    await prisma.course.create({
                        data: {
                            title: courseItem.title.trim(),
                            description: courseItem.description || null,
                            externalUrl: courseItem.externalUrl || null,
                            weeklyHours: courseItem.weeklyHours ? parseFloat(courseItem.weeklyHours) : 0,
                            badge: courseItem.badge || null,
                            badgeColor: courseItem.badgeColor || null,
                            periodId: period.id,
                        }
                    });
                    coursesCreated++;
                }
            }
        }

        return {
            success: true,
            periodName: period.name,
            coursesCount: coursesCreated
        };
    } catch (err: any) {
        console.error(`Error importando periodo ${periodItem.name}:`, err);
        return {
            success: false,
            periodName: periodItem.name,
            coursesCount: 0,
            error: err.message || "Error al registrar el periodo"
        };
    }
}

export async function createOrGetGroupForImportAction(programId: string, groupItem: any) {
    await requireAdmin();
    if (!programId) {
        return { success: false, groupName: groupItem?.name || "Sin nombre", error: "El programa es obligatorio" };
    }
    if (!groupItem || !groupItem.name) {
        return { success: false, groupName: "Grupo sin nombre", error: "El nombre del grupo es obligatorio" };
    }

    try {
        let periodId = null;
        if (groupItem.periodName) {
            const period = await prisma.period.findFirst({
                where: {
                    programId,
                    name: { equals: groupItem.periodName.trim(), mode: "insensitive" }
                }
            });
            if (period) periodId = period.id;
        }

        let group = await prisma.group.findFirst({
            where: {
                programId,
                name: { equals: groupItem.name.trim(), mode: "insensitive" }
            }
        });

        if (!group) {
            group = await prisma.group.create({
                data: {
                    name: groupItem.name.trim(),
                    description: groupItem.description || null,
                    categoria: groupItem.categoria || "LECTIVA",
                    programId: programId,
                }
            });
        }

        return {
            success: true,
            groupId: group.id,
            groupName: group.name,
        };
    } catch (err: any) {
        console.error(`Error creando/obteniendo grupo ${groupItem.name}:`, err);
        return {
            success: false,
            groupName: groupItem.name,
            error: err.message || "Error al procesar grupo"
        };
    }
}

export async function importSingleGroupAndStudentsAction(programId: string, groupItem: any) {
    await requireAdmin();
    if (!programId) {
        return { success: false, groupName: groupItem?.name || "Sin nombre", studentsCount: 0, error: "El programa es obligatorio" };
    }
    if (!groupItem || !groupItem.name) {
        return { success: false, groupName: "Grupo sin nombre", studentsCount: 0, error: "El nombre del grupo es obligatorio" };
    }

    try {
        let periodId = null;
        if (groupItem.periodName) {
            const period = await prisma.period.findFirst({
                where: {
                    programId,
                    name: { equals: groupItem.periodName.trim(), mode: "insensitive" }
                }
            });
            if (period) periodId = period.id;
        }

        let group = await prisma.group.findFirst({
            where: {
                programId,
                name: { equals: groupItem.name.trim(), mode: "insensitive" }
            }
        });

        if (!group) {
            group = await prisma.group.create({
                data: {
                    name: groupItem.name.trim(),
                    description: groupItem.description || null,
                    categoria: groupItem.categoria || "LECTIVA",
                    programId: programId,
                }
            });
        }

        let studentsCount = 0;
        const failedStudents: string[] = [];

        if (Array.isArray(groupItem.students)) {
            for (const s of groupItem.students) {
                if (!s) continue;
                const studentRes = await registerSingleStudentAction(group.id, {
                    identificacion: s.identificacion,
                    email: s.email,
                    nombres: s.nombres || s.name || "Estudiante",
                    apellido: s.apellido || "",
                    telefono: s.telefono,
                });
                if (studentRes.success) {
                    studentsCount++;
                } else {
                    failedStudents.push(`${studentRes.studentName} (${studentRes.identificacion}): ${studentRes.error}`);
                }
            }
        }

        return {
            success: true,
            groupName: group.name,
            studentsCount,
            failedStudents
        };
    } catch (err: any) {
        console.error(`Error importando grupo ${groupItem.name}:`, err);
        return {
            success: false,
            groupName: groupItem.name,
            studentsCount: 0,
            error: err.message || "Error al registrar el grupo"
        };
    }
}

export async function importSingleEnvironmentAction(programId: string | null | undefined, envItem: any) {
    await requireAdmin();
    if (!envItem || !envItem.name) {
        return { success: false, envName: "Ambiente sin nombre", error: "El nombre del ambiente es obligatorio" };
    }

    try {
        let env = await prisma.trainingEnvironment.findFirst({
            where: {
                name: { equals: envItem.name.trim(), mode: "insensitive" },
                ...(programId ? { programId } : {})
            }
        });

        if (!env) {
            env = await prisma.trainingEnvironment.create({
                data: {
                    name: envItem.name.trim(),
                    capacity: Number(envItem.capacity) || 30,
                    location: envItem.location || null,
                    resources: Array.isArray(envItem.resources) ? envItem.resources : [],
                    description: envItem.description || null,
                    isActive: envItem.isActive ?? true,
                    programId: programId || null,
                }
            });
        }

        return {
            success: true,
            envName: env.name
        };
    } catch (err: any) {
        console.error(`Error importando ambiente ${envItem.name}:`, err);
        return {
            success: false,
            envName: envItem.name,
            error: err.message || "Error al registrar el ambiente"
        };
    }
}

