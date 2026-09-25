"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MarkdownEditorWrapper } from "./MarkdownEditorWrapper";
import { AnnouncementItem, AnnouncementStatus } from "../types";
import { createAnnouncementAction, updateAnnouncementAction } from "../actions/announcementActions";
import { toast } from "sonner";
import {
    ArrowLeft,
    Pin,
    Calendar,
    Send,
    FileEdit,
    Clock,
    Sparkles,
    CheckCircle2,
    Save,
    X,
    Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnnouncementEditorPanelProps {
    announcementToEdit?: AnnouncementItem | null;
    onBack: () => void;
    onSaved: () => void;
}

const CATEGORIES = [
    { label: "General", value: "General" },
    { label: "Institucional", value: "Institucional" },
    { label: "Académico", value: "Académico" },
    { label: "Urgente", value: "Urgente" },
    { label: "Eventos", value: "Eventos" }
];

export function AnnouncementEditorPanel({
    announcementToEdit,
    onBack,
    onSaved
}: AnnouncementEditorPanelProps) {
    const isEditing = !!announcementToEdit;

    const [title, setTitle] = useState(announcementToEdit?.title || "");
    const [content, setContent] = useState(announcementToEdit?.content || "");
    const [category, setCategory] = useState(announcementToEdit?.category || "General");
    const [isPinned, setIsPinned] = useState(Boolean(announcementToEdit?.isPinned));
    
    // Modos: "immediate" | "draft" | "scheduled"
    const [publishMode, setPublishMode] = useState<"immediate" | "draft" | "scheduled">("immediate");
    
    // Fechas en zona horaria Colombia (YYYY-MM-DD y HH:mm)
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("08:00");
    
    // Expiración
    const [hasExpiration, setHasExpiration] = useState(false);
    const [expireDate, setExpireDate] = useState("");
    const [expireTime, setExpireTime] = useState("18:00");

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (announcementToEdit) {
            setTitle(announcementToEdit.title || "");
            setContent(announcementToEdit.content || "");
            setCategory(announcementToEdit.category || "General");
            setIsPinned(Boolean(announcementToEdit.isPinned));

            const isDraft = announcementToEdit.status === "DRAFT";
            const pubAt = announcementToEdit.publishedAt ? new Date(announcementToEdit.publishedAt) : null;
            const now = new Date();

            if (isDraft) {
                setPublishMode("draft");
            } else if (pubAt && pubAt.getTime() > now.getTime()) {
                setPublishMode("scheduled");
                const colString = new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/Bogota",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).format(pubAt);
                const colTime = new Intl.DateTimeFormat("en-GB", {
                    timeZone: "America/Bogota",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                }).format(pubAt);
                setScheduleDate(colString);
                setScheduleTime(colTime);
            } else {
                setPublishMode("immediate");
            }

            if (announcementToEdit.expiresAt) {
                setHasExpiration(true);
                const expAt = new Date(announcementToEdit.expiresAt);
                const colExpDate = new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/Bogota",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).format(expAt);
                const colExpTime = new Intl.DateTimeFormat("en-GB", {
                    timeZone: "America/Bogota",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                }).format(expAt);
                setExpireDate(colExpDate);
                setExpireTime(colExpTime);
            } else {
                setHasExpiration(false);
                setExpireDate("");
                setExpireTime("18:00");
            }
        } else {
            setTitle("");
            setContent("");
            setCategory("General");
            setIsPinned(false);
            setPublishMode("immediate");
            
            const today = new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/Bogota",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).format(new Date());
            setScheduleDate(today);
            setScheduleTime("08:00");

            setHasExpiration(false);
            setExpireDate("");
            setExpireTime("18:00");
        }
    }, [announcementToEdit]);

    // Función auxiliar para construir ISO con offset estricto de Colombia (-05:00)
    const buildColombianISO = (dateStr: string, timeStr: string): string => {
        const timePart = timeStr && timeStr.length === 5 ? `${timeStr}:00` : "00:00:00";
        const isoWithOffset = `${dateStr}T${timePart}-05:00`;
        return new Date(isoWithOffset).toISOString();
    };

    const handleSave = async (overrideMode?: "draft" | "immediate") => {
        const activeMode = overrideMode || publishMode;

        if (!title.trim()) {
            toast.error("Por favor ingresa un título para el anuncio.");
            return;
        }

        if (!content.trim()) {
            toast.error("El contenido del anuncio no puede estar vacío.");
            return;
        }

        let status: AnnouncementStatus = "PUBLISHED";
        let publishedAt: string | null = null;

        if (activeMode === "draft") {
            status = "DRAFT";
            publishedAt = null;
        } else if (activeMode === "scheduled") {
            if (!scheduleDate || !scheduleTime) {
                toast.error("Debes seleccionar fecha y hora para programar la publicación.");
                return;
            }
            status = "PUBLISHED";
            publishedAt = buildColombianISO(scheduleDate, scheduleTime);
        } else {
            status = "PUBLISHED";
            publishedAt = new Date().toISOString();
        }

        let expiresAt: string | null = null;
        if (hasExpiration && expireDate && expireTime) {
            expiresAt = buildColombianISO(expireDate, expireTime);
            if (publishedAt && new Date(expiresAt).getTime() <= new Date(publishedAt).getTime()) {
                toast.error("La fecha de expiración debe ser posterior a la fecha de publicación.");
                return;
            }
        }

        setIsSubmitting(true);

        try {
            if (isEditing && announcementToEdit) {
                const res = await updateAnnouncementAction(announcementToEdit.id, {
                    title,
                    content,
                    category,
                    status,
                    publishedAt,
                    expiresAt,
                    isPinned
                });

                if (!res.success) {
                    toast.error(res.error || "No se pudo actualizar el anuncio.");
                    return;
                }
                toast.success("Comunicado actualizado correctamente.");
            } else {
                const res = await createAnnouncementAction({
                    title,
                    content,
                    category,
                    status,
                    publishedAt,
                    expiresAt,
                    isPinned
                });

                if (!res.success) {
                    toast.error(res.error || "No se pudo crear el anuncio.");
                    return;
                }
                toast.success(
                    activeMode === "scheduled"
                        ? "Anuncio programado exitosamente."
                        : activeMode === "draft"
                        ? "Borrador guardado exitosamente."
                        : "Anuncio publicado exitosamente."
                );
            }

            onSaved();
        } catch (err: any) {
            console.error(err);
            toast.error("Error al procesar el anuncio.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300">
            {/* Barra superior con navegación y acciones rápidas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card/80 border border-border/80 backdrop-blur-md shadow-xs">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onBack}
                        disabled={isSubmitting}
                        className="gap-1.5 text-xs h-9 font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Volver a Comunicados</span>
                    </Button>

                    <div className="h-4 w-px bg-border hidden sm:block" />

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                                {isEditing ? "Edición en Panel" : "Nuevo Comunicado"}
                            </span>
                            {isEditing && (
                                <Badge variant="secondary" className="text-[10px] font-bold">
                                    ID: {announcementToEdit.id.slice(0, 8)}...
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-lg sm:text-xl font-extrabold text-foreground truncate max-w-md sm:max-w-xl">
                            {title.trim() ? title : isEditing ? "Editar Anuncio" : "Redactar Anuncio Oficial"}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        disabled={isSubmitting}
                        className="text-xs h-9"
                    >
                        Cancelar
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSave("draft")}
                        disabled={isSubmitting}
                        className="text-xs h-9 gap-1.5"
                    >
                        <FileEdit className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Guardar Borrador</span>
                    </Button>

                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSave()}
                        disabled={isSubmitting}
                        className="text-xs h-9 gap-1.5 shadow-md"
                    >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                            {isSubmitting
                                ? "Guardando..."
                                : isEditing
                                ? "Actualizar Anuncio"
                                : publishMode === "scheduled"
                                ? "Programar Anuncio"
                                : "Publicar Ahora"}
                        </span>
                    </Button>
                </div>
            </div>

            {/* Configuración Editorial */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Principal: Título y Editor Markdown (2 Cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-border/80 bg-card/70 shadow-xs">
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="panel-ann-title" className="text-sm font-bold flex items-center justify-between">
                                    <span>Título del Comunicado <span className="text-destructive">*</span></span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                        {title.length} caracteres
                                    </span>
                                </Label>
                                <Input
                                    id="panel-ann-title"
                                    placeholder="Ej: Inicio de Inscripciones para Semilleros de Innovación 2026..."
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-12 text-base sm:text-lg font-semibold"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-bold">
                                        Contenido en Markdown <span className="text-destructive">*</span>
                                    </Label>
                                    <span className="text-xs text-muted-foreground">
                                        Editor y previsualización en vivo integrados
                                    </span>
                                </div>
                                <MarkdownEditorWrapper
                                    value={content}
                                    onChange={(val) => setContent(val || "")}
                                    height={460}
                                    placeholder="Redacta tu comunicado oficial utilizando títulos (#, ##), listas, tablas, enlaces o imágenes..."
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Columna Lateral: Parámetros de Publicación y Programación (1 Col) */}
                <div className="space-y-6">
                    <Card className="border-border/80 bg-card/70 shadow-xs">
                        <CardContent className="p-5 space-y-5">
                            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <h2 className="text-sm font-bold text-foreground">Parámetros de Publicación</h2>
                            </div>

                            {/* Categoría */}
                            <div className="space-y-2">
                                <Label htmlFor="panel-category" className="text-xs font-semibold">
                                    Categoría Oficial
                                </Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger id="panel-category" className="h-9 text-xs">
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((c) => (
                                            <SelectItem key={c.value} value={c.value} className="text-xs">
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Estado y modo de publicación */}
                            <div className="space-y-2.5 pt-2 border-t border-border/50">
                                <Label className="text-xs font-semibold flex items-center gap-1.5">
                                    <Send className="w-3.5 h-3.5 text-primary" />
                                    Visibilidad
                                </Label>

                                <RadioGroup
                                    value={publishMode}
                                    onValueChange={(val: any) => setPublishMode(val)}
                                    className="space-y-2"
                                >
                                    <div className="flex items-center space-x-2 p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer border border-transparent has-[:checked]:border-primary/30 has-[:checked]:bg-primary/[0.03]">
                                        <RadioGroupItem value="immediate" id="panel-mode-imm" />
                                        <Label htmlFor="panel-mode-imm" className="cursor-pointer text-xs font-medium flex-1">
                                            Publicar de inmediato
                                        </Label>
                                    </div>

                                    <div className="flex items-center space-x-2 p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer border border-transparent has-[:checked]:border-amber-500/30 has-[:checked]:bg-amber-500/[0.03]">
                                        <RadioGroupItem value="scheduled" id="panel-mode-sched" />
                                        <Label htmlFor="panel-mode-sched" className="cursor-pointer text-xs font-medium flex-1 flex items-center gap-1.5">
                                            <Clock className="w-3 h-3 text-amber-500" />
                                            Programar publicación
                                        </Label>
                                    </div>

                                    <div className="flex items-center space-x-2 p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer border border-transparent has-[:checked]:border-border has-[:checked]:bg-muted/30">
                                        <RadioGroupItem value="draft" id="panel-mode-draft" />
                                        <Label htmlFor="panel-mode-draft" className="cursor-pointer text-xs font-medium flex-1 flex items-center gap-1.5">
                                            <FileEdit className="w-3 h-3 text-muted-foreground" />
                                            Guardar como borrador
                                        </Label>
                                    </div>
                                </RadioGroup>

                                {/* Controles para publicación programada */}
                                {publishMode === "scheduled" && (
                                    <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/25 space-y-2 animate-in fade-in duration-200">
                                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Zona horaria: Colombia (UTC-5)
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label htmlFor="panel-sched-date" className="text-[10px] text-muted-foreground">Fecha</Label>
                                                <Input
                                                    id="panel-sched-date"
                                                    type="date"
                                                    value={scheduleDate}
                                                    onChange={(e) => setScheduleDate(e.target.value)}
                                                    className="h-8 text-xs bg-background"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="panel-sched-time" className="text-[10px] text-muted-foreground">Hora</Label>
                                                <Input
                                                    id="panel-sched-time"
                                                    type="time"
                                                    value={scheduleTime}
                                                    onChange={(e) => setScheduleTime(e.target.value)}
                                                    className="h-8 text-xs bg-background"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Fijar Anuncio */}
                            <div className="p-3 rounded-xl bg-card border border-border/80 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="panel-pin-switch" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                                        <Pin className="w-3.5 h-3.5 text-amber-500" />
                                        Fijar (Destacado)
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Primer puesto en el feed de inicio
                                    </p>
                                </div>
                                <Switch
                                    id="panel-pin-switch"
                                    checked={isPinned}
                                    onCheckedChange={setIsPinned}
                                />
                            </div>

                            {/* Expiración Opcional */}
                            <div className="p-3 rounded-xl bg-card border border-border/80 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="panel-exp-switch" className="text-xs font-semibold cursor-pointer">
                                            Expiración Automática
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Ocultar tras una fecha límite
                                        </p>
                                    </div>
                                    <Switch
                                        id="panel-exp-switch"
                                        checked={hasExpiration}
                                        onCheckedChange={setHasExpiration}
                                    />
                                </div>

                                {hasExpiration && (
                                    <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in duration-200">
                                        <div>
                                            <Label htmlFor="panel-exp-date" className="text-[10px] text-muted-foreground">Fecha Límite</Label>
                                            <Input
                                                id="panel-exp-date"
                                                type="date"
                                                value={expireDate}
                                                onChange={(e) => setExpireDate(e.target.value)}
                                                className="h-8 text-xs bg-background"
                                                required={hasExpiration}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="panel-exp-time" className="text-[10px] text-muted-foreground">Hora</Label>
                                            <Input
                                                id="panel-exp-time"
                                                type="time"
                                                value={expireTime}
                                                onChange={(e) => setExpireTime(e.target.value)}
                                                className="h-8 text-xs bg-background"
                                                required={hasExpiration}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Botón Guardar en el sidebar del editor */}
                            <Button
                                onClick={() => handleSave()}
                                disabled={isSubmitting}
                                className="w-full gap-2 text-xs font-bold h-10 shadow-md"
                            >
                                <Save className="w-4 h-4" />
                                <span>{isSubmitting ? "Guardando..." : isEditing ? "Actualizar Anuncio" : "Guardar y Publicar"}</span>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
