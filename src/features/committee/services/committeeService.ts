import prisma from "@/lib/prisma";
import {
    CommitteeProcessDTO,
    CommitteeReportDTO,
    TrainingAreaGroupDTO,
    CreateCommitteeProcessInput,
    UpdateCommitteeProcessInput,
    CreateCommitteeReportInput,
    UpdateCommitteeReportInput,
    CommitteeEmailTemplateDTO,
    CreateCommitteeEmailTemplateInput,
    UpdateCommitteeEmailTemplateInput
} from "../types";
import { parseInputDate, checkProcessDiligenceWindow } from "../utils/dateUtils";

export class CommitteeService {
    /**
     * Obtiene los procesos de comité con conteos de reportes y aprendices únicos
     */
    async getProcesses(filters?: { programId?: string }): Promise<CommitteeProcessDTO[]> {
        const where: any = {};
        if (filters?.programId && filters.programId !== "all" && filters.programId !== "none") {
            where.programId = filters.programId;
        }

        const processes = await prisma.committeeProcess.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                program: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                reports: {
                    select: {
                        id: true,
                        studentId: true
                    }
                }
            }
        });

        return processes.map((p: any) => {
            const uniqueStudents = new Set(p.reports.map((r: any) => r.studentId));
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
                reportsCount: p.reports.length,
                uniqueStudentsCount: uniqueStudents.size
            };
        });
    }

    /**
     * Obtiene un proceso específico por ID con sus reportes
     */
    async getProcessById(processId: string): Promise<CommitteeProcessDTO | null> {
        const process = await prisma.committeeProcess.findUnique({
            where: { id: processId },
            include: {
                program: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                reports: {
                    select: {
                        id: true,
                        studentId: true
                    }
                }
            }
        });

        if (!process) return null;

        const uniqueStudents = new Set(process.reports.map((r: any) => r.studentId));

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
            reportsCount: process.reports.length,
            uniqueStudentsCount: uniqueStudents.size
        };
    }

    /**
     * Crea un nuevo proceso de comité
     */
    async createProcess(userId: string, input: CreateCommitteeProcessInput): Promise<CommitteeProcessDTO> {
        if (!input.title || input.title.trim().length === 0) {
            throw new Error("El título del proceso es obligatorio.");
        }

        if (!input.programId || input.programId === "all" || input.programId === "none") {
            throw new Error("Debes seleccionar un área de formación para crear el proceso de comité.");
        }

        const process = await prisma.committeeProcess.create({
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
                createdBy: { select: { id: true, name: true, email: true } },
                reports: true
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
            reportsCount: 0,
            uniqueStudentsCount: 0
        };
    }

    /**
     * Actualiza un proceso de comité existente
     */
    async updateProcess(processId: string, input: UpdateCommitteeProcessInput): Promise<CommitteeProcessDTO> {
        const updateData: any = {};
        if (input.title !== undefined) updateData.title = input.title.trim();
        if (input.description !== undefined) updateData.description = input.description?.trim() || null;
        if (input.status !== undefined) updateData.status = input.status;
        if (input.programId !== undefined) {
            updateData.programId = input.programId && input.programId !== "all" && input.programId !== "none" ? input.programId : null;
        }
        if (input.startDate !== undefined) updateData.startDate = parseInputDate(input.startDate);
        if (input.endDate !== undefined) updateData.endDate = parseInputDate(input.endDate);

        const process = await prisma.committeeProcess.update({
            where: { id: processId },
            data: updateData,
            include: {
                program: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                reports: { select: { id: true, studentId: true } }
            }
        });

        const uniqueStudents = new Set(process.reports.map((r: any) => r.studentId));

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
            reportsCount: process.reports.length,
            uniqueStudentsCount: uniqueStudents.size
        };
    }

    /**
     * Elimina un proceso de comité
     */
    async deleteProcess(processId: string): Promise<boolean> {
        await prisma.committeeProcess.delete({
            where: { id: processId }
        });
        return true;
    }

    /**
     * Obtiene la totalidad de aprendices reportados con filtros exhaustivos (para Gestor y Admin)
     */
    async getAllReportedStudents(filters?: {
        programId?: string;
        processId?: string;
        groupId?: string;
        faultType?: string;
        search?: string;
    }): Promise<CommitteeReportDTO[]> {
        const where: any = {};

        if (filters?.processId && filters.processId !== "all") {
            where.processId = filters.processId;
        }

        if (filters?.groupId && filters.groupId !== "all") {
            where.groupId = filters.groupId;
        }

        if (filters?.faultType && filters.faultType !== "all") {
            where.faultType = filters.faultType;
        }

        if (filters?.programId && filters.programId !== "all" && filters.programId !== "none") {
            where.process = { programId: filters.programId };
        }

        if (filters?.search && filters.search.trim().length > 0) {
            const term = filters.search.trim();
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { student: { name: { contains: term, mode: "insensitive" } } },
                        { student: { email: { contains: term, mode: "insensitive" } } },
                        { student: { profile: { identificacion: { contains: term, mode: "insensitive" } } } },
                        { group: { name: { contains: term, mode: "insensitive" } } },
                        { reportedBy: { name: { contains: term, mode: "insensitive" } } },
                        { reason: { contains: term, mode: "insensitive" } }
                    ]
                }
            ];
        }

        const reports = await prisma.committeeReport.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                process: { select: { id: true, title: true, status: true, startDate: true, endDate: true } },
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: {
                            select: {
                                identificacion: true,
                                telefono: true
                            }
                        }
                    }
                },
                group: {
                    select: {
                        id: true,
                        name: true,
                        program: { select: { id: true, name: true } }
                    }
                },
                reportedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        return reports.map((r: any) => ({
            id: r.id,
            processId: r.processId,
            processTitle: r.process.title,
            processStatus: r.process.status,
            processStartDate: r.process.startDate ? r.process.startDate.toISOString() : null,
            processEndDate: r.process.endDate ? r.process.endDate.toISOString() : null,
            studentId: r.studentId,
            studentName: r.student.name,
            studentEmail: r.student.email,
            studentDocument: r.student.profile?.identificacion || null,
            studentImage: r.student.image || null,
            studentPhone: r.student.profile?.telefono || null,
            groupId: r.groupId,
            groupName: r.group.name,
            programId: r.group.program?.id || null,
            programName: r.group.program?.name || null,
            reportedById: r.reportedById,
            reportedByName: r.reportedBy.name,
            reportedByEmail: r.reportedBy.email,
            evidenceUrl: r.evidenceUrl,
            faultType: r.faultType,
            reason: r.reason,
            observations: r.observations,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString()
        }));
    }

    /**
     * Obtiene todas las fichas o grupos del área de formación del instructor,
     * INDEPENDIENTEMENTE de si están asignados a su horario actual.
     */
    async getTeacherTrainingAreaGroups(teacherId: string, specificProgramId?: string): Promise<{
        programs: { id: string; name: string }[];
        groups: TrainingAreaGroupDTO[];
    }> {
        let programIds: string[] = [];

        if (specificProgramId && specificProgramId !== "all" && specificProgramId !== "none") {
            programIds = [specificProgramId];
        } else {
            // Identificar los programas / áreas de formación con las que el profesor está vinculado
            const teacher = await prisma.user.findUnique({
                where: { id: teacherId },
                select: {
                    programs: { select: { id: true, name: true } },
                    managedPrograms: { select: { id: true, name: true } },
                    groupsTaught: { select: { programId: true } },
                    coursesTaught: {
                        select: {
                            group: { select: { programId: true } },
                            period: { select: { programId: true } }
                        }
                    }
                }
            });

            const foundIds = new Set<string>();

            if (teacher?.programs) {
                teacher.programs.forEach((p: any) => foundIds.add(p.id));
            }
            if (teacher?.managedPrograms) {
                teacher.managedPrograms.forEach((p: any) => foundIds.add(p.id));
            }
            if (teacher?.groupsTaught) {
                teacher.groupsTaught.forEach((g: any) => {
                    if (g.programId) foundIds.add(g.programId);
                });
            }
            if (teacher?.coursesTaught) {
                teacher.coursesTaught.forEach((c: any) => {
                    if (c.group?.programId) foundIds.add(c.group.programId);
                    if (c.period?.programId) foundIds.add(c.period.programId);
                });
            }

            // Si no tiene programas explícitamente vinculados, traer todos los programas del sistema
            if (foundIds.size === 0) {
                const allPrograms = await prisma.program.findMany({
                    select: { id: true, name: true }
                });
                allPrograms.forEach((p: any) => foundIds.add(p.id));
            }

            programIds = Array.from(foundIds);
        }

        // Obtener programas asociados
        const programsList = await prisma.program.findMany({
            where: { id: { in: programIds } },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        });

        // Obtener TODAS las fichas o grupos de dichas áreas de formación
        const groups = await prisma.group.findMany({
            where: { programId: { in: programIds } },
            orderBy: { name: "asc" },
            include: {
                program: { select: { id: true, name: true } },
                students: {
                    where: { banned: { not: true } },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: {
                            select: {
                                identificacion: true,
                                telefono: true
                            }
                        }
                    },
                    orderBy: { name: "asc" }
                }
            }
        });

        const formattedGroups: TrainingAreaGroupDTO[] = groups.map((g: any) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            programId: g.programId,
            programName: g.program?.name || "Área de Formación",
            studentsCount: g.students.length,
            students: g.students.map((s: any) => ({
                id: s.id,
                name: s.name,
                email: s.email,
                image: s.image,
                identificacion: s.profile?.identificacion || null,
                telefono: s.profile?.telefono || null
            }))
        }));

        return {
            programs: programsList,
            groups: formattedGroups
        };
    }

    /**
     * Obtiene los reportes creados por un instructor específico
     */
    async getTeacherReports(teacherId: string, filters?: { processId?: string; groupId?: string; programId?: string }): Promise<CommitteeReportDTO[]> {
        const where: any = {
            reportedById: teacherId
        };

        if (filters?.programId && filters.programId !== "all" && filters.programId !== "none") {
            where.process = { programId: filters.programId };
            where.group = { programId: filters.programId };
        }

        if (filters?.processId && filters.processId !== "all") {
            where.processId = filters.processId;
        }

        if (filters?.groupId && filters.groupId !== "all") {
            where.groupId = filters.groupId;
        }

        const reports = await prisma.committeeReport.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                process: { select: { id: true, title: true, status: true, startDate: true, endDate: true } },
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: {
                            select: {
                                identificacion: true,
                                telefono: true
                            }
                        }
                    }
                },
                group: {
                    select: {
                        id: true,
                        name: true,
                        program: { select: { id: true, name: true } }
                    }
                },
                reportedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        return reports.map((r: any) => ({
            id: r.id,
            processId: r.processId,
            processTitle: r.process.title,
            processStatus: r.process.status,
            processStartDate: r.process.startDate ? r.process.startDate.toISOString() : null,
            processEndDate: r.process.endDate ? r.process.endDate.toISOString() : null,
            studentId: r.studentId,
            studentName: r.student.name,
            studentEmail: r.student.email,
            studentDocument: r.student.profile?.identificacion || null,
            studentImage: r.student.image || null,
            studentPhone: r.student.profile?.telefono || null,
            groupId: r.groupId,
            groupName: r.group.name,
            programId: r.group.program?.id || null,
            programName: r.group.program?.name || null,
            reportedById: r.reportedById,
            reportedByName: r.reportedBy.name,
            reportedByEmail: r.reportedBy.email,
            evidenceUrl: r.evidenceUrl,
            faultType: r.faultType,
            reason: r.reason,
            observations: r.observations,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString()
        }));
    }

    /**
     * Crea un reporte de aprendiz para un proceso de comité
     */
    async createReport(teacherId: string, input: CreateCommitteeReportInput): Promise<CommitteeReportDTO> {
        if (!input.processId) throw new Error("Debe seleccionar un proceso de comité.");
        if (!input.studentId) throw new Error("Debe seleccionar un aprendiz.");
        if (!input.groupId) throw new Error("Debe seleccionar la ficha o grupo.");
        if (!input.reason || input.reason.trim().length === 0) {
            throw new Error("El motivo o causal del reporte es obligatorio.");
        }

        // Validar formato de URL si fue proporcionada
        let cleanEvidenceUrl: string | null = null;
        if (input.evidenceUrl && input.evidenceUrl.trim().length > 0) {
            try {
                const parsed = new URL(input.evidenceUrl.trim());
                if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                    throw new Error();
                }
                cleanEvidenceUrl = input.evidenceUrl.trim();
            } catch {
                throw new Error("El enlace de evidencias debe ser una URL válida (ej: https://drive.google.com/...).");
            }
        }

        // Validar que el proceso y la ficha pertenezcan a la misma área y el proceso esté abierto
        const [process, group] = await Promise.all([
            prisma.committeeProcess.findUnique({ where: { id: input.processId } }),
            prisma.group.findUnique({ where: { id: input.groupId } })
        ]);

        if (!process) {
            throw new Error("El proceso de comité no existe.");
        }

        if (!group) {
            throw new Error("La ficha o grupo no existe.");
        }

        // Validar ventana de diligenciamiento del proceso
        const diligence = checkProcessDiligenceWindow(process);
        if (!diligence.canEdit) {
            throw new Error(`No es posible registrar el reporte: ${diligence.message}`);
        }

        if (process.programId && group.programId && process.programId !== group.programId) {
            throw new Error("La ficha seleccionada no pertenece al área de formación de este proceso de comité.");
        }

        const report = await prisma.committeeReport.create({
            data: {
                processId: input.processId,
                studentId: input.studentId,
                groupId: input.groupId,
                reportedById: teacherId,
                evidenceUrl: cleanEvidenceUrl,
                faultType: input.faultType || "ACADEMICO",
                reason: input.reason.trim(),
                observations: input.observations?.trim() || null,
                status: "REPORTADO"
            },
            include: {
                process: { select: { id: true, title: true, status: true, startDate: true, endDate: true } },
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
                        program: { select: { id: true, name: true } }
                    }
                },
                reportedBy: { select: { id: true, name: true, email: true } }
            }
        });

        return {
            id: report.id,
            processId: report.processId,
            processTitle: report.process.title,
            processStatus: report.process.status,
            processStartDate: report.process.startDate ? report.process.startDate.toISOString() : null,
            processEndDate: report.process.endDate ? report.process.endDate.toISOString() : null,
            studentId: report.studentId,
            studentName: report.student.name,
            studentEmail: report.student.email,
            studentDocument: report.student.profile?.identificacion || null,
            studentImage: report.student.image || null,
            studentPhone: report.student.profile?.telefono || null,
            groupId: report.groupId,
            groupName: report.group.name,
            programId: report.group.program?.id || null,
            programName: report.group.program?.name || null,
            reportedById: report.reportedById,
            reportedByName: report.reportedBy.name,
            reportedByEmail: report.reportedBy.email,
            evidenceUrl: report.evidenceUrl,
            faultType: report.faultType,
            reason: report.reason,
            observations: report.observations,
            status: report.status,
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString()
        };
    }

    /**
     * Actualiza un reporte existente (por el instructor creador o el gestor)
     */
    async updateReport(
        reportId: string,
        userId: string,
        input: UpdateCommitteeReportInput,
        isGestorOrAdmin: boolean
    ): Promise<CommitteeReportDTO> {
        const existing = await prisma.committeeReport.findUnique({
            where: { id: reportId },
            include: { process: true }
        });

        if (!existing) {
            throw new Error("El reporte no fue encontrado.");
        }

        if (!isGestorOrAdmin && existing.reportedById !== userId) {
            throw new Error("No tienes permisos para editar este reporte.");
        }

        // Si es instructor, validar que el proceso esté dentro de la fecha de diligenciamiento
        if (!isGestorOrAdmin) {
            const diligence = checkProcessDiligenceWindow(existing.process);
            if (!diligence.canEdit) {
                throw new Error(`No es posible modificar este reporte: ${diligence.message}`);
            }
        }

        const updateData: any = {};

        if (input.evidenceUrl !== undefined) {
            if (input.evidenceUrl && input.evidenceUrl.trim().length > 0) {
                try {
                    const parsed = new URL(input.evidenceUrl.trim());
                    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                        throw new Error();
                    }
                } catch {
                    throw new Error("El enlace de evidencias debe ser una URL válida.");
                }
                updateData.evidenceUrl = input.evidenceUrl.trim();
            } else {
                updateData.evidenceUrl = null;
            }
        }

        if (input.faultType !== undefined) {
            updateData.faultType = input.faultType;
        }

        if (input.reason !== undefined) {
            if (!input.reason || input.reason.trim().length === 0) {
                throw new Error("El motivo o causal del reporte es obligatorio.");
            }
            updateData.reason = input.reason.trim();
        }

        if (input.observations !== undefined) {
            updateData.observations = input.observations?.trim() || null;
        }

        if (input.status !== undefined && isGestorOrAdmin) {
            updateData.status = input.status;
        }

        const report = await prisma.committeeReport.update({
            where: { id: reportId },
            data: updateData,
            include: {
                process: { select: { id: true, title: true, status: true, startDate: true, endDate: true } },
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
                        program: { select: { id: true, name: true } }
                    }
                },
                reportedBy: { select: { id: true, name: true, email: true } }
            }
        });

        return {
            id: report.id,
            processId: report.processId,
            processTitle: report.process.title,
            processStatus: report.process.status,
            processStartDate: report.process.startDate ? report.process.startDate.toISOString() : null,
            processEndDate: report.process.endDate ? report.process.endDate.toISOString() : null,
            studentId: report.studentId,
            studentName: report.student.name,
            studentEmail: report.student.email,
            studentDocument: report.student.profile?.identificacion || null,
            studentImage: report.student.image || null,
            studentPhone: report.student.profile?.telefono || null,
            groupId: report.groupId,
            groupName: report.group.name,
            programId: report.group.program?.id || null,
            programName: report.group.program?.name || null,
            reportedById: report.reportedById,
            reportedByName: report.reportedBy.name,
            reportedByEmail: report.reportedBy.email,
            evidenceUrl: report.evidenceUrl,
            faultType: report.faultType,
            reason: report.reason,
            observations: report.observations,
            status: report.status,
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString()
        };
    }

    /**
     * Elimina un reporte (por el instructor creador o el gestor)
     */
    async deleteReport(reportId: string, userId: string, isGestorOrAdmin: boolean): Promise<boolean> {
        const existing = await prisma.committeeReport.findUnique({
            where: { id: reportId },
            include: { process: true }
        });

        if (!existing) {
            throw new Error("El reporte no fue encontrado.");
        }

        if (!isGestorOrAdmin && existing.reportedById !== userId) {
            throw new Error("No tienes permisos para eliminar este reporte.");
        }

        // Si es instructor, validar que el proceso esté dentro de la fecha de diligenciamiento
        if (!isGestorOrAdmin) {
            const diligence = checkProcessDiligenceWindow(existing.process);
            if (!diligence.canEdit) {
                throw new Error(`No es posible eliminar este reporte: ${diligence.message}`);
            }
        }

        await prisma.committeeReport.delete({
            where: { id: reportId }
        });

        return true;
    }

    /**
     * Obtiene las plantillas de correo de comités guardadas en la base de datos
     */
    async getEmailTemplates(filters?: { programId?: string }): Promise<CommitteeEmailTemplateDTO[]> {
        const where: any = {};
        if (filters?.programId && filters.programId !== "all" && filters.programId !== "none") {
            where.OR = [
                { programId: null },
                { programId: filters.programId }
            ];
        }

        let templates = await prisma.committeeEmailTemplate.findMany({
            where,
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            include: {
                program: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } }
            }
        });

        // Si no existen plantillas aún en la base de datos, crear las plantillas por defecto
        if (templates.length === 0) {
            await this.seedDefaultTemplates(filters?.programId);
            templates = await prisma.committeeEmailTemplate.findMany({
                where,
                orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
                include: {
                    program: { select: { id: true, name: true } },
                    createdBy: { select: { id: true, name: true, email: true } }
                }
            });
        }

        return templates.map((t) => ({
            id: t.id,
            title: t.title,
            subject: t.subject,
            body: t.body,
            isDefault: t.isDefault,
            programId: t.programId,
            programName: t.program?.name || null,
            createdById: t.createdById,
            createdByName: t.createdBy?.name || null,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString()
        }));
    }

    /**
     * Siembra las plantillas base oficiales para comités de evaluación
     */
    async seedDefaultTemplates(programId?: string) {
        const count = await prisma.committeeEmailTemplate.count();
        if (count > 0) return;

        const effectiveProgramId = programId && programId !== "all" && programId !== "none" ? programId : null;

        await prisma.committeeEmailTemplate.createMany({
            data: [
                {
                    title: "Citación Oficial a Descargos (Predeterminada)",
                    subject: "Citación a Comité de Evaluación y Seguimiento - {{proceso}}",
                    body: `Estimado(a) aprendiz {{aprendiz}},

Por medio de la presente comunicación oficial del Centro de Formación (SENA), se le notifica que ha sido convocado(a) a comparecer ante el Comité de Evaluación y Seguimiento en el marco del proceso:

• Convocatoria / Proceso: {{proceso}}
• Ficha / Grupo: {{ficha}}
• Causal / Falta reportada: {{causal}}
• Motivo del reporte: {{motivo}}

Se le solicita estar atento(a) a las instrucciones del Gestor Académico e instructores sobre la fecha, hora y modalidad de la sesión para la presentación formal de sus descargos y análisis del caso.

Le recordamos que tiene derecho a allegar las evidencias o soportes que considere pertinentes para su defensa.

Atentamente,
Gestor Académico
SENA - Academix`,
                    isDefault: true,
                    programId: effectiveProgramId
                },
                {
                    title: "Recordatorio Urgente de Comparecencia",
                    subject: "RECORDATORIO: Citación a Comité de Evaluación - {{proceso}}",
                    body: `Estimado(a) aprendiz {{aprendiz}},

Nos comunicamos con carácter prioritario para recordarle la importancia de su asistencia a la sesión del Comité de Evaluación y Seguimiento:

• Convocatoria: {{proceso}}
• Ficha: {{ficha}}
• Causal: {{causal}}

Es indispensable su participación para garantizar el debido proceso y la formulación de compromisos o descargos correspondientes.

Atentamente,
Comité de Evaluación y Seguimiento
SENA - Academix`,
                    isDefault: false,
                    programId: effectiveProgramId
                },
                {
                    title: "Notificación Preventiva de Rendimiento / Asistencia",
                    subject: "Notificación Preventiva de Novedad Académica - {{ficha}}",
                    body: `Apreciado(a) aprendiz {{aprendiz}},

Le informamos que se ha registrado una novedad académica o de asistencia en su proceso formativo:
• Ficha / Grupo: {{ficha}}
• Causal: {{causal}}
• Detalle reportado: {{motivo}}

Le invitamos a comunicarse a la mayor brevedad con su equipo ejecutor para analizar alternativas de nivelación previas a la decisión del Comité.

Cordialmente,
Gestoría Académica
SENA - Academix`,
                    isDefault: false,
                    programId: effectiveProgramId
                }
            ]
        });
    }

    /**
     * Crea una nueva plantilla de correo
     */
    async createEmailTemplate(
        userId: string,
        input: CreateCommitteeEmailTemplateInput
    ): Promise<CommitteeEmailTemplateDTO> {
        if (!input.title?.trim()) {
            throw new Error("El título de la plantilla es obligatorio.");
        }
        if (!input.subject?.trim()) {
            throw new Error("El asunto del correo es obligatorio.");
        }
        if (!input.body?.trim()) {
            throw new Error("El cuerpo del correo es obligatorio.");
        }

        const effectiveProgramId = input.programId && input.programId !== "all" && input.programId !== "none"
            ? input.programId
            : null;

        // Si se marca como predeterminada, desmarcar las demás
        if (input.isDefault) {
            await prisma.committeeEmailTemplate.updateMany({
                where: {
                    OR: [
                        { programId: null },
                        { programId: effectiveProgramId }
                    ]
                },
                data: { isDefault: false }
            });
        }

        const template = await prisma.committeeEmailTemplate.create({
            data: {
                title: input.title.trim(),
                subject: input.subject.trim(),
                body: input.body.trim(),
                isDefault: Boolean(input.isDefault),
                programId: effectiveProgramId,
                createdById: userId
            },
            include: {
                program: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } }
            }
        });

        return {
            id: template.id,
            title: template.title,
            subject: template.subject,
            body: template.body,
            isDefault: template.isDefault,
            programId: template.programId,
            programName: template.program?.name || null,
            createdById: template.createdById,
            createdByName: template.createdBy?.name || null,
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString()
        };
    }

    /**
     * Actualiza una plantilla de correo existente
     */
    async updateEmailTemplate(
        id: string,
        input: UpdateCommitteeEmailTemplateInput
    ): Promise<CommitteeEmailTemplateDTO> {
        const existing = await prisma.committeeEmailTemplate.findUnique({
            where: { id }
        });

        if (!existing) {
            throw new Error("La plantilla no fue encontrada.");
        }

        if (input.isDefault) {
            await prisma.committeeEmailTemplate.updateMany({
                where: {
                    id: { not: id },
                    OR: [
                        { programId: null },
                        { programId: existing.programId }
                    ]
                },
                data: { isDefault: false }
            });
        }

        const template = await prisma.committeeEmailTemplate.update({
            where: { id },
            data: {
                ...(input.title !== undefined && { title: input.title.trim() }),
                ...(input.subject !== undefined && { subject: input.subject.trim() }),
                ...(input.body !== undefined && { body: input.body.trim() }),
                ...(input.isDefault !== undefined && { isDefault: Boolean(input.isDefault) }),
                ...(input.programId !== undefined && {
                    programId: input.programId && input.programId !== "all" && input.programId !== "none"
                        ? input.programId
                        : null
                })
            },
            include: {
                program: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } }
            }
        });

        return {
            id: template.id,
            title: template.title,
            subject: template.subject,
            body: template.body,
            isDefault: template.isDefault,
            programId: template.programId,
            programName: template.program?.name || null,
            createdById: template.createdById,
            createdByName: template.createdBy?.name || null,
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString()
        };
    }

    /**
     * Elimina una plantilla de correo
     */
    async deleteEmailTemplate(id: string): Promise<boolean> {
        await prisma.committeeEmailTemplate.delete({
            where: { id }
        });
        return true;
    }
}

export const committeeService = new CommitteeService();
