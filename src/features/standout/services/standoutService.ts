import prisma from "@/lib/prisma";
import {
    StandoutProcessDTO,
    StandoutNominationDTO,
    CreateStandoutProcessInput,
    UpdateStandoutProcessInput,
    CreateStandoutNominationInput,
    UpdateStandoutNominationInput
} from "../types";
import { parseInputDate, checkProcessDiligenceWindow } from "@/features/committee/utils/dateUtils";
import { committeeService, resolveLatestGroupSchedule } from "@/features/committee/services/committeeService";

export class StandoutService {
    async getProcesses(filters?: { programId?: string }): Promise<StandoutProcessDTO[]> {
        const where: any = {};
        if (filters?.programId && filters.programId !== "all" && filters.programId !== "none") {
            where.programId = filters.programId;
        }

        const processes = await prisma.standoutProcess.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                program: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                nominations: {
                    select: {
                        id: true,
                        studentId: true
                    }
                }
            }
        });

        return processes.map((p: any) => {
            const uniqueStudents = new Set(p.nominations.map((n: any) => n.studentId));
            return {
                id: p.id,
                title: p.title,
                description: p.description,
                status: p.status,
                startDate: p.startDate ? p.startDate.toISOString() : null,
                endDate: p.endDate ? p.endDate.toISOString() : null,
                programId: p.programId,
                programName: p.program?.name || "Todas las áreas",
                createdById: p.createdById,
                createdByName: p.createdBy.name,
                createdByEmail: p.createdBy.email,
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString(),
                nominationsCount: p.nominations.length,
                uniqueStudentsCount: uniqueStudents.size
            };
        });
    }

    async createProcess(userId: string, input: CreateStandoutProcessInput): Promise<StandoutProcessDTO> {
        if (!input.title || input.title.trim().length === 0) {
            throw new Error("El título de la convocatoria es obligatorio.");
        }

        if (!input.programId || input.programId === "all" || input.programId === "none") {
            throw new Error("Debes seleccionar un área de formación para crear el proceso.");
        }

        const process = await prisma.standoutProcess.create({
            data: {
                title: input.title.trim(),
                description: input.description?.trim() || null,
                programId: input.programId,
                startDate: parseInputDate(input.startDate),
                endDate: parseInputDate(input.endDate),
                createdById: userId,
                status: "OPEN"
            },
            include: {
                program: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } }
            }
        });

        return {
            id: process.id,
            title: process.title,
            description: process.description,
            status: process.status,
            startDate: process.startDate ? process.startDate.toISOString() : null,
            endDate: process.endDate ? process.endDate.toISOString() : null,
            programId: process.programId,
            programName: process.program?.name || "Todas las áreas",
            createdById: process.createdById,
            createdByName: process.createdBy.name,
            createdByEmail: process.createdBy.email,
            createdAt: process.createdAt.toISOString(),
            updatedAt: process.updatedAt.toISOString(),
            nominationsCount: 0,
            uniqueStudentsCount: 0
        };
    }

    async updateProcess(processId: string, input: UpdateStandoutProcessInput): Promise<StandoutProcessDTO> {
        const updateData: any = {};
        if (input.title !== undefined) updateData.title = input.title.trim();
        if (input.description !== undefined) updateData.description = input.description?.trim() || null;
        if (input.status !== undefined) updateData.status = input.status;
        if (input.programId !== undefined) {
            updateData.programId = input.programId && input.programId !== "all" && input.programId !== "none" ? input.programId : null;
        }
        if (input.startDate !== undefined) updateData.startDate = parseInputDate(input.startDate);
        if (input.endDate !== undefined) updateData.endDate = parseInputDate(input.endDate);

        const process = await prisma.standoutProcess.update({
            where: { id: processId },
            data: updateData,
            include: {
                program: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                nominations: { select: { id: true, studentId: true } }
            }
        });

        const uniqueStudents = new Set(process.nominations.map((n: any) => n.studentId));

        return {
            id: process.id,
            title: process.title,
            description: process.description,
            status: process.status,
            startDate: process.startDate ? process.startDate.toISOString() : null,
            endDate: process.endDate ? process.endDate.toISOString() : null,
            programId: process.programId,
            programName: process.program?.name || "Todas las áreas",
            createdById: process.createdById,
            createdByName: process.createdBy.name,
            createdByEmail: process.createdBy.email,
            createdAt: process.createdAt.toISOString(),
            updatedAt: process.updatedAt.toISOString(),
            nominationsCount: process.nominations.length,
            uniqueStudentsCount: uniqueStudents.size
        };
    }

    async deleteProcess(processId: string): Promise<void> {
        await prisma.standoutProcess.delete({
            where: { id: processId }
        });
    }

    private mapNominationToDTO(n: any): StandoutNominationDTO {
        const latestSchedule = resolveLatestGroupSchedule(n.group) || n.groupSchedule || null;
        return {
            id: n.id,
            processId: n.processId,
            processTitle: n.process.title,
            processStatus: n.process.status,
            processStartDate: n.process.startDate ? n.process.startDate.toISOString() : null,
            processEndDate: n.process.endDate ? n.process.endDate.toISOString() : null,
            studentId: n.studentId,
            studentName: n.student.name,
            studentEmail: n.student.email,
            studentDocument: n.student.profile?.identificacion || null,
            studentImage: n.student.image || null,
            studentPhone: n.student.profile?.telefono || null,
            groupId: n.groupId,
            groupName: n.group.name,
            programId: n.group.program?.id || null,
            programName: n.group.program?.name || null,
            nominatedById: n.nominatedById,
            nominatedByName: n.nominatedBy.name,
            nominatedByEmail: n.nominatedBy.email,
            evidenceUrl: n.evidenceUrl,
            category: n.category,
            customCategory: n.customCategory || null,
            groupSchedule: latestSchedule,
            subject: n.subject || null,
            recognitionDecision: n.recognitionDecision || null,
            reason: n.reason,
            achievements: n.achievements || null,
            createdAt: n.createdAt.toISOString(),
            updatedAt: n.updatedAt.toISOString()
        };
    }

    async getAllNominations(filters?: {
        programId?: string;
        processId?: string;
        groupId?: string;
        category?: string;
        search?: string;
    }): Promise<StandoutNominationDTO[]> {
        const where: any = {};

        if (filters?.processId && filters.processId !== "all") {
            where.processId = filters.processId;
        }
        if (filters?.groupId && filters.groupId !== "all") {
            where.groupId = filters.groupId;
        }
        if (filters?.category && filters.category !== "all") {
            where.category = filters.category;
        }
        if (filters?.programId && filters.programId !== "all" && filters.programId !== "none") {
            where.OR = [
                { process: { programId: filters.programId } },
                { group: { programId: filters.programId } }
            ];
        }

        const nominations = await prisma.standoutNomination.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                process: {
                    select: { id: true, title: true, status: true, startDate: true, endDate: true, programId: true }
                },
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: { select: { identificacion: true, telefono: true } }
                    }
                },
                group: {
                    select: {
                        id: true,
                        name: true,
                        program: { select: { id: true, name: true } },
                        scheduleSlots: {
                            include: {
                                academicSchedule: { select: { id: true, isActive: true, startDate: true } }
                            }
                        },
                        courses: {
                            select: {
                                id: true,
                                title: true,
                                schedules: { select: { dayOfWeek: true, startTime: true, endTime: true } }
                            }
                        }
                    }
                },
                nominatedBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        return nominations.map((n: any) => this.mapNominationToDTO(n));
    }

    async getTeacherNominations(teacherId: string, filters?: {
        processId?: string;
        groupId?: string;
        programId?: string;
    }): Promise<StandoutNominationDTO[]> {
        const where: any = {
            nominatedById: teacherId
        };

        if (filters?.processId && filters.processId !== "all") {
            where.processId = filters.processId;
        }
        if (filters?.groupId && filters.groupId !== "all") {
            where.groupId = filters.groupId;
        }
        if (filters?.programId && filters.programId !== "all" && filters.programId !== "none") {
            where.OR = [
                { process: { programId: filters.programId } },
                { group: { programId: filters.programId } }
            ];
        }

        const nominations = await prisma.standoutNomination.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                process: {
                    select: { id: true, title: true, status: true, startDate: true, endDate: true, programId: true }
                },
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: { select: { identificacion: true, telefono: true } }
                    }
                },
                group: {
                    select: {
                        id: true,
                        name: true,
                        program: { select: { id: true, name: true } },
                        scheduleSlots: {
                            include: {
                                academicSchedule: { select: { id: true, isActive: true, startDate: true } }
                            }
                        },
                        courses: {
                            select: {
                                id: true,
                                title: true,
                                schedules: { select: { dayOfWeek: true, startTime: true, endTime: true } }
                            }
                        }
                    }
                },
                nominatedBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        return nominations.map((n: any) => this.mapNominationToDTO(n));
    }

    async createNomination(teacherId: string, input: CreateStandoutNominationInput): Promise<StandoutNominationDTO> {
        if (!input.processId) throw new Error("Debes seleccionar un proceso de postulación.");
        if (!input.studentId) throw new Error("Debes seleccionar un aprendiz a postular.");
        if (!input.groupId) throw new Error("Debes seleccionar la ficha del aprendiz.");

        const process = await prisma.standoutProcess.findUnique({
            where: { id: input.processId }
        });
        if (!process) throw new Error("El proceso seleccionado no existe.");

        const windowCheck = checkProcessDiligenceWindow({
            status: process.status,
            startDate: process.startDate,
            endDate: process.endDate
        });
        if (!windowCheck.canEdit) {
            throw new Error(windowCheck.message || "Este proceso se encuentra cerrado para nuevas postulaciones.");
        }

        const groupData = await prisma.group.findUnique({
            where: { id: input.groupId },
            include: {
                scheduleSlots: {
                    include: {
                        academicSchedule: { select: { id: true, isActive: true, startDate: true } }
                    }
                },
                courses: {
                    select: {
                        id: true,
                        title: true,
                        schedules: { select: { dayOfWeek: true, startTime: true, endTime: true } }
                    }
                }
            }
        });

        const groupSchedule = input.groupSchedule || resolveLatestGroupSchedule(groupData) || null;

        const created = await prisma.standoutNomination.create({
            data: {
                processId: input.processId,
                studentId: input.studentId,
                groupId: input.groupId,
                nominatedById: teacherId,
                category: input.category,
                customCategory: input.category === "OTRO" ? (input.customCategory?.trim() || null) : null,
                evidenceUrl: input.evidenceUrl?.trim() || null,
                groupSchedule,
                subject: input.subject?.trim() || null,
                reason: input.reason?.trim() || "",
                achievements: input.achievements?.trim() || null
            },
            include: {
                process: {
                    select: { id: true, title: true, status: true, startDate: true, endDate: true, programId: true }
                },
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: { select: { identificacion: true, telefono: true } }
                    }
                },
                group: {
                    select: {
                        id: true,
                        name: true,
                        program: { select: { id: true, name: true } },
                        scheduleSlots: {
                            include: {
                                academicSchedule: { select: { id: true, isActive: true, startDate: true } }
                            }
                        },
                        courses: {
                            select: {
                                id: true,
                                title: true,
                                schedules: { select: { dayOfWeek: true, startTime: true, endTime: true } }
                            }
                        }
                    }
                },
                nominatedBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        return this.mapNominationToDTO(created);
    }

    async updateNomination(
        nominationId: string,
        userId: string,
        input: UpdateStandoutNominationInput,
        isGestorOrAdmin: boolean
    ): Promise<StandoutNominationDTO> {
        const existing = await prisma.standoutNomination.findUnique({
            where: { id: nominationId },
            include: { process: true }
        });
        if (!existing) throw new Error("La postulación no existe.");

        if (!isGestorOrAdmin && existing.nominatedById !== userId) {
            throw new Error("Solo puedes editar tus propias postulaciones.");
        }

        const updateData: any = {};
        if (input.category !== undefined) {
            updateData.category = input.category;
            updateData.customCategory = input.category === "OTRO" ? (input.customCategory?.trim() || null) : null;
        }
        if (input.evidenceUrl !== undefined) updateData.evidenceUrl = input.evidenceUrl?.trim() || null;
        if (input.reason !== undefined) updateData.reason = input.reason.trim();
        if (input.achievements !== undefined) updateData.achievements = input.achievements?.trim() || null;
        if (input.recognitionDecision !== undefined && isGestorOrAdmin) {
            updateData.recognitionDecision = input.recognitionDecision;
        }

        const updated = await prisma.standoutNomination.update({
            where: { id: nominationId },
            data: updateData,
            include: {
                process: {
                    select: { id: true, title: true, status: true, startDate: true, endDate: true, programId: true }
                },
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: { select: { identificacion: true, telefono: true } }
                    }
                },
                group: {
                    select: {
                        id: true,
                        name: true,
                        program: { select: { id: true, name: true } },
                        scheduleSlots: {
                            include: {
                                academicSchedule: { select: { id: true, isActive: true, startDate: true } }
                            }
                        },
                        courses: {
                            select: {
                                id: true,
                                title: true,
                                schedules: { select: { dayOfWeek: true, startTime: true, endTime: true } }
                            }
                        }
                    }
                },
                nominatedBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        return this.mapNominationToDTO(updated);
    }

    async deleteNomination(nominationId: string, userId: string, isGestorOrAdmin: boolean): Promise<void> {
        const existing = await prisma.standoutNomination.findUnique({
            where: { id: nominationId }
        });
        if (!existing) throw new Error("La postulación no existe.");

        if (!isGestorOrAdmin && existing.nominatedById !== userId) {
            throw new Error("Solo puedes eliminar tus propias postulaciones.");
        }

        await prisma.standoutNomination.delete({
            where: { id: nominationId }
        });
    }

    async getTeacherTrainingAreaGroups(userId: string, programId?: string) {
        return await committeeService.getTeacherTrainingAreaGroups(userId, programId);
    }
}

export const standoutService = new StandoutService();

