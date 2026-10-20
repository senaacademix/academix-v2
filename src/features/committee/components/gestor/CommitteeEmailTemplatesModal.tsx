"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    Mail,
    Plus,
    Edit2,
    Trash2,
    Star,
    RefreshCw,
    Sparkles,
    Check,
    AlertCircle,
    Copy,
    ArrowLeft,
    X
} from "lucide-react";
import { toast } from "sonner";
import {
    getEmailTemplatesAction,
    createEmailTemplateAction,
    updateEmailTemplateAction,
    deleteEmailTemplateAction
} from "../../actions/committeeActions";
import { CommitteeEmailTemplateDTO } from "../../types";

interface CommitteeEmailTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    programId?: string;
    onTemplatesUpdated?: (templates: CommitteeEmailTemplateDTO[]) => void;
}

const AVAILABLE_VARIABLES = [
    { tag: "{{aprendiz}}", label: "Nombre Aprendiz", example: "Carlos Andrés Gómez" },
    { tag: "{{documento}}", label: "Documento", example: "1025884119" },
    { tag: "{{ficha}}", label: "Ficha / Grupo", example: "3223877" },
    { tag: "{{proceso}}", label: "Nombre Convocatoria", example: "Comité de Evaluación Trimestre 3" },
    { tag: "{{causal}}", label: "Causal / Falta", example: "INASISTENCIA" },
    { tag: "{{observaciones}}", label: "Observaciones", example: "Acumulación de fallas consecutivas sin presentar justificación" },
    { tag: "{{dias_inasistencia}}", label: "Días Inasistencia", example: "4" },
    { tag: "{{motivo}}", label: "Motivo (Observaciones)", example: "Acumulación de más de 3 fallas sin justificar" },
    { tag: "{{instructor}}", label: "Instructor que Reporta", example: "Jhon Fredy Valencia" },
    { tag: "{{fecha}}", label: "Fecha Actual", example: new Date().toLocaleDateString("es-CO") }
];

export function CommitteeEmailTemplatesModal({
    isOpen,
    onClose,
    programId,
    onTemplatesUpdated
}: CommitteeEmailTemplatesModalProps) {
    const [templates, setTemplates] = useState<CommitteeEmailTemplateDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form Mode: "list" | "create" | "edit"
    const [mode, setMode] = useState<"list" | "create" | "edit">("list");
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<CommitteeEmailTemplateDTO | null>(null);
    const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

    // Form fields
    const [formTitle, setFormTitle] = useState("");
    const [formSubject, setFormSubject] = useState("");
    const [formBody, setFormBody] = useState("");
    const [formIsDefault, setFormIsDefault] = useState(false);

    // Active field tracking & refs for exact cursor position variable insertion
    const [lastFocusedField, setLastFocusedField] = useState<"subject" | "body">("body");
    const subjectInputRef = useRef<HTMLInputElement>(null);
    const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const data = await getEmailTemplatesAction(programId);
            setTemplates(data);
            if (onTemplatesUpdated) {
                onTemplatesUpdated(data);
            }
        } catch (err: any) {
            console.error("Error al cargar plantillas:", err);
            toast.error(err.message || "Error al cargar las plantillas de correo.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
            setMode("list");
        }
    }, [isOpen, programId]);

    const handleOpenCreate = () => {
        setEditingTemplateId(null);
        setFormTitle("");
        setFormSubject("Citación a Comité de Evaluación y Seguimiento - {{proceso}}");
        setFormBody(`Estimado(a) aprendiz {{aprendiz}},

Por medio de la presente comunicación oficial del Centro de Formación (SENA), se le notifica que ha sido convocado(a) a comparecer ante el Comité de Evaluación y Seguimiento en el marco del proceso:

• Convocatoria / Proceso: {{proceso}}
• Ficha / Grupo: {{ficha}}
• Causal / Falta reportada: {{causal}}
• Motivo del reporte: {{motivo}}

Se le solicita estar atento(a) a las instrucciones del Gestor Académico e instructores sobre la fecha, hora y modalidad de la sesión para la presentación formal de sus descargos y análisis del caso.

Le recordamos que tiene derecho a allegar las evidencias o soportes que considere pertinentes para su defensa.

Atentamente,
Gestor Académico
SENA - Academix`);
        setFormIsDefault(templates.length === 0);
        setMode("create");
    };

    const handleOpenEdit = (t: CommitteeEmailTemplateDTO) => {
        setEditingTemplateId(t.id);
        setFormTitle(t.title);
        setFormSubject(t.subject);
        setFormBody(t.body);
        setFormIsDefault(t.isDefault);
        setMode("edit");
    };

    const handleInsertVariable = (tag: string) => {
        if (lastFocusedField === "subject" && subjectInputRef.current) {
            const input = subjectInputRef.current;
            const start = input.selectionStart ?? formSubject.length;
            const end = input.selectionEnd ?? formSubject.length;
            const newText = formSubject.substring(0, start) + tag + formSubject.substring(end);
            setFormSubject(newText);
            setTimeout(() => {
                input.focus();
                input.setSelectionRange(start + tag.length, start + tag.length);
            }, 0);
        } else if (bodyTextareaRef.current) {
            const textarea = bodyTextareaRef.current;
            const start = textarea.selectionStart ?? formBody.length;
            const end = textarea.selectionEnd ?? formBody.length;
            const newText = formBody.substring(0, start) + tag + formBody.substring(end);
            setFormBody(newText);
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + tag.length, start + tag.length);
            }, 0);
        } else {
            setFormBody((prev) => prev + " " + tag);
        }
        toast.info(`Variable ${tag} insertada`);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            toast.error("Por favor ingresa un título para la plantilla.");
            return;
        }
        if (!formSubject.trim()) {
            toast.error("Por favor ingresa el asunto del correo.");
            return;
        }
        if (!formBody.trim()) {
            toast.error("Por favor ingresa el cuerpo del correo.");
            return;
        }

        try {
            setIsSaving(true);
            if (mode === "create") {
                await createEmailTemplateAction({
                    title: formTitle.trim(),
                    subject: formSubject.trim(),
                    body: formBody.trim(),
                    isDefault: formIsDefault,
                    programId
                });
                toast.success("Plantilla creada y guardada en base de datos.");
            } else if (mode === "edit" && editingTemplateId) {
                await updateEmailTemplateAction(editingTemplateId, {
                    title: formTitle.trim(),
                    subject: formSubject.trim(),
                    body: formBody.trim(),
                    isDefault: formIsDefault,
                    programId
                });
                toast.success("Plantilla actualizada en base de datos.");
            }

            await loadTemplates();
            setMode("list");
        } catch (err: any) {
            console.error("Error guardando plantilla:", err);
            toast.error(err.message || "Error al guardar la plantilla.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetDefault = async (template: CommitteeEmailTemplateDTO) => {
        try {
            await updateEmailTemplateAction(template.id, { isDefault: true });
            toast.success(`"${template.title}" ahora es la plantilla predeterminada.`);
            await loadTemplates();
        } catch (err: any) {
            toast.error("Error al actualizar la plantilla.");
        }
    };

    const handleDelete = async (template: CommitteeEmailTemplateDTO) => {
        setTemplateToDelete(template);
    };

    // Interpolate sample data for live preview
    const samplePreviewSubject = formSubject.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
        const found = AVAILABLE_VARIABLES.find((v) => v.tag === `{{${key}}}`);
        return found ? found.example : match;
    });

    const samplePreviewBody = formBody.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
        const found = AVAILABLE_VARIABLES.find((v) => v.tag === `{{${key}}}`);
        return found ? found.example : match;
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="max-w-5xl sm:max-w-5xl lg:max-w-5xl xl:max-w-6xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border border-border/80">
                <DialogHeader className="p-5 pb-4 border-b border-border/80 bg-muted/20">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                                    {mode === "list"
                                        ? "Plantillas de Correo para Comités"
                                        : mode === "create"
                                        ? "Nueva Plantilla de Correo"
                                        : "Editar Plantilla de Correo"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    {mode === "list"
                                        ? "Gestiona y personaliza las plantillas guardadas en la base de datos para citar aprendices."
                                        : "Define el asunto, cuerpo y variables dinámicas de la plantilla."}
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {mode === "list" && (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleOpenCreate}
                                    className="h-8 px-3 text-xs rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shadow-2xs cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Nueva Plantilla</span>
                                </Button>
                            )}

                            {mode !== "list" && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setMode("list")}
                                    className="h-8 px-2.5 text-xs text-muted-foreground rounded-xl gap-1 cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Volver a la lista</span>
                                </Button>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onClose}
                                className="h-8 px-3 text-xs rounded-xl gap-1.5 hover:bg-muted font-medium shrink-0 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Cerrar</span>
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {mode === "list" ? (
                        /* LIST MODE */
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{templates.length} plantilla(s) guardadas en la base de datos</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={loadTemplates}
                                    disabled={isLoading}
                                    className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                                    <span>Actualizar</span>
                                </Button>
                            </div>

                            {isLoading ? (
                                <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                                    <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                                    <span>Cargando plantillas de base de datos...</span>
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="py-12 px-4 rounded-xl border border-dashed border-border text-center space-y-2">
                                    <AlertCircle className="w-8 h-8 text-muted-foreground/60 mx-auto" />
                                    <p className="text-sm font-semibold text-foreground">No hay plantillas guardadas</p>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        Crea tu primera plantilla personalizada para agilizar el envío de correos a aprendices citados.
                                    </p>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleOpenCreate}
                                        className="h-8 px-3 text-xs mt-2"
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                        Crear Primera Plantilla
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {templates.map((tpl) => (
                                        <div
                                            key={tpl.id}
                                            className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-all shadow-2xs space-y-2"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-sm font-bold text-foreground">
                                                        {tpl.title}
                                                    </h3>
                                                    {tpl.isDefault && (
                                                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] py-0 px-2 font-semibold gap-1">
                                                            <Star className="w-2.5 h-2.5 fill-current" />
                                                            Predeterminada
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenEdit(tpl)}
                                                        className="h-7 px-2.5 text-xs rounded-lg gap-1 cursor-pointer"
                                                    >
                                                        <Edit2 className="w-3 h-3 text-primary" />
                                                        <span>Editar</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(tpl)}
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                                        title="Eliminar plantilla"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="text-xs">
                                                <p className="font-medium text-foreground/90">
                                                    <span className="text-muted-foreground font-normal">Asunto: </span>
                                                    {tpl.subject}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* CREATE / EDIT FORM MODE */
                        <form id="template-form" onSubmit={handleSave} className="space-y-4">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <Label htmlFor="template-title" className="text-xs font-semibold">
                                    Nombre o Título de la Plantilla <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="template-title"
                                    placeholder="ej: Citación Oficial a Descargos, Notificación Preventiva..."
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    className="h-9 text-xs rounded-xl"
                                    required
                                />
                            </div>

                            {/* Subject */}
                            <div className="space-y-1.5">
                                <Label htmlFor="template-subject" className="text-xs font-semibold">
                                    Asunto del Correo Electrónico <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="template-subject"
                                    ref={subjectInputRef}
                                    placeholder="ej: Citación a Comité de Evaluación y Seguimiento - {{proceso}}"
                                    value={formSubject}
                                    onFocus={() => setLastFocusedField("subject")}
                                    onChange={(e) => setFormSubject(e.target.value)}
                                    className="h-9 text-xs rounded-xl font-mono"
                                    required
                                />
                            </div>

                            {/* Variable Helpers */}
                            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Variables Dinámicas Disponibles (haz clic para insertar):</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {AVAILABLE_VARIABLES.map((v) => (
                                        <button
                                            key={v.tag}
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleInsertVariable(v.tag)}
                                            className="px-2.5 py-1 rounded-lg bg-background hover:bg-primary hover:text-primary-foreground border border-border text-[11px] font-mono transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                                            title={`Inserta ${v.tag} (ej: ${v.example})`}
                                        >
                                            <span className="font-bold">{v.tag}</span>
                                            <span className="text-[9px] opacity-75 font-sans">({v.label})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Body */}
                            <div className="space-y-1.5">
                                <Label htmlFor="template-body" className="text-xs font-semibold">
                                    Cuerpo del Mensaje <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="template-body"
                                    ref={bodyTextareaRef}
                                    placeholder="Escribe el contenido del correo. Puedes usar las variables dinámicas de arriba..."
                                    value={formBody}
                                    onFocus={() => setLastFocusedField("body")}
                                    onChange={(e) => setFormBody(e.target.value)}
                                    rows={12}
                                    className="text-xs rounded-xl font-mono leading-relaxed"
                                    required
                                />
                            </div>

                            {/* Default Switch */}
                            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                                <div className="space-y-0.5">
                                    <Label htmlFor="default-switch" className="text-xs font-bold cursor-pointer">
                                        Establecer como plantilla predeterminada
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Esta plantilla se seleccionará automáticamente al abrir el modal de envío de correos.
                                    </p>
                                </div>
                                <Switch
                                    id="default-switch"
                                    checked={formIsDefault}
                                    onCheckedChange={setFormIsDefault}
                                />
                            </div>

                            {/* Real-time Preview Accordion / Box */}
                            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-primary" />
                                        Vista Previa Simulada (con datos de ejemplo):
                                    </span>
                                    <Badge variant="outline" className="text-[10px]">
                                        En vivo
                                    </Badge>
                                </div>
                                <div className="p-3 rounded-lg bg-card border border-border/60 text-xs space-y-1.5 font-sans shadow-2xs">
                                    <p className="font-semibold text-foreground">
                                        <span className="text-muted-foreground font-normal">Asunto: </span>
                                        {samplePreviewSubject || "(Sin asunto)"}
                                    </p>
                                    <hr className="border-border/40" />
                                    <p className="text-foreground/90 whitespace-pre-line text-[11px] leading-relaxed">
                                        {samplePreviewBody || "(Sin contenido)"}
                                    </p>
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        className="h-8 px-3 text-xs rounded-xl"
                    >
                        Cerrar
                    </Button>

                    {mode !== "list" && (
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setMode("list")}
                                disabled={isSaving}
                                className="h-8 px-3 text-xs rounded-xl"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                form="template-form"
                                size="sm"
                                disabled={isSaving}
                                className="h-8 px-4 text-xs rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shadow-2xs"
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>{mode === "create" ? "Guardar en Base de Datos" : "Actualizar Plantilla"}</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>

            {/* Modal Temático para Eliminar Plantilla */}
            <AlertDialog open={Boolean(templateToDelete)} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
                <AlertDialogContent className="border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 max-w-md w-[95vw]">
                    <AlertDialogHeader className="space-y-2 text-left">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive border border-destructive/25 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <AlertDialogTitle className="text-base font-bold text-foreground">
                                    ¿Eliminar plantilla de correo?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-xs text-muted-foreground">
                                    Esta plantilla será eliminada de la base de datos de manera permanente.
                                </AlertDialogDescription>
                            </div>
                        </div>
                    </AlertDialogHeader>

                    {templateToDelete && (
                        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1 my-2">
                            <span className="text-muted-foreground text-[11px] block">Título de la plantilla:</span>
                            <strong className="text-foreground text-xs block">{templateToDelete.title}</strong>
                            <p className="text-[11px] text-muted-foreground/80 font-mono truncate pt-0.5">
                                Asunto: {templateToDelete.subject}
                            </p>
                        </div>
                    )}

                    <AlertDialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                        <AlertDialogCancel
                            disabled={isDeletingTemplate}
                            className="text-xs h-9 rounded-xl w-full sm:w-auto"
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={isDeletingTemplate}
                            onClick={async () => {
                                if (!templateToDelete) return;
                                try {
                                    setIsDeletingTemplate(true);
                                    await deleteEmailTemplateAction(templateToDelete.id);
                                    setTemplateToDelete(null);
                                    toast.success("Plantilla eliminada correctamente.");
                                    await loadTemplates();
                                } catch (err: any) {
                                    toast.error(err.message || "Error al eliminar la plantilla");
                                } finally {
                                    setIsDeletingTemplate(false);
                                }
                            }}
                            className="text-xs font-semibold h-9 rounded-xl gap-1.5 w-full sm:w-auto"
                        >
                            {isDeletingTemplate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            <span>Eliminar Plantilla</span>
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
