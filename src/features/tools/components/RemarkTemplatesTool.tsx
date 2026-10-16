"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    ClipboardList,
    Plus,
    Search,
    Edit2,
    Trash2,
    Copy,
    ArrowLeft,
    RefreshCw,
    Sparkles,
    Check,
    AlertCircle,
    CheckCircle2,
    ShieldAlert,
    Filter,
    Layers,
    FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    getRemarkTemplatesAction,
    createRemarkTemplateAction,
    updateRemarkTemplateAction,
    deleteRemarkTemplateAction
} from "@/features/teacher/actions/remarkActions";

interface RemarkTemplatesToolProps {
    onBack: () => void;
}

export type RemarkCategoryType = "ALL" | "ATTENTION" | "COMMENDATION" | "CITATION" | "OTHER";

const CATEGORIES = [
    { value: "ALL", label: "Todas", color: "text-foreground", badge: "bg-muted text-foreground" },
    { value: "ATTENTION", label: "Llamados de Atención", color: "text-rose-600 dark:text-rose-400", badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25" },
    { value: "COMMENDATION", label: "Felicitaciones", color: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25" },
    { value: "CITATION", label: "Citaciones", color: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25" },
    { value: "OTHER", label: "Otras Observaciones", color: "text-purple-600 dark:text-purple-400", badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25" }
];

const SUGGESTED_SENA_TEMPLATES = [
    {
        title: "Llamado de atención por llegadas tarde reiteradas",
        type: "ATTENTION" as const,
        description: "Se registra llamado de atención al aprendiz debido a reiteradas llegadas tarde a las sesiones de formación presenciales y/o virtuales, afectando el normal desarrollo de las actividades pedagógicas y la adquisición de competencias según el reglamento del aprendiz."
    },
    {
        title: "Llamado de atención por no entrega de evidencias en fecha",
        type: "ATTENTION" as const,
        description: "El aprendiz no realizó la entrega oportuna de las evidencias de aprendizaje asignadas en plataforma dentro de los plazos establecidos, sin presentar justificación previa ante el equipo ejecutor de la formación."
    },
    {
        title: "Reconocimiento por excelencia y liderazgo en equipo",
        type: "COMMENDATION" as const,
        description: "Felicitación formal por demostrar alto compromiso, calidad técnica en sus entregas, proactividad y liderazgo positivo en las actividades colaborativas de la ficha."
    },
    {
        title: "Citación a sesión pedagógica y concertación de compromisos",
        type: "CITATION" as const,
        description: "Se convoca formalmente al aprendiz a comparecer ante el instructor vocero y equipo pedagógico para revisar el estado de su proceso formativo y concertar compromisos académicos y de asistencia."
    },
    {
        title: "Observación de seguimiento al plan de mejoramiento",
        type: "OTHER" as const,
        description: "Registro de seguimiento al cumplimiento de los compromisos concertados en el plan de mejoramiento académico. Se verifica el avance en las actividades asignadas."
    }
];

export function RemarkTemplatesTool({ onBack }: RemarkTemplatesToolProps) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<RemarkCategoryType>("ALL");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
    const [formTitle, setFormTitle] = useState("");
    const [formType, setFormType] = useState<"ATTENTION" | "COMMENDATION" | "CITATION" | "OTHER">("ATTENTION");
    const [formDesc, setFormDesc] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const data = await getRemarkTemplatesAction();
            setTemplates(data || []);
        } catch (err: any) {
            console.error("Error al cargar plantillas:", err);
            toast.error(err.message || "Error al cargar las plantillas de observación.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const openCreateModal = () => {
        setEditingTemplate(null);
        setFormTitle("");
        setFormType(selectedCategory !== "ALL" ? selectedCategory : "ATTENTION");
        setFormDesc("");
        setIsModalOpen(true);
    };

    const openEditModal = (tpl: any) => {
        setEditingTemplate(tpl);
        setFormTitle(tpl.title);
        setFormType(tpl.type || "ATTENTION");
        setFormDesc(tpl.description);
        setIsModalOpen(true);
    };

    const openDuplicateModal = (tpl: any) => {
        setEditingTemplate(null);
        setFormTitle(`${tpl.title} (Copia)`);
        setFormType(tpl.type || "ATTENTION");
        setFormDesc(tpl.description);
        setIsModalOpen(true);
    };

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            toast.error("El título de la plantilla es obligatorio.");
            return;
        }
        if (!formDesc.trim()) {
            toast.error("La descripción detallada es obligatoria.");
            return;
        }

        try {
            setIsSaving(true);
            if (editingTemplate) {
                await updateRemarkTemplateAction(editingTemplate.id, formTitle.trim(), formDesc.trim(), formType);
                toast.success("Plantilla actualizada correctamente en la base de datos.");
            } else {
                await createRemarkTemplateAction(formTitle.trim(), formDesc.trim(), formType);
                toast.success("Plantilla creada correctamente y disponible para los instructores.");
            }

            setIsModalOpen(false);
            await loadTemplates();
        } catch (err: any) {
            console.error("Error al guardar plantilla:", err);
            toast.error(err.message || "Error al guardar la plantilla.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTemplate = async (tpl: any) => {
        if (!confirm(`¿Eliminar la plantilla "${tpl.title}" de la base de datos?`)) {
            return;
        }
        try {
            await deleteRemarkTemplateAction(tpl.id);
            toast.success("Plantilla eliminada de la base de datos.");
            await loadTemplates();
        } catch (err: any) {
            toast.error(err.message || "Error al eliminar la plantilla.");
        }
    };

    const handleSeedSuggested = async () => {
        try {
            setIsSaving(true);
            for (const tpl of SUGGESTED_SENA_TEMPLATES) {
                await createRemarkTemplateAction(tpl.title, tpl.description, tpl.type);
            }
            toast.success("5 plantillas institucionales base cargadas correctamente.");
            await loadTemplates();
        } catch (err: any) {
            toast.error("Error al sembrar plantillas sugeridas: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Filtered templates
    const filteredTemplates = useMemo(() => {
        return templates.filter((tpl) => {
            const matchesCategory = selectedCategory === "ALL" || tpl.type === selectedCategory;
            const term = (searchTerm || "").toLowerCase().trim();
            const matchesSearch =
                !term ||
                (tpl.title || "").toLowerCase().includes(term) ||
                (tpl.description || "").toLowerCase().includes(term);

            return matchesCategory && matchesSearch;
        });
    }, [templates, selectedCategory, searchTerm]);

    // Counts
    const counts = useMemo(() => {
        return {
            total: templates.length,
            attention: templates.filter((t) => t.type === "ATTENTION").length,
            commendation: templates.filter((t) => t.type === "COMMENDATION").length,
            citation: templates.filter((t) => t.type === "CITATION").length,
            other: templates.filter((t) => t.type === "OTHER").length
        };
    }, [templates]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-12">
            {/* Top Navigation & Header */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={onBack}
                            className="w-10 h-10 rounded-xl shrink-0"
                            title="Volver a herramientas"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 text-[10px] py-0 px-2 font-semibold gap-1">
                                    <ClipboardList className="w-3 h-3" />
                                    Pedagógica & Disciplinaria
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono">
                                    {counts.total} {counts.total === 1 ? "plantilla" : "plantillas"} en base de datos
                                </span>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                Banco Institucional de Plantillas de Observaciones
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
                                Como Gestor Académico, administra las plantillas predefinidas que todos los instructores tendrán disponibles para registrar llamados de atención, felicitaciones, citaciones y observaciones a sus aprendices.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={loadTemplates}
                            disabled={isLoading}
                            className="h-10 px-3 text-xs gap-1.5 text-muted-foreground rounded-xl"
                            title="Actualizar lista"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                            <span className="hidden sm:inline">Actualizar</span>
                        </Button>

                        <Button
                            type="button"
                            onClick={openCreateModal}
                            className="h-10 px-4 text-xs rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shadow-2xs"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Nueva Plantilla</span>
                        </Button>
                    </div>
                </div>

                {/* Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-0.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Total Plantillas
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-foreground">{counts.total}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-0.5">
                        <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider block truncate">
                            🔴 Llamados Atención
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                            {counts.attention}
                        </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-0.5">
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block truncate">
                            🟢 Felicitaciones
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {counts.commendation}
                        </span>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-0.5">
                        <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider block truncate">
                            🔵 Citaciones
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                            {counts.citation}
                        </span>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-0.5 col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider block truncate">
                            ⚪ Otras Observaciones
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-purple-600 dark:text-purple-400">
                            {counts.other}
                        </span>
                    </div>
                </div>
            </div>

            {/* Controls Bar: Search & Category Filter */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-border/80 shadow-2xs">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Buscar plantilla por título o palabras clave de la descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-xl"
                    />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1 overflow-x-auto p-1 bg-muted/40 rounded-xl border border-border/60">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.value}
                            type="button"
                            onClick={() => setSelectedCategory(cat.value as RemarkCategoryType)}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                                selectedCategory === cat.value
                                    ? "bg-card text-foreground font-bold shadow-2xs border border-border"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Templates Grid */}
            {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span>Cargando plantillas de base de datos...</span>
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="py-16 px-6 text-center space-y-4 rounded-3xl border border-dashed border-border/80 bg-card p-8">
                    <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                        <ClipboardList className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5 max-w-md mx-auto">
                        <h4 className="text-base font-bold text-foreground">
                            {searchTerm || selectedCategory !== "ALL"
                                ? "No se encontraron plantillas con este filtro"
                                : "Aún no hay plantillas en la base de datos"}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {searchTerm || selectedCategory !== "ALL"
                                ? "Intenta modificar el término de búsqueda o seleccionar otra categoría."
                                : "Crea tu primera plantilla o siembra las plantillas sugeridas estándar del SENA."}
                        </p>
                    </div>

                    {!searchTerm && selectedCategory === "ALL" && templates.length === 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                            <Button
                                type="button"
                                size="sm"
                                onClick={openCreateModal}
                                className="h-9 px-4 text-xs rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Crear Primera Plantilla</span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSeedSuggested}
                                disabled={isSaving}
                                className="h-9 px-4 text-xs rounded-xl gap-1.5"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>Cargar 5 Plantillas Sugeridas SENA</span>
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((tpl) => {
                        const catConfig =
                            CATEGORIES.find((c) => c.value === tpl.type) || CATEGORIES[1];

                        return (
                            <Card
                                key={tpl.id}
                                className="rounded-2xl border-border/80 hover:border-primary/40 transition-all shadow-2xs flex flex-col justify-between overflow-hidden bg-card p-4 sm:p-5 space-y-3.5"
                            >
                                <div className="space-y-2.5">
                                    {/* Type badge */}
                                    <div className="flex items-center justify-between gap-2">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] font-semibold py-0.5 px-2 border ${catConfig.badge}`}
                                        >
                                            {tpl.type === "ATTENTION" && "🔴 Llamado de Atención"}
                                            {tpl.type === "COMMENDATION" && "🟢 Felicitación"}
                                            {tpl.type === "CITATION" && "🔵 Citación"}
                                            {tpl.type === "OTHER" && "⚪ Otra Observación"}
                                        </Badge>

                                        <span className="text-[10px] font-mono text-muted-foreground/70">
                                            {new Date(tpl.createdAt).toLocaleDateString("es-CO")}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-sm font-bold text-foreground leading-snug">
                                        {tpl.title}
                                    </h3>

                                    {/* Description */}
                                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto font-sans">
                                        {tpl.description}
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openDuplicateModal(tpl)}
                                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground rounded-lg gap-1"
                                            title="Duplicar como nueva plantilla"
                                        >
                                            <Copy className="w-3 h-3" />
                                            <span>Duplicar</span>
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditModal(tpl)}
                                            className="h-7 px-2.5 text-xs rounded-lg gap-1 text-primary hover:bg-primary/5"
                                            title="Editar plantilla"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                            <span>Editar</span>
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteTemplate(tpl)}
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                            title="Eliminar plantilla"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal para Crear / Editar Plantilla */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl">
                    <DialogHeader className="p-5 pb-4 border-b border-border/80 bg-muted/20">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                                    {editingTemplate ? "Editar Plantilla de Observación" : "Nueva Plantilla de Observación"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Esta plantilla estará disponible de inmediato para todos los instructores en sus fichas.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleSaveTemplate} className="p-5 space-y-4">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <Label htmlFor="template-form-title" className="text-xs font-semibold">
                                Título de la Plantilla <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="template-form-title"
                                placeholder="ej: Llamado de atención por llegadas tarde constantes"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="h-9 text-xs rounded-xl"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <Label htmlFor="template-form-type" className="text-xs font-semibold">
                                Tipo de Observación (Categoría) <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={formType}
                                onValueChange={(val: any) => setFormType(val)}
                            >
                                <SelectTrigger id="template-form-type" className="h-9 text-xs rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ATTENTION" className="text-rose-600 font-semibold text-xs">
                                        🔴 Llamado de Atención
                                    </SelectItem>
                                    <SelectItem value="COMMENDATION" className="text-emerald-600 font-semibold text-xs">
                                        🟢 Felicitación
                                    </SelectItem>
                                    <SelectItem value="CITATION" className="text-blue-600 font-semibold text-xs">
                                        🔵 Citación
                                    </SelectItem>
                                    <SelectItem value="OTHER" className="text-purple-600 font-semibold text-xs">
                                        ⚪ Otra Observación
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <Label htmlFor="template-form-desc" className="text-xs font-semibold">
                                Descripción Detallada <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                id="template-form-desc"
                                placeholder="Escribe el texto detallado de la observación que se cargará para el instructor..."
                                value={formDesc}
                                onChange={(e) => setFormDesc(e.target.value)}
                                rows={6}
                                className="text-xs rounded-xl leading-relaxed"
                                required
                            />
                        </div>

                        {/* Live Sample Preview */}
                        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1.5">
                            <span className="text-[11px] font-bold text-foreground block">
                                Vista Previa del Mensaje para el Instructor:
                            </span>
                            <div className="p-2.5 rounded-lg bg-card border border-border/60 text-xs space-y-1">
                                <p className="font-bold text-foreground">
                                    {formTitle || "(Sin título definido)"}
                                </p>
                                <p className="text-muted-foreground whitespace-pre-line text-[11px] leading-relaxed">
                                    {formDesc || "(Sin descripción detallada)"}
                                </p>
                            </div>
                        </div>

                        {/* Footer buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsModalOpen(false)}
                                disabled={isSaving}
                                className="h-8 px-3 text-xs rounded-xl"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSaving}
                                className="h-8 px-4 text-xs rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-2xs"
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>{editingTemplate ? "Actualizar Plantilla" : "Guardar en Base de Datos"}</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
