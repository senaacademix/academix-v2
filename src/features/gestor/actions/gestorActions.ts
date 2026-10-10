"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { gestorService } from "../services/gestorService";
import prisma from "@/lib/prisma";

export async function requireGestor() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || (session.user.role !== "gestor" && session.user.role !== "admin" && session.user.role !== "observer")) {
        throw new Error("Acceso no autorizado. Se requiere perfil de Gestor Académico, Administrador u Observador.");
    }

    return session;
}

export async function getGestorDashboardStatsAction() {
    const session = await requireGestor();
    return await gestorService.getDashboardStats(session.user.id);
}

export async function getGestorRecentActivityAction(limit: number = 10, programId?: string) {
    const session = await requireGestor();
    return await gestorService.getRecentActivity(session.user.id, limit, programId);
}

export async function getGestorProgramsAction() {
    const session = await requireGestor();
    return await gestorService.getManagedPrograms(session.user.id);
}

export async function getGestorGroupsAction(programId?: string) {
    const session = await requireGestor();
    
    const where: any = {};

    if (session.user.role === "gestor") {
        where.program = {
            gestores: {
                some: { id: session.user.id }
            }
        };
    } else if (session.user.role === "observer") {
        where.OR = [
            { program: { observers: { some: { id: session.user.id } } } },
            { observers: { some: { id: session.user.id } } }
        ];
    }

    if (programId && programId !== "all" && programId !== "ALL") {
        where.programId = programId;
    }

    return prisma.group.findMany({
        where,
        select: {
            id: true,
            name: true,
            description: true,
            programId: true,
            categoria: true,
            program: {
                select: { id: true, name: true }
            },
            environment: {
                select: { id: true, name: true }
            },
            _count: {
                select: { students: true, courses: true }
            }
        },
        orderBy: [
            { program: { name: "asc" } },
            { name: "asc" }
        ]
    });
}
