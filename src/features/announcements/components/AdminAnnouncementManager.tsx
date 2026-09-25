"use client";

import React, { useState } from "react";
import { AnnouncementItem } from "../types";
import { AnnouncementEditorPanel } from "@/features/announcements/components/AnnouncementEditorPanel";
import { AnnouncementDetailDialog } from "@/features/announcements/components/AnnouncementDetailDialog";
import { deleteAnnouncementAction, togglePinAnnouncementAction } from "../actions/announcementActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    Plus,
    Search,
    Pin,
    Calendar,
    Clock,
    Eye,
    Edit3,
    Trash2,
    FileText,
    CheckCircle2,
    Clock3,
    FileEdit,
    AlertCircle,
    Megaphone,
    Filter
} from "lucide-react";
import { formatColombianDateTime } from "@/lib/dateUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdminAnnouncementManagerProps {
    initialAnnouncements: AnnouncementItem[];
}

export function AdminAnnouncementManager({ initialAnnouncements }: AdminAnnouncementManagerProps) {
    const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTab, setSelectedTab] = useState<"all" | "published" | "scheduled" | "draft">("all");
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

    // Modo de vista: lista o editor integrado en el panel
    const [viewMode, setViewMode] = useState<"list" | "editor">("list");
    const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewAnnouncement, setPreviewAnnouncement] = useState<AnnouncementItem | null>(null);

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Clasificación de estado
    const now = new Date();

    const getStatusInfo = (ann: AnnouncementItem) => {
        if (ann.status === "DRAFT") {
            return {
                type: "draft",
                label: "Borrador",
                badgeClass: "bg-muted text-muted-foreground border-border"
            };
        }
        const pubAt = ann.publishedAt ? new Date(ann.publishedAt) : null;
        if (pubAt && pubAt.getTime() > now.getTime()) {
            return {
                type: "scheduled",
                label: "Programado",
                badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
            };
        }
        const expAt = ann.expiresAt ? new Date(ann.expiresAt) : null;
        if (expAt && expAt.getTime() <= now.getTime()) {
            return {
                type: "expired",
                label: "Expirado",
                badgeClass: "bg-destructive/10 text-destructive border-destructive/20"
            };
        }
        return {
            type: "published",
            label: "Publicado",
            badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
        };
    };

    // Estadísticas
    const totalCount = announcements.length;
    const publishedCount = announcements.filter((a) => {
        const info = getStatusInfo(a);
        return info.type === "published";
    }).length;
    const scheduledCount = announcements.filter((a) => {
        const info = getStatusInfo(a);
        return info.type === "scheduled";
    }).length;
    const draftCount = announcements.filter((a) => a.status === "DRAFT").length;

    // Filtrado
    const filteredAnnouncements = announcements.filter((ann) => {
        const matchesSearch =
            ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (ann.excerpt && ann.excerpt.toLowerCase().includes(searchQuery.toLowerCase())) ||
            ann.category.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (selectedCategory !== "ALL" && ann.category !== selectedCategory) {
            return false;
        }

        const info = getStatusInfo(ann);
        if (selectedTab === "published") return info.type === "published";
        if (selectedTab === "scheduled") return info.type === "scheduled";
        if (selectedTab === "draft") return info.type === "draft";

        return true;
    });

    const handleCreateNew = () => {
        setEditingAnnouncement(null);
        setViewMode("editor");
    };

    const handleEdit = (ann: AnnouncementItem) => {
        setEditingAnnouncement(ann);
        setViewMode("editor");
    };

    const handlePreview = (ann: AnnouncementItem) => {
        setPreviewAnnouncement(ann);
        setPreviewOpen(true);
    };

    const handleTogglePin = async (ann: AnnouncementItem) => {
        try {
            const res = await togglePinAnnouncementAction(ann.id);
            if (!res.success) {
                toast.error(res.error || "No se pudo cambiar el estado de fijado.");
                return;
            }
            setAnnouncements((prev) =>
                prev.map((item) =>
                    item.id === ann.id ? { ...item, isPinned: !item.isPinned } : item
                )
            );
            toast.success(
                res.isPinned
                    ? "Anuncio fijado al inicio."
                    : "Anuncio desfijado."
            );
        } catch {
            toast.error("Error al fijar el anuncio.");
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            const res = await deleteAnnouncementAction(deleteId);
            if (!res.success) {
                toast.error(res.error || "No se pudo eliminar el comunicado.");
                return;
            }
            setAnnouncements((prev) => prev.filter((item) => item.id !== deleteId));
            toast.success("Comunicado eliminado exitosamente.");
            setDeleteId(null);
        } catch {
            toast.error("Error al eliminar el comunicado.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Si está en modo editor, se renderiza a ancho completo dentro del panel (sin modal)
    if (viewMode === "editor") {
        return (
            <AnnouncementEditorPanel
                announcementToEdit={editingAnnouncement}
                onBack={() => {
                    setViewMode("list");
                    setEditingAnnouncement(null);
                }}
                onSaved={() => {
                    setViewMode("list");
                    setEditingAnnouncement(null);
                    window.location.reload();
                }}
            />
        );
    }

    return (
        <div className="space-y-8">
            {/* Header del módulo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
                        <Megaphone className="w-4 h-4" />
                        <span>Canal de Comunicación Oficial</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        Blog de Anuncios y Noticias
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Gestiona comunicados institucionales y noticias visibles en el panel de inicio de todos los usuarios.
                    </p>
                </div>

                <Button onClick={handleCreateNew} className="gap-2 shadow-md shrink-0">
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Anuncio</span>
                </Button>
            </div>

            {/* Tarjetas de Métricas Rápidas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card/70 border-border/80">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Total Creados</p>
                            <h3 className="text-xl font-bold text-foreground">{totalCount}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/70 border-border/80">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Publicados Activos</p>
                            <h3 className="text-xl font-bold text-foreground">{publishedCount}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/70 border-border/80">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Clock3 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Programados</p>
                            <h3 className="text-xl font-bold text-foreground">{scheduledCount}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/70 border-border/80">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                            <FileEdit className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Borradores</p>
                            <h3 className="text-xl font-bold text-foreground">{draftCount}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    <Button
                        variant={selectedTab === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTab("all")}
                        className="rounded-full text-xs"
                    >
                        Todos ({totalCount})
                    </Button>
                    <Button
                        variant={selectedTab === "published" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTab("published")}
                        className="rounded-full text-xs"
                    >
                        Publicados ({publishedCount})
                    </Button>
                    <Button
                        variant={selectedTab === "scheduled" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTab("scheduled")}
                        className="rounded-full text-xs"
                    >
                        Programados ({scheduledCount})
                    </Button>
                    <Button
                        variant={selectedTab === "draft" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTab("draft")}
                        className="rounded-full text-xs"
                    >
                        Borradores ({draftCount})
                    </Button>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar comunicado..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Listado de Anuncios */}
            {filteredAnnouncements.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border/80 bg-card/40">
                    <Megaphone className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-foreground">No se encontraron anuncios</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        {searchQuery
                            ? "No hay resultados que coincidan con la búsqueda."
                            : "Aún no has creado comunicados en esta categoría o estado."}
                    </p>
                    <Button onClick={handleCreateNew} size="sm" variant="outline" className="mt-4 gap-1.5 text-xs">
                        <Plus className="w-3.5 h-3.5" />
                        Crear primer comunicado
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredAnnouncements.map((ann) => {
                        const statusInfo = getStatusInfo(ann);

                        return (
                            <Card
                                key={ann.id}
                                className={cn(
                                    "transition-all duration-200 border-border/80 hover:shadow-md bg-card/80",
                                    ann.isPinned && "border-amber-500/30 bg-amber-500/[0.02]"
                                )}
                            >
                                <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {ann.isPinned && (
                                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold gap-1">
                                                    <Pin className="w-3 h-3 fill-amber-500" />
                                                    Fijado
                                                </Badge>
                                            )}

                                            <Badge variant="outline" className={cn("text-[11px] font-semibold", statusInfo.badgeClass)}>
                                                {statusInfo.label}
                                            </Badge>

                                            <Badge variant="secondary" className="text-[11px] font-medium">
                                                {ann.category}
                                            </Badge>

                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {ann.publishedAt
                                                    ? formatColombianDateTime(ann.publishedAt)
                                                    : `Creado el ${formatColombianDateTime(ann.createdAt)}`}
                                            </span>
                                        </div>

                                        <h3
                                            onClick={() => handlePreview(ann)}
                                            className="text-base sm:text-lg font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                                        >
                                            {ann.title}
                                        </h3>

                                        <div className="text-[11px] text-muted-foreground/80 flex items-center gap-2">
                                            <span>Por: <strong>{ann.author?.name || "Administrador"}</strong></span>
                                            {ann.expiresAt && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-destructive/80">
                                                        Expira: {formatColombianDateTime(ann.expiresAt)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Botones de acción */}
                                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleTogglePin(ann)}
                                            className={cn(
                                                "h-8 px-2 text-xs",
                                                ann.isPinned ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground"
                                            )}
                                            title={ann.isPinned ? "Desfijar" : "Fijar al inicio"}
                                        >
                                            <Pin className={cn("w-4 h-4", ann.isPinned && "fill-amber-500")} />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handlePreview(ann)}
                                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                            title="Vista previa"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(ann)}
                                            className="h-8 px-2.5 text-xs gap-1"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            <span>Editar</span>
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteId(ann.id)}
                                            className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal de vista previa */}
            <AnnouncementDetailDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                announcement={previewAnnouncement}
            />

            {/* Diálogo de confirmación para eliminar */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Deseas eliminar este comunicado?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el anuncio de forma permanente. Dejará de ser visible en el inicio de todos los roles.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting ? "Eliminando..." : "Eliminar Comunicado"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
