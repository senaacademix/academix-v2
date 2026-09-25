import prisma from "@/lib/prisma";
import { CreateAnnouncementInput, UpdateAnnouncementInput, AnnouncementItem } from "../types";

export const announcementService = {
    /**
     * Obtiene los anuncios públicos activos y vigentes para mostrar en el panel de inicio
     * de cualquier rol.
     * Solo devuelve anuncios en estado 'PUBLISHED', cuya fecha de publicación ya haya llegado
     * (o sea inmediata) y que no hayan expirado.
     */
    async getActiveAnnouncements(): Promise<AnnouncementItem[]> {
        const now = new Date();

        const announcements = await prisma.announcement.findMany({
            where: {
                status: "PUBLISHED",
                OR: [
                    { publishedAt: null },
                    { publishedAt: { lte: now } }
                ],
                AND: [
                    {
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: now } }
                        ]
                    }
                ]
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        image: true
                    }
                }
            },
            orderBy: [
                { isPinned: "desc" },
                { publishedAt: "desc" },
                { createdAt: "desc" }
            ],
            take: 20
        });

        return announcements as unknown as AnnouncementItem[];
    },

    /**
     * Obtiene todos los anuncios del sistema para el panel del administrador
     * (Borradores, Programados, Publicados y Archivados).
     */
    async getAllAnnouncementsForAdmin(): Promise<AnnouncementItem[]> {
        const announcements = await prisma.announcement.findMany({
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        image: true
                    }
                }
            },
            orderBy: [
                { isPinned: "desc" },
                { createdAt: "desc" }
            ]
        });

        return announcements as unknown as AnnouncementItem[];
    },

    /**
     * Obtiene un anuncio por su ID.
     */
    async getAnnouncementById(id: string): Promise<AnnouncementItem | null> {
        const announcement = await prisma.announcement.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        image: true
                    }
                }
            }
        });

        return announcement as unknown as AnnouncementItem | null;
    },

    /**
     * Crea un nuevo anuncio en la base de datos.
     */
    async createAnnouncement(input: CreateAnnouncementInput, authorId: string) {
        let publishedAt: Date | null = null;
        if (input.status === "PUBLISHED") {
            publishedAt = input.publishedAt ? new Date(input.publishedAt) : new Date();
        }

        const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

        // Auto-generar extracto si no fue provisto
        let excerpt = input.excerpt?.trim();
        if (!excerpt && input.content) {
            // Quitar imágenes (incluyendo URLs con paréntesis como (1).jpg) y markdown para extracto
            const plain = input.content
                .replace(/!\[[^\]]*\]\((?:[^()]+|\([^()]*\))*\)/g, '')
                .replace(/#+\s+/g, '')
                .replace(/\[([^\]]+)\]\((?:[^()]+|\([^()]*\))*\)/g, '$1')
                .replace(/[*_`~>]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            excerpt = plain.slice(0, 180) + (plain.length > 180 ? '...' : '');
        }

        return await prisma.announcement.create({
            data: {
                title: input.title.trim(),
                content: input.content.trim(),
                excerpt: excerpt || null,
                category: input.category || "General",
                coverImage: input.coverImage?.trim() || null,
                status: input.status,
                publishedAt,
                expiresAt,
                isPinned: Boolean(input.isPinned),
                authorId
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        image: true
                    }
                }
            }
        });
    },

    /**
     * Actualiza un anuncio existente.
     */
    async updateAnnouncement(id: string, input: UpdateAnnouncementInput) {
        let publishedAtUpdate = undefined;
        if (input.status !== undefined) {
            if (input.status === "PUBLISHED") {
                publishedAtUpdate = input.publishedAt ? new Date(input.publishedAt) : new Date();
            } else if (input.status === "DRAFT") {
                publishedAtUpdate = null;
            }
        } else if (input.publishedAt !== undefined) {
            publishedAtUpdate = input.publishedAt ? new Date(input.publishedAt) : null;
        }

        let expiresAtUpdate = undefined;
        if (input.expiresAt !== undefined) {
            expiresAtUpdate = input.expiresAt ? new Date(input.expiresAt) : null;
        }

        let excerptUpdate = input.excerpt;
        if (input.content && !excerptUpdate) {
            const plain = input.content
                .replace(/!\[[^\]]*\]\((?:[^()]+|\([^()]*\))*\)/g, '')
                .replace(/#+\s+/g, '')
                .replace(/\[([^\]]+)\]\((?:[^()]+|\([^()]*\))*\)/g, '$1')
                .replace(/[*_`~>]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            excerptUpdate = plain.slice(0, 180) + (plain.length > 180 ? '...' : '');
        }

        return await prisma.announcement.update({
            where: { id },
            data: {
                ...(input.title !== undefined && { title: input.title.trim() }),
                ...(input.content !== undefined && { content: input.content.trim() }),
                ...(excerptUpdate !== undefined && { excerpt: excerptUpdate.trim() || null }),
                ...(input.category !== undefined && { category: input.category }),
                ...(input.coverImage !== undefined && { coverImage: input.coverImage?.trim() || null }),
                ...(input.status !== undefined && { status: input.status }),
                ...(publishedAtUpdate !== undefined && { publishedAt: publishedAtUpdate }),
                ...(expiresAtUpdate !== undefined && { expiresAt: expiresAtUpdate }),
                ...(input.isPinned !== undefined && { isPinned: Boolean(input.isPinned) })
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        image: true
                    }
                }
            }
        });
    },

    /**
     * Elimina un anuncio por su ID.
     */
    async deleteAnnouncement(id: string) {
        return await prisma.announcement.delete({
            where: { id }
        });
    },

    /**
     * Alterna el estado de fijado (isPinned).
     */
    async togglePinAnnouncement(id: string) {
        const item = await prisma.announcement.findUnique({
            where: { id },
            select: { isPinned: true }
        });

        if (!item) {
            throw new Error("El anuncio no fue encontrado.");
        }

        return await prisma.announcement.update({
            where: { id },
            data: { isPinned: !item.isPinned }
        });
    }
};
