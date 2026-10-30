"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAppRefresh } from "@/lib/app-refresh";
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
    FileText,
    Eye,
    Mail,
    X,
    Tag
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
import {
    REMARK_AVAILABLE_VARIABLES,
    interpolateRemarkTemplate,
    CustomVariableDefinition
} from "@/features/teacher/utils/remarkTemplateVariables";

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
        subject: "Llamado de Atención por Llegadas Tarde - Ficha {{ficha}} - SENA",
        type: "ATTENTION" as const,
        description: "Estimado(a) aprendiz {{nombre_aprendiz}} (identificación: {{identificacion}}):\n\nSe registra llamado de atención formal debido a reiteradas llegadas tarde a las sesiones de formación presenciales y/o virtuales de la ficha {{ficha}} (Programa: {{programa}}), afectando el normal desarrollo pedagógico y la adquisición de competencias según el reglamento del aprendiz SENA.\n\nLe solicitamos puntualidad en la jornada {{jornada}} y concertar los compromisos correspondientes con su instructor {{nombre_instructor}}.\n\nFecha: {{fecha_actual}}"
    },
    {
        title: "Llamado de atención por no entrega de evidencias en fecha",
        subject: "Llamado de Atención por Evidencias Pendientes - Ficha {{ficha}} - SENA",
        type: "ATTENTION" as const,
        description: "Estimado(a) aprendiz {{nombre_aprendiz}}:\n\nSe notifica que en la ficha {{ficha}} no realizó la entrega oportuna de las evidencias de aprendizaje asignadas en plataforma dentro de los plazos establecidos para el programa {{programa}}, sin haber presentado justificación previa ante el equipo ejecutor.\n\nPor favor comuníquese de inmediato con su instructor {{nombre_instructor}} para acordar el plan de mejoramiento.\n\nFecha de notificación: {{fecha_actual}}"
    },
    {
        title: "Reconocimiento por excelencia y liderazgo en equipo",
        subject: "Felicitación por Excelencia y Liderazgo Académico - Ficha {{ficha}}",
        type: "COMMENDATION" as const,
        description: "Estimado(a) {{nombre_aprendiz}}:\n\nReciba una felicitación formal por demostrar alto compromiso, calidad técnica en sus entregas, proactividad y liderazgo positivo en las actividades formativas de la ficha {{ficha}} - {{programa}}.\n\n¡Continúe con este excelente desempeño!\n\nAtentamente,\nInstructor: {{nombre_instructor}}\nFecha: {{fecha_actual}}"
    },
    {
        title: "Citación a sesión pedagógica y concertación de compromisos",
        subject: "Citación a Sesión Pedagógica y Concertación de Compromisos - Ficha {{ficha}}",
        type: "CITATION" as const,
        description: "Estimado(a) aprendiz {{nombre_aprendiz}} (identificación: {{identificacion}}):\n\nSe convoca formalmente a comparecer ante el instructor vocero {{nombre_instructor}} para revisar el estado de su proceso formativo en el programa {{programa}} (Ficha {{ficha}}) y concertar compromisos académicos y de asistencia.\n\nFecha de emisión: {{fecha_actual}}"
    },
    {
        title: "Observación de seguimiento al plan de mejoramiento",
        subject: "Seguimiento al Plan de Mejoramiento Académico - Ficha {{ficha}}",
        type: "OTHER" as const,
        description: "Estimado(a) aprendiz {{nombre_aprendiz}}:\n\nRegistro de seguimiento al cumplimiento de los compromisos concertados en el plan de mejoramiento académico de la ficha {{ficha}} ({{programa}}). Se verifica el avance en las actividades asignadas.\n\nInstructor de seguimiento: {{nombre_instructor}}\nFecha: {{fecha_actual}}"
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
    const [formSubject, setFormSubject] = useState("");
    const [formType, setFormType] = useState<"ATTENTION" | "COMMENDATION" | "CITATION" | "OTHER">("ATTENTION");
    const [formDesc, setFormDesc] = useState("");
    const [activeTargetField, setActiveTargetField] = useState<"subject" | "desc">("desc");
    const [isSaving, setIsSaving] = useState(false);

    // Custom variables state
    const [customVariables, setCustomVariables] = useState<CustomVariableDefinition[]>([]);
    const [showAddVarForm, setShowAddVarForm] = useState(false);
    const [newVarToken, setNewVarToken] = useState("");
    const [newVarLabel, setNewVarLabel] = useState("");
    const [newVarDefault, setNewVarDefault] = useState("");

    const handleAddCustomVariable = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const cleanToken = newVarToken.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
        if (!cleanToken) {
            toast.error("El identificador de la variable es obligatorio (ej: lugar).");
            return;
        }
        if (customVariables.some(v => v.token.toLowerCase() === cleanToken)) {
            toast.error(`La variable {{${cleanToken}}} ya existe en esta plantilla.`);
            return;
        }
        const newVar: CustomVariableDefinition = {
            token: cleanToken,
            label: newVarLabel.trim() || cleanToken,
            defaultValue: newVarDefault.trim() || `[${cleanToken}]`
        };
        setCustomVariables(prev => [...prev, newVar]);
        setNewVarToken("");
        setNewVarLabel("");
        setNewVarDefault("");
        setShowAddVarForm(false);
        toast.success(`Variable personalizada {{${cleanToken}}} agregada`);
    };

    const handleRemoveCustomVariable = (token: string) => {
        setCustomVariables(prev => prev.filter(v => v.token !== token));
    };

    // Refs for cursor tracking and exact position insertion
    const subjectInputRef = useRef<HTMLInputElement>(null);
    const descTextareaRef = useRef<HTMLTextAreaElement>(null);
    const lastCursorPosRef = useRef<{ field: "subject" | "desc"; start: number; end: number }>({
        field: "desc",
        start: 0,
        end: 0
    });

    const updateCursorPosition = (field: "subject" | "desc") => {
        setActiveTargetField(field);
        const el = field === "subject" ? subjectInputRef.current : descTextareaRef.current;
        if (el) {
            const currentVal = field === "subject" ? formSubject : formDesc;
            lastCursorPosRef.current = {
                field,
                start: el.selectionStart ?? currentVal.length,
                end: el.selectionEnd ?? currentVal.length
            };
        }
    };

    const handleInsertVariable = (variableKey: string) => {
        const isSubject = activeTargetField === "subject";
        const el = isSubject ? subjectInputRef.current : descTextareaRef.current;
        const currentVal = isSubject ? formSubject : formDesc;
        
        let start = currentVal.length;
        let end = currentVal.length;

        if (el && typeof el.selectionStart === "number") {
            start = el.selectionStart;
            end = el.selectionEnd ?? start;
        } else if (lastCursorPosRef.current.field === activeTargetField) {
            start = lastCursorPosRef.current.start;
            end = lastCursorPosRef.current.end;
        }

        const before = currentVal.substring(0, start);
        const after = currentVal.substring(end);
        const newVal = `${before}${variableKey}${after}`;
        const newPos = start + variableKey.length;

        if (isSubject) {
            setFormSubject(newVal);
        } else {
            setFormDesc(newVal);
        }

        lastCursorPosRef.current = {
            field: activeTargetField,
            start: newPos,
            end: newPos
        };

        requestAnimationFrame(() => {
            if (el) {
                el.focus();
                el.setSelectionRange(newPos, newPos);
            }
        });

        toast.success(`Insertada: ${variableKey}`);
    };

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

    useAppRefresh(() => loadTemplates());

    const openCreateModal = () => {
        setEditingTemplate(null);
        setFormTitle("");
        setFormSubject("");
        setFormType(selectedCategory !== "ALL" ? selectedCategory : "ATTENTION");
        setFormDesc("");
        setCustomVariables([]);
        setShowAddVarForm(false);
        setIsModalOpen(true);
    };

    const openEditModal = (tpl: any) => {
        setEditingTemplate(tpl);
        setFormTitle(tpl.title);
        setFormSubject(tpl.subject || "");
        setFormType(tpl.type || "ATTENTION");
        setFormDesc(tpl.description);
        setCustomVariables(Array.isArray(tpl.customVariables) ? tpl.customVariables : []);
        setShowAddVarForm(false);
        setIsModalOpen(true);
    };

    const openDuplicateModal = (tpl: any) => {
        setEditingTemplate(null);
        setFormTitle(`${tpl.title} (Copia)`);
        setFormSubject(tpl.subject ? `${tpl.subject} (Copia)` : "");
        setFormType(tpl.type || "ATTENTION");
        setFormDesc(tpl.description);
        setCustomVariables(Array.isArray(tpl.customVariables) ? tpl.customVariables : []);
        setShowAddVarForm(false);
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
            const cleanSubject = formSubject.trim() || null;
            if (editingTemplate) {
                await updateRemarkTemplateAction(editingTemplate.id, formTitle.trim(), formDesc.trim(), formType, cleanSubject, customVariables);
                toast.success("Plantilla actualizada correctamente en la base de datos.");
            } else {
                await createRemarkTemplateAction(formTitle.trim(), formDesc.trim(), formType, cleanSubject, customVariables);
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
                await createRemarkTemplateAction(tpl.title, tpl.description, tpl.type, tpl.subject);
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
                (tpl.subject || "").toLowerCase().includes(term) ||
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

                                    {/* Email Subject if defined */}
                                    {tpl.subject && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-primary/90 font-medium bg-primary/5 border border-primary/15 rounded-lg px-2.5 py-1">
                                            <Mail className="w-3 h-3 shrink-0 text-primary" />
                                            <span className="truncate" title={tpl.subject}>
                                                <strong>Asunto:</strong> {tpl.subject}
                                            </span>
                                        </div>
                                    )}

                                    {/* Custom Variables Badge if defined */}
                                    {tpl.customVariables && Array.isArray(tpl.customVariables) && tpl.customVariables.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30 font-medium py-0 px-2 gap-1">
                                                <Sparkles className="w-2.5 h-2.5 text-violet-600 dark:text-violet-400" />
                                                <span>{tpl.customVariables.length} variable(s) personalizada(s)</span>
                                            </Badge>
                                        </div>
                                    )}

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
            {/* Modal para Crear / Editar Plantilla - Panel de Pantalla Completa (Full Screen) */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 z-50 w-screen h-screen max-w-none sm:max-w-none flex flex-col p-0 gap-0 overflow-hidden rounded-none border-0 bg-background duration-150">
                    <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/80 bg-muted/20 shrink-0 pr-28 sm:pr-36">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 shadow-2xs">
                                    <ClipboardList className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base sm:text-xl font-black text-foreground">
                                        {editingTemplate ? "Editar Plantilla de Observación" : "Nueva Plantilla de Observación"}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                        Esta plantilla institucional se guardará en la base de datos y estará disponible para todos los instructores.
                                    </DialogDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="hidden sm:flex text-[11px] font-semibold py-1 px-2.5 bg-primary/10 text-primary border-primary/20">
                                🖥️ Panel de Pantalla Completa
                            </Badge>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleSaveTemplate} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {/* 2-Column Grid Layout */}
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border/80">
                            
                            {/* COLUMNA IZQUIERDA: Formulario de Edición (Col 1-7) */}
                            <div className="lg:col-span-7 flex flex-col h-full min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5">
                                {/* Title & Category Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <Label htmlFor="template-form-title" className="text-xs font-bold text-foreground">
                                            Título de la Plantilla <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="template-form-title"
                                            placeholder="ej: Llamado de atención por faltas reiteradas o abandono"
                                            value={formTitle}
                                            onChange={(e) => setFormTitle(e.target.value)}
                                            className="h-10 text-xs sm:text-sm rounded-xl bg-background"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="template-form-type" className="text-xs font-bold text-foreground">
                                            Tipo / Categoría <span className="text-destructive">*</span>
                                        </Label>
                                        <Select
                                            value={formType}
                                            onValueChange={(val: any) => setFormType(val)}
                                        >
                                            <SelectTrigger id="template-form-type" className="h-10 text-xs sm:text-sm rounded-xl bg-background">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ATTENTION" className="text-rose-600 font-semibold text-xs sm:text-sm">
                                                    🔴 Llamado de Atención
                                                </SelectItem>
                                                <SelectItem value="COMMENDATION" className="text-emerald-600 font-semibold text-xs sm:text-sm">
                                                    🟢 Felicitación
                                                </SelectItem>
                                                <SelectItem value="CITATION" className="text-blue-600 font-semibold text-xs sm:text-sm">
                                                    🔵 Citación
                                                </SelectItem>
                                                <SelectItem value="OTHER" className="text-purple-600 font-semibold text-xs sm:text-sm">
                                                    ⚪ Otra Observación
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Email Subject Field */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="template-form-subject" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5 text-primary" />
                                            <span>Asunto del Correo Electrónico</span>
                                        </Label>
                                        <span className="text-[11px] text-muted-foreground">
                                            Opcional (se precargará en el correo del instructor)
                                        </span>
                                    </div>
                                    <Input
                                        ref={subjectInputRef}
                                        id="template-form-subject"
                                        placeholder="ej: Llamado de Atención por Inasistencias, Ficha {{ficha}} – SENA"
                                        value={formSubject}
                                        onFocus={() => updateCursorPosition("subject")}
                                        onClick={() => updateCursorPosition("subject")}
                                        onKeyUp={() => updateCursorPosition("subject")}
                                        onSelect={() => updateCursorPosition("subject")}
                                        onChange={(e) => {
                                            setFormSubject(e.target.value);
                                            updateCursorPosition("subject");
                                        }}
                                        className="h-10 text-xs sm:text-sm rounded-xl bg-background"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Este asunto se transferirá automáticamente al cliente de correo del instructor cuando decida redactar o enviar la notificación.
                                    </p>
                                </div>

                                {/* Variables Selector Panel */}
                                <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3.5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4 text-primary" />
                                            <span>Variables Institucionales y del Sistema (clic para insertar)</span>
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            Insertando en: <strong className="text-primary uppercase">{activeTargetField === "subject" ? "Asunto" : "Descripción"}</strong>
                                        </span>
                                    </div>

                                    {/* System variables */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {REMARK_AVAILABLE_VARIABLES.map((v) => (
                                            <button
                                                key={v.key}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => handleInsertVariable(v.key)}
                                                title={`${v.label}: ${v.description} (Ejemplo: ${v.sampleValue})`}
                                                className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-background hover:bg-primary hover:text-primary-foreground border border-border/80 shadow-2xs transition-all cursor-pointer"
                                            >
                                                <span className="text-primary font-bold">+</span>
                                                <span>{v.key}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom Variables Section */}
                                    <div className="pt-3 border-t border-primary/15 space-y-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <Tag className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                                                <span className="text-xs font-bold text-foreground">
                                                    Variables Personalizadas de la Plantilla
                                                </span>
                                                {customVariables.length > 0 && (
                                                    <Badge variant="outline" className="text-[10px] font-mono h-5 py-0 px-1.5 bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30">
                                                        {customVariables.length}
                                                    </Badge>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setShowAddVarForm(!showAddVarForm)}
                                                className="h-7 px-2.5 text-xs text-violet-700 dark:text-violet-300 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg gap-1 cursor-pointer font-semibold shadow-2xs"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>{showAddVarForm ? "Cerrar Creador" : "Crear Variable"}</span>
                                            </Button>
                                        </div>

                                        {showAddVarForm && (
                                            <div className="p-3.5 rounded-xl border border-violet-500/30 bg-card shadow-sm space-y-3 animate-in fade-in-50 duration-150">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-foreground">
                                                        Definir Nueva Variable Personalizada
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        El instructor verá este campo editable al aplicar la plantilla
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] font-semibold text-muted-foreground">
                                                            Identificador (Código) *
                                                        </Label>
                                                        <Input
                                                            placeholder="ej: lugar, enlace_meet..."
                                                            value={newVarToken}
                                                            onChange={(e) => setNewVarToken(e.target.value)}
                                                            className="h-8 text-xs font-mono rounded-lg"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] font-semibold text-muted-foreground">
                                                            Etiqueta Descriptiva
                                                        </Label>
                                                        <Input
                                                            placeholder="ej: Lugar / Ambiente..."
                                                            value={newVarLabel}
                                                            onChange={(e) => setNewVarLabel(e.target.value)}
                                                            className="h-8 text-xs rounded-lg"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] font-semibold text-muted-foreground">
                                                            Valor por Defecto
                                                        </Label>
                                                        <Input
                                                            placeholder="ej: Ambiente 302 - Torre A"
                                                            value={newVarDefault}
                                                            onChange={(e) => setNewVarDefault(e.target.value)}
                                                            className="h-8 text-xs rounded-lg"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-end gap-2 pt-1">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setShowAddVarForm(false);
                                                            setNewVarToken("");
                                                            setNewVarLabel("");
                                                            setNewVarDefault("");
                                                        }}
                                                        className="h-7 px-3 text-xs rounded-lg"
                                                    >
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => handleAddCustomVariable()}
                                                        className="h-7 px-3 text-xs rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold cursor-pointer"
                                                    >
                                                        Guardar Variable
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {customVariables.length === 0 ? (
                                            <p className="text-[11px] text-muted-foreground italic">
                                                No has definido variables personalizadas para esta plantilla. Puedes agregar campos como lugar, enlace, hora de citación, etc.
                                            </p>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {customVariables.map((cv) => (
                                                    <div 
                                                        key={cv.token} 
                                                        className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold pl-2.5 pr-1.5 py-1 rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/30 shadow-2xs"
                                                    >
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => handleInsertVariable(`{{${cv.token}}}`)}
                                                            className="hover:underline flex items-center gap-1 cursor-pointer"
                                                            title={`Insertar {{${cv.token}}} - ${cv.label} (Valor por defecto: ${cv.defaultValue})`}
                                                        >
                                                            <span className="font-black text-violet-600 dark:text-violet-400">+</span>
                                                            <span>{`{{${cv.token}}}`}</span>
                                                            <span className="text-[9px] font-sans opacity-70">({cv.label})</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveCustomVariable(cv.token)}
                                                            className="hover:bg-violet-500/20 p-0.5 rounded-full text-violet-600 dark:text-violet-400 cursor-pointer transition-colors"
                                                            title="Eliminar variable personalizada"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-[10px] text-muted-foreground">
                                        Las variables se reemplazarán automáticamente por los datos reales del aprendiz y por los valores asignados al enviar el correo o registrar la observación.
                                    </p>
                                </div>

                                {/* Description with dedicated scroll */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="template-form-desc" className="text-xs font-bold text-foreground">
                                            Descripción Detallada <span className="text-destructive">*</span>
                                        </Label>
                                        <span className="text-[11px] text-muted-foreground font-mono">
                                            {formDesc.length} caracteres
                                        </span>
                                    </div>
                                    <div className="rounded-xl border border-border/80 bg-background focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                                        <Textarea
                                            ref={descTextareaRef}
                                            id="template-form-desc"
                                            placeholder="Escribe el texto detallado de la observación que se cargará para el instructor..."
                                            value={formDesc}
                                            onFocus={() => updateCursorPosition("desc")}
                                            onClick={() => updateCursorPosition("desc")}
                                            onKeyUp={() => updateCursorPosition("desc")}
                                            onSelect={() => updateCursorPosition("desc")}
                                            onChange={(e) => {
                                                setFormDesc(e.target.value);
                                                updateCursorPosition("desc");
                                            }}
                                            rows={8}
                                            className="min-h-[180px] max-h-[300px] w-full resize-y overflow-y-auto text-xs sm:text-sm leading-relaxed p-3.5 bg-transparent border-0 focus-visible:ring-0 focus-visible:outline-none scrollbar-thin"
                                            required
                                        />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                                        <span>El área cuenta con barra de desplazamiento vertical interna para textos extensos.</span>
                                    </p>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: Vista Previa en Vivo (Col 8-12) */}
                            <div className="lg:col-span-5 flex flex-col h-full min-h-0 overflow-y-auto bg-muted/20 p-5 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                                            <Eye className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs sm:text-sm font-bold text-foreground">
                                                Vista Previa en Tiempo Real
                                            </h4>
                                            <p className="text-[10px] text-muted-foreground">
                                                Simulación con datos interpolados
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" className="text-[10px] py-0 px-2 font-semibold">
                                            {formType === "ATTENTION" && "🔴 Llamado"}
                                            {formType === "COMMENDATION" && "🟢 Felicitación"}
                                            {formType === "CITATION" && "🔵 Citación"}
                                            {formType === "OTHER" && "⚪ Otra"}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Simulación del Correo / Notificación */}
                                <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-4">
                                    {/* Header de simulación */}
                                    <div className="space-y-2 text-xs border-b border-border/60 pb-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-semibold text-muted-foreground">Destinatario (Simulado):</span>
                                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20 font-mono">
                                                Carlos Pérez • 1002345678
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-semibold text-muted-foreground">Ficha / Grupo:</span>
                                            <span className="text-[11px] font-mono text-foreground font-medium">2693510 - ADSO</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-semibold text-muted-foreground">Instructor / Emisor:</span>
                                            <span className="text-[11px] text-foreground font-medium">Jhon Valencia (Instructor)</span>
                                        </div>
                                    </div>

                                    {/* Asunto Interpolado */}
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <Mail className="w-3 h-3 text-primary" />
                                            Asunto del Correo Interpolado
                                        </span>
                                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs font-semibold text-foreground">
                                            {interpolateRemarkTemplate(formSubject || formTitle, { useSampleValues: true, customVariables }) || (
                                                <span className="text-muted-foreground italic font-normal">(Sin asunto definido)</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Variables personalizadas activas en la plantilla */}
                                    {customVariables.length > 0 && (
                                        <div className="p-2.5 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-1.5">
                                            <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider flex items-center gap-1">
                                                <Tag className="w-3 h-3" />
                                                Valores por Defecto de Variables Personalizadas
                                            </span>
                                            <div className="grid grid-cols-1 gap-1 text-[11px] font-mono">
                                                {customVariables.map((cv) => (
                                                    <div key={cv.token} className="flex items-center justify-between gap-2 text-violet-800 dark:text-violet-200">
                                                        <span>{`{{${cv.token}}}`} ({cv.label}):</span>
                                                        <strong className="truncate">{cv.defaultValue || "(vacío)"}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cuerpo del Mensaje Interpolado */}
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            Cuerpo del Mensaje / Observación
                                        </span>
                                        <div className="p-3.5 rounded-xl bg-background border border-border/80 text-xs leading-relaxed whitespace-pre-line text-foreground/90 font-sans min-h-[140px] max-h-[360px] overflow-y-auto">
                                            {interpolateRemarkTemplate(formDesc, { useSampleValues: true, customVariables }) || (
                                                <span className="text-muted-foreground italic font-normal">
                                                    Redacta la descripción en el panel izquierdo para visualizar aquí la interpolación en tiempo real...
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Guía explicativa */}
                                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>¿Cómo funciona para el instructor?</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed">
                                        Al seleccionar esta plantilla oficial en la gestión de su grupo, las variables del sistema como <code className="bg-background px-1 py-0.5 rounded text-primary font-mono text-[10px]">{`{{aprendiz}}`}</code> se sustituirán automáticamente con los datos del aprendiz seleccionado. Si definiste variables personalizadas, el instructor verá un formulario con sus valores por defecto listos para personalizar antes de enviar o guardar.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer */}
                        <div className="p-4 sm:p-5 border-t border-border/80 bg-card flex items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground hidden sm:flex">
                                <span className="font-semibold text-foreground truncate max-w-[200px]">{formTitle || "Nueva plantilla"}</span>
                                <span>•</span>
                                <span>{formDesc.length} caracteres</span>
                                {customVariables.length > 0 && (
                                    <>
                                        <span>•</span>
                                        <span className="text-violet-600 dark:text-violet-400 font-semibold">{customVariables.length} variable(s) personalizada(s)</span>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSaving}
                                    className="h-9 px-4 text-xs rounded-xl cursor-pointer"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isSaving}
                                    className="h-9 px-5 text-xs rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-2xs cursor-pointer"
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
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
