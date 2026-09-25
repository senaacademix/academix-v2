"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { announcementService } from "../services/announcementService";
import { CreateAnnouncementInput, UpdateAnnouncementInput } from "../types";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

function revalidateAllDashboardPaths() {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/gestor");
    revalidatePath("/dashboard/student");
    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/admin/announcements");
}

/**
 * Consulta de anuncios activos y vigentes para cualquier rol en su panel de inicio.
 */
export async function getActiveAnnouncementsAction() {
    try {
        const session = await getSession();
        if (!session?.user) {
            return [];
        }
        return await announcementService.getActiveAnnouncements();
    } catch (error) {
        console.error("Error al obtener anuncios activos:", error);
        return [];
    }
}

/**
 * Consulta de todos los anuncios (incluye borradores y programados) para administración.
 */
export async function getAllAnnouncementsForAdminAction() {
    const session = await getSession();
    if (!session?.user || session.user.role !== "admin") {
        throw new Error("No autorizado. Solo los administradores pueden gestionar anuncios.");
    }
    return await announcementService.getAllAnnouncementsForAdmin();
}

/**
 * Creación de un nuevo comunicado / anuncio por parte del administrador.
 */
export async function createAnnouncementAction(input: CreateAnnouncementInput) {
    const session = await getSession();
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "No autorizado. Solo los administradores pueden crear anuncios." };
    }

    if (!input.title || !input.title.trim()) {
        return { success: false, error: "El título del anuncio es obligatorio." };
    }

    if (!input.content || !input.content.trim()) {
        return { success: false, error: "El contenido del anuncio no puede estar vacío." };
    }

    try {
        const announcement = await announcementService.createAnnouncement(input, session.user.id);
        revalidateAllDashboardPaths();
        return { success: true, announcement };
    } catch (error: any) {
        console.error("Error al crear anuncio:", error);
        return { success: false, error: error?.message || "Ocurrió un error al crear el anuncio." };
    }
}

/**
 * Edición de un anuncio existente.
 */
export async function updateAnnouncementAction(id: string, input: UpdateAnnouncementInput) {
    const session = await getSession();
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "No autorizado." };
    }

    if (input.title !== undefined && !input.title.trim()) {
        return { success: false, error: "El título no puede estar vacío." };
    }

    if (input.content !== undefined && !input.content.trim()) {
        return { success: false, error: "El contenido no puede estar vacío." };
    }

    try {
        const updated = await announcementService.updateAnnouncement(id, input);
        revalidateAllDashboardPaths();
        return { success: true, announcement: updated };
    } catch (error: any) {
        console.error("Error al actualizar anuncio:", error);
        return { success: false, error: error?.message || "Ocurrió un error al actualizar el anuncio." };
    }
}

/**
 * Eliminación de un anuncio.
 */
export async function deleteAnnouncementAction(id: string) {
    const session = await getSession();
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "No autorizado." };
    }

    try {
        await announcementService.deleteAnnouncement(id);
        revalidateAllDashboardPaths();
        return { success: true };
    } catch (error: any) {
        console.error("Error al eliminar anuncio:", error);
        return { success: false, error: error?.message || "Ocurrió un error al eliminar el anuncio." };
    }
}

/**
 * Alternar fijado (pin) de un anuncio.
 */
export async function togglePinAnnouncementAction(id: string) {
    const session = await getSession();
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "No autorizado." };
    }

    try {
        const updated = await announcementService.togglePinAnnouncement(id);
        revalidateAllDashboardPaths();
        return { success: true, isPinned: updated.isPinned };
    } catch (error: any) {
        console.error("Error al alternar pin del anuncio:", error);
        return { success: false, error: error?.message || "Ocurrió un error." };
    }
}
