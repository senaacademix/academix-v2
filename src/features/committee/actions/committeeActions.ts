"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { committeeService } from "../services/committeeService";
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

async function getAuthSession() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        throw new Error("No autenticado. Por favor inicia sesión.");
    }
    const user = session.user as any;
    const role = Array.isArray(user?.roles) ? user?.roles[0] : (user?.role || "student");
    return { session, user: session.user, role };
}

export async function getProcessesAction(programId?: string): Promise<CommitteeProcessDTO[]> {
    const { role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin" && role !== "teacher") {
        throw new Error("No autorizado.");
    }
    return await committeeService.getProcesses({ programId });
}

export async function getProcessByIdAction(processId: string): Promise<CommitteeProcessDTO | null> {
    await getAuthSession();
    return await committeeService.getProcessById(processId);
}

export async function createProcessAction(input: CreateCommitteeProcessInput) {
    const { user, role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin") {
        throw new Error("Solo el Gestor Académico o el Administrador pueden crear procesos de comité.");
    }

    const process = await committeeService.createProcess(user.id, input);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true, process };
}

export async function updateProcessAction(processId: string, input: UpdateCommitteeProcessInput) {
    const { role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin") {
        throw new Error("Solo el Gestor Académico o el Administrador pueden modificar procesos de comité.");
    }

    const process = await committeeService.updateProcess(processId, input);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true, process };
}

export async function deleteProcessAction(processId: string) {
    const { role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin") {
        throw new Error("Solo el Gestor Académico o el Administrador pueden eliminar procesos de comité.");
    }

    await committeeService.deleteProcess(processId);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true };
}

export async function getAllReportedStudentsAction(filters?: {
    programId?: string;
    processId?: string;
    groupId?: string;
    faultType?: string;
    search?: string;
}): Promise<CommitteeReportDTO[]> {
    const { role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin" && role !== "teacher") {
        throw new Error("No autorizado.");
    }
    return await committeeService.getAllReportedStudents(filters);
}

export async function getTeacherTrainingAreaGroupsAction(programId?: string): Promise<{
    programs: { id: string; name: string }[];
    groups: TrainingAreaGroupDTO[];
}> {
    const { user } = await getAuthSession();
    return await committeeService.getTeacherTrainingAreaGroups(user.id, programId);
}

export async function getTeacherReportsAction(filters?: {
    processId?: string;
    groupId?: string;
    programId?: string;
}): Promise<CommitteeReportDTO[]> {
    const { user } = await getAuthSession();
    return await committeeService.getTeacherReports(user.id, filters);
}

export async function createReportAction(input: CreateCommitteeReportInput) {
    const { user, role } = await getAuthSession();
    if (role !== "teacher" && role !== "gestor" && role !== "admin") {
        throw new Error("No tienes permisos para reportar aprendices a comité.");
    }

    const report = await committeeService.createReport(user.id, input);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true, report };
}

export async function updateReportAction(reportId: string, input: UpdateCommitteeReportInput) {
    const { user, role } = await getAuthSession();
    const isGestorOrAdmin = role === "gestor" || role === "admin";

    const report = await committeeService.updateReport(reportId, user.id, input, isGestorOrAdmin);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true, report };
}

export async function deleteReportAction(reportId: string) {
    const { user, role } = await getAuthSession();
    const isGestorOrAdmin = role === "gestor" || role === "admin";

    await committeeService.deleteReport(reportId, user.id, isGestorOrAdmin);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true };
}

export async function getEmailTemplatesAction(programId?: string): Promise<CommitteeEmailTemplateDTO[]> {
    await getAuthSession();
    return await committeeService.getEmailTemplates({ programId });
}

export async function createEmailTemplateAction(input: CreateCommitteeEmailTemplateInput) {
    const { user, role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin") {
        throw new Error("Solo el Gestor Académico o el Administrador pueden crear plantillas de correo.");
    }

    const template = await committeeService.createEmailTemplate(user.id, input);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true, template };
}

export async function updateEmailTemplateAction(id: string, input: UpdateCommitteeEmailTemplateInput) {
    const { role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin") {
        throw new Error("Solo el Gestor Académico o el Administrador pueden editar plantillas de correo.");
    }

    const template = await committeeService.updateEmailTemplate(id, input);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true, template };
}

export async function deleteEmailTemplateAction(id: string) {
    const { role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin") {
        throw new Error("Solo el Gestor Académico o el Administrador pueden eliminar plantillas de correo.");
    }

    await committeeService.deleteEmailTemplate(id);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true };
}

