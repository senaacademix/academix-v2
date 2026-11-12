"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { standoutService } from "../services/standoutService";
import {
    StandoutProcessDTO,
    StandoutNominationDTO,
    TrainingAreaGroupDTO,
    CreateStandoutProcessInput,
    UpdateStandoutProcessInput,
    CreateStandoutNominationInput,
    UpdateStandoutNominationInput
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

export async function getStandoutProcessesAction(programId?: string): Promise<StandoutProcessDTO[]> {
    const { role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin" && role !== "teacher") {
        throw new Error("No autorizado.");
    }
    return await standoutService.getProcesses({ programId });
}

export async function createStandoutProcessAction(input: CreateStandoutProcessInput) {
    const { user, role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin") {
        throw new Error("Solo el Gestor Académico o el Administrador pueden crear convocatorias de aprendices destacados.");
    }

    const process = await standoutService.createProcess(user.id, input);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true, process };
}

export async function updateStandoutProcessAction(processId: string, input: UpdateStandoutProcessInput) {
    const { role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin") {
        throw new Error("Solo el Gestor Académico o el Administrador pueden modificar convocatorias.");
    }

    const process = await standoutService.updateProcess(processId, input);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true, process };
}

export async function deleteStandoutProcessAction(processId: string) {
    const { role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin") {
        throw new Error("Solo el Gestor Académico o el Administrador pueden eliminar convocatorias.");
    }

    await standoutService.deleteProcess(processId);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true };
}

export async function getAllStandoutNominationsAction(filters?: {
    programId?: string;
    processId?: string;
    groupId?: string;
    category?: string;
    search?: string;
}): Promise<StandoutNominationDTO[]> {
    const { role } = await getAuthSession();
    if (role !== "gestor" && role !== "admin" && role !== "teacher") {
        throw new Error("No autorizado.");
    }
    return await standoutService.getAllNominations(filters);
}

export async function getTeacherStandoutAreaGroupsAction(programId?: string): Promise<{
    programs: { id: string; name: string }[];
    groups: TrainingAreaGroupDTO[];
}> {
    const { user } = await getAuthSession();
    return await standoutService.getTeacherTrainingAreaGroups(user.id, programId);
}

export async function getTeacherStandoutNominationsAction(filters?: {
    processId?: string;
    groupId?: string;
    programId?: string;
}): Promise<StandoutNominationDTO[]> {
    const { user } = await getAuthSession();
    return await standoutService.getTeacherNominations(user.id, filters);
}

export async function createStandoutNominationAction(input: CreateStandoutNominationInput) {
    const { user, role } = await getAuthSession();
    if (role !== "teacher" && role !== "gestor" && role !== "admin") {
        throw new Error("No tienes permisos para postular aprendices destacados.");
    }

    const nomination = await standoutService.createNomination(user.id, input);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true, nomination };
}

export async function updateStandoutNominationAction(nominationId: string, input: UpdateStandoutNominationInput) {
    const { user, role } = await getAuthSession();
    const isGestorOrAdmin = role === "gestor" || role === "admin";

    const nomination = await standoutService.updateNomination(nominationId, user.id, input, isGestorOrAdmin);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true, nomination };
}

export async function deleteStandoutNominationAction(nominationId: string) {
    const { user, role } = await getAuthSession();
    const isGestorOrAdmin = role === "gestor" || role === "admin";

    await standoutService.deleteNomination(nominationId, user.id, isGestorOrAdmin);

    revalidatePath("/dashboard/gestor/tools");
    revalidatePath("/dashboard/teacher/tools");

    return { success: true };
}

