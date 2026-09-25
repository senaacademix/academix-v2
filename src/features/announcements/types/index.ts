export type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AnnouncementCategory = "General" | "Institucional" | "Académico" | "Urgente" | "Eventos";

export interface AnnouncementAuthor {
    id: string;
    name: string;
    role: string | null;
    image?: string | null;
}

export interface AnnouncementItem {
    id: string;
    title: string;
    content: string;
    excerpt: string | null;
    category: string;
    coverImage: string | null;
    status: string; // "DRAFT" | "PUBLISHED" | "ARCHIVED"
    publishedAt: Date | string | null;
    expiresAt: Date | string | null;
    isPinned: boolean;
    authorId: string;
    author: AnnouncementAuthor;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface CreateAnnouncementInput {
    title: string;
    content: string;
    excerpt?: string;
    category?: string;
    coverImage?: string;
    status: AnnouncementStatus;
    publishedAt?: string | null; // ISO string
    expiresAt?: string | null; // ISO string
    isPinned?: boolean;
}

export interface UpdateAnnouncementInput extends Partial<CreateAnnouncementInput> {
    id?: string;
}
