"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnnouncementItem } from "../types";
import { MarkdownViewer } from "./MarkdownViewer";
import { formatColombianDateTime } from "@/lib/dateUtils";
import { Calendar, User, Pin, Clock, Share2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

interface AnnouncementDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    announcement: AnnouncementItem | null;
}

const CATEGORY_STYLES: Record<string, string> = {
    Urgente: "bg-destructive/10 text-destructive border-destructive/20",
    Institucional: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
    Académico: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    Eventos: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
    General: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
};

export function AnnouncementDetailDialog({
    open,
    onOpenChange,
    announcement
}: AnnouncementDetailDialogProps) {
    if (!announcement) return null;

    const categoryBadgeClass = CATEGORY_STYLES[announcement.category] || CATEGORY_STYLES.General;
    const pubDate = announcement.publishedAt || announcement.createdAt;

    const handleCopyShare = () => {
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(`${window.location.origin}/dashboard?announcementId=${announcement.id}`);
            toast.success("Enlace copiado al portapapeles.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl sm:max-w-5xl lg:max-w-6xl w-[95vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden border-border/80 shadow-2xl">
                {/* Header estilizado */}
                <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-card/60 backdrop-blur-md space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs font-semibold ${categoryBadgeClass}`}>
                                {announcement.category}
                            </Badge>

                            {announcement.isPinned && (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold gap-1">
                                    <Pin className="w-3 h-3 fill-amber-500" />
                                    Destacado
                                </Badge>
                            )}
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span>{formatColombianDateTime(pubDate)}</span>
                        </div>
                    </div>

                    <DialogTitle className="text-xl sm:text-2xl font-extrabold text-foreground leading-snug">
                        {announcement.title}
                    </DialogTitle>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/40">
                        <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-primary" />
                            <span>Publicado por <strong>{announcement.author?.name || "Administración"}</strong></span>
                        </span>
                        <span>•</span>
                        <span>Canal Oficial AcademiX</span>
                    </div>
                </DialogHeader>

                {/* Contenido en Markdown con scroll */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
                    <MarkdownViewer source={announcement.content} />
                </div>

                {/* Footer */}
                <DialogFooter className="p-4 px-6 border-t border-border/60 bg-muted/10 flex items-center justify-between sm:justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyShare}
                        className="text-xs text-muted-foreground gap-1.5"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Compartir</span>
                    </Button>

                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-xs"
                    >
                        Cerrar Lectura
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
