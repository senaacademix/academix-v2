"use client";

import React, { useState, useEffect } from "react";
import { AnnouncementItem } from "../types";
import { MarkdownViewer } from "./MarkdownViewer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatColombianDateTime } from "@/lib/dateUtils";
import {
    Megaphone,
    Pin,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    User,
    Share2,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface AnnouncementFeedWidgetProps {
    announcements: AnnouncementItem[];
    className?: string;
}

const CATEGORY_STYLES: Record<string, string> = {
    Urgente: "bg-destructive/10 text-destructive border-destructive/20",
    Institucional: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
    Académico: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    Eventos: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
    General: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
};

export function AnnouncementFeedWidget({ announcements = [], className = "" }: AnnouncementFeedWidgetProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [copied, setCopied] = useState(false);
    const searchParams = useSearchParams();

    // Sincronizar índice si viene parámetro ?announcementId=...
    useEffect(() => {
        const idFromUrl = searchParams.get("announcementId");
        if (idFromUrl && announcements.length > 0) {
            const idx = announcements.findIndex((a) => a.id === idFromUrl);
            if (idx !== -1) {
                setSelectedIndex(idx);
            }
        }
    }, [searchParams, announcements]);

    if (!announcements || announcements.length === 0) {
        return null;
    }

    const currentAnnouncement = announcements[selectedIndex] || announcements[0];
    const categoryClass = CATEGORY_STYLES[currentAnnouncement.category] || CATEGORY_STYLES.General;
    const pubDate = currentAnnouncement.publishedAt || currentAnnouncement.createdAt;

    const handlePrev = () => {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : announcements.length - 1));
    };

    const handleNext = () => {
        setSelectedIndex((prev) => (prev < announcements.length - 1 ? prev + 1 : 0));
    };

    const handleCopyLink = () => {
        if (typeof window !== "undefined") {
            const url = `${window.location.origin}/dashboard?announcementId=${currentAnnouncement.id}`;
            navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success("Enlace del comunicado copiado al portapapeles.");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <section className={cn("space-y-4", className)}>
            {/* Encabezado y Navegador entre Comunicados */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold backdrop-blur-md">
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>Canal Oficial de Comunicados</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                        Noticias y Circulares Institucionales
                    </h2>
                </div>

                {/* Controles de paginación si hay más de 1 comunicado */}
                {announcements.length > 1 && (
                    <div className="flex items-center gap-2 self-start sm:self-auto bg-card border border-border/80 px-2 py-1.5 rounded-full shadow-2xs">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePrev}
                            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                            title="Comunicado anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <span className="text-xs font-bold text-foreground px-2">
                            {selectedIndex + 1} de {announcements.length}
                        </span>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNext}
                            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                            title="Siguiente comunicado"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Selector de pestañas para múltiples comunicados */}
            {announcements.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {announcements.map((ann, idx) => (
                        <button
                            key={ann.id}
                            onClick={() => setSelectedIndex(idx)}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all border",
                                selectedIndex === idx
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs shadow-primary/20"
                                    : "bg-card/70 hover:bg-card border-border/80 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {ann.isPinned && <Pin className="w-3 h-3 fill-current shrink-0" />}
                            <span className="truncate max-w-[200px]">{ann.title}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Tarjeta del Comunicado Completo */}
            <Card className={cn(
                "overflow-hidden border border-border/80 bg-card/85 backdrop-blur-xl shadow-md transition-all duration-300 rounded-3xl",
                currentAnnouncement.isPinned && "border-amber-500/35 bg-gradient-to-br from-card via-card/90 to-amber-500/[0.02]"
            )}>
                {/* Header de la Publicación */}
                <CardHeader className="p-6 sm:p-8 pb-4 border-b border-border/60 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {currentAnnouncement.isPinned && (
                                <Badge className="bg-amber-500 text-amber-950 dark:text-amber-100 hover:bg-amber-600 text-xs font-bold gap-1 shadow-2xs">
                                    <Pin className="w-3 h-3 fill-current" />
                                    COMUNICADO DESTACADO
                                </Badge>
                            )}

                            <Badge variant="outline" className={cn("text-xs font-bold", categoryClass)}>
                                {currentAnnouncement.category}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                {formatColombianDateTime(pubDate)}
                            </span>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyLink}
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                title="Copiar enlace directo"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{copied ? "Copiado" : "Compartir"}</span>
                            </Button>
                        </div>
                    </div>

                    <h1 className="text-xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
                        {currentAnnouncement.title}
                    </h1>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span>Publicado por: <strong className="text-foreground">{currentAnnouncement.author?.name || "Administración Central"}</strong></span>
                        <span>•</span>
                        <span>Canal Oficial AcademiX</span>
                    </div>
                </CardHeader>

                {/* Contenido en Markdown COMPLETO */}
                <CardContent className="p-6 sm:p-8 pt-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentAnnouncement.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                        >
                            <MarkdownViewer source={currentAnnouncement.content} />
                        </motion.div>
                    </AnimatePresence>
                </CardContent>
            </Card>
        </section>
    );
}
