"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Mail,
    Send,
    Copy,
    Settings,
    Star,
    AlertTriangle,
    Eye,
    Code,
    Check,
    BookmarkPlus,
    RefreshCw,
    User,
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import {
    getEmailTemplatesAction,
    createEmailTemplateAction
} from "../../actions/committeeActions";
import { CommitteeReportDTO, CommitteeEmailTemplateDTO, formatFaultTypeLabel } from "../../types";
import { CommitteeEmailTemplatesModal } from "./CommitteeEmailTemplatesModal";

interface CommitteeEmailComposerModalProps {
    isOpen: boolean;
    onClose: () => void;
    reports: CommitteeReportDTO[];
    programId?: string;
    defaultProcessTitle?: string;
}

export function CommitteeEmailComposerModal({
    isOpen,
    onClose,
    reports,
    programId,
    defaultProcessTitle
}: CommitteeEmailComposerModalProps) {
    const [templates, setTemplates] = useState<CommitteeEmailTemplateDTO[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");

    // Modal for managing templates
    const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

    // Save as new template inline
    const [isSavingAsTemplate, setIsSavingAsTemplate] = useState(false);
    const [newTemplateTitle, setNewTemplateTitle] = useState("");
    const [showSaveTemplateInput, setShowSaveTemplateInput] = useState(false);

    // Active preview recipient index when multiple reports
    const [previewIndex, setPreviewIndex] = useState(0);
    const [viewMode, setViewMode] = useState<"compose" | "preview">("compose");

    const validRecipients = useMemo(() => {
        return reports.filter((r) => Boolean(r.studentEmail && r.studentEmail.trim().length > 0));
    }, [reports]);

    const invalidRecipients = useMemo(() => {
        return reports.filter((r) => !r.studentEmail || r.studentEmail.trim().length === 0);
    }, [reports]);

    const loadTemplates = async () => {
        try {
            setIsLoadingTemplates(true);
            const data = await getEmailTemplatesAction(programId);
            setTemplates(data);

            if (data.length > 0) {
                // Find default template or take the first one
                const defaultTpl = data.find((t) => t.isDefault) || data[0];
                setSelectedTemplateId(defaultTpl.id);
                setSubject(defaultTpl.subject);
                setBody(defaultTpl.body);
            }
        } catch (err: any) {
            console.error("Error al cargar plantillas:", err);
            toast.error("Error al cargar plantillas de correo.");
        } finally {
            setIsLoadingTemplates(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
            setShowSaveTemplateInput(false);
            setNewTemplateTitle("");
            setViewMode("compose");
            setPreviewIndex(0);
        }
    }, [isOpen, programId]);

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const tpl = templates.find((t) => t.id === templateId);
        if (tpl) {
            setSubject(tpl.subject);
            setBody(tpl.body);
            toast.info(`Plantilla «${tpl.title}» cargada.`);
        }
    };

    // Helper to interpolate variables for a specific report
    const interpolateText = (text: string, report?: CommitteeReportDTO) => {
        if (!report) {
            return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
                if (key === "proceso") return defaultProcessTitle || "Comité de Evaluación";
                if (key === "fecha") return new Date().toLocaleDateString("es-CO");
                return `[${key}]`;
            });
        }

        return text
            .replace(/\{\{aprendiz\}\}/g, report.studentName)
            .replace(/\{\{documento\}\}/g, report.studentDocument || "Sin documento")
            .replace(/\{\{ficha\}\}/g, report.groupName)
            .replace(/\{\{proceso\}\}/g, report.processTitle || defaultProcessTitle || "Comité de Evaluación")
            .replace(/\{\{causal\}\}/g, formatFaultTypeLabel(report.faultType, report.customFaultType))
            .replace(/\{\{observaciones\}\}/g, report.observations || report.reason)
            .replace(/\{\{motivo\}\}/g, report.observations || report.reason)
            .replace(/\{\{dias_inasistencia\}\}/g, String(report.absenceDays ?? report.absenceHours ?? 0))
            .replace(/\{\{horas_inasistencia\}\}/g, String(report.absenceDays ?? report.absenceHours ?? 0))
            .replace(/\{\{instructor\}\}/g, report.reportedByName)
            .replace(/\{\{fecha\}\}/g, new Date().toLocaleDateString("es-CO"));
    };

    const activePreviewReport = reports[previewIndex] || reports[0];
    const previewSubject = interpolateText(subject, activePreviewReport);
    const previewBody = interpolateText(body, activePreviewReport);

    // Save as new template in database
    const handleSaveAsNewTemplate = async () => {
        if (!newTemplateTitle.trim()) {
            toast.error("Por favor escribe un nombre para la nueva plantilla.");
            return;
        }
        if (!subject.trim() || !body.trim()) {
            toast.error("El asunto y el cuerpo del correo no pueden estar vacíos.");
            return;
        }

        try {
            setIsSavingAsTemplate(true);
            const res = await createEmailTemplateAction({
                title: newTemplateTitle.trim(),
                subject: subject.trim(),
                body: body.trim(),
                isDefault: false,
                programId
            });

            toast.success(`Plantilla «${res.template.title}» guardada en la base de datos.`);
            setShowSaveTemplateInput(false);
            setNewTemplateTitle("");
            await loadTemplates();
            setSelectedTemplateId(res.template.id);
        } catch (err: any) {
            toast.error(err.message || "Error al guardar la plantilla en la base de datos.");
        } finally {
            setIsSavingAsTemplate(false);
        }
    };

    // Send single personalized email
    const handleSendIndividual = (report: CommitteeReportDTO) => {
        if (!report.studentEmail) {
            toast.error(`El aprendiz ${report.studentName} no tiene correo.`);
            return;
        }

        const finalSubject = encodeURIComponent(interpolateText(subject, report));
        const finalBody = encodeURIComponent(interpolateText(body, report));
        const mailtoUrl = `mailto:${report.studentEmail.trim()}?subject=${finalSubject}&body=${finalBody}`;

        const anchor = document.createElement("a");
        anchor.href = mailtoUrl;
        anchor.click();

        toast.success(`Abriendo cliente de correo para ${report.studentName}...`);
    };

    // Send bulk email via BCC
    const handleSendBulk = () => {
        if (validRecipients.length === 0) {
            toast.error("No hay aprendices seleccionados con correo electrónico válido.");
            return;
        }

        // Generic interpolation for bulk
        const finalSubject = encodeURIComponent(
            subject
                .replace(/\{\{proceso\}\}/g, defaultProcessTitle || "Comité de Evaluación")
                .replace(/\{\{aprendiz\}\}/g, "Aprendiz")
                .replace(/\{\{fecha\}\}/g, new Date().toLocaleDateString("es-CO"))
        );

        const finalBody = encodeURIComponent(
            body
                .replace(/\{\{proceso\}\}/g, defaultProcessTitle || "Comité de Evaluación")
                .replace(/\{\{aprendiz\}\}/g, "aprendiz")
                .replace(/\{\{ficha\}\}/g, "su ficha correspondiente")
                .replace(/\{\{causal\}\}/g, "la causal reportada ante el comité")
                .replace(/\{\{motivo\}\}/g, "los hechos registrados en el reporte oficial")
                .replace(/\{\{instructor\}\}/g, "el equipo ejecutor")
                .replace(/\{\{fecha\}\}/g, new Date().toLocaleDateString("es-CO"))
        );

        const emails = Array.from(new Set(validRecipients.map((r) => r.studentEmail!.trim())));

        let mailtoUrl = "";
        if (emails.length === 1) {
            mailtoUrl = `mailto:${emails[0]}?subject=${finalSubject}&body=${finalBody}`;
        } else {
            mailtoUrl = `mailto:?bcc=${emails.join(",")}&subject=${finalSubject}&body=${finalBody}`;
        }

        const anchor = document.createElement("a");
        anchor.href = mailtoUrl;
        anchor.click();

        toast.success(`Abriendo cliente de correo con ${emails.length} destinatario(s)...`);
    };

    // Copy to clipboard
    const handleCopyPreview = () => {
        const textToCopy = `Asunto: ${previewSubject}\n\n${previewBody}`;
        navigator.clipboard.writeText(textToCopy);
        toast.success("Asunto y mensaje copiados al portapapeles.");
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent showCloseButton={false} className="max-w-5xl sm:max-w-5xl lg:max-w-5xl xl:max-w-6xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border border-border/80">
                    {/* Header */}
                    <DialogHeader className="p-5 pb-4 border-b border-border/80 bg-muted/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                                        Enviar Citación por Correo Electrónico
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        Personaliza y envía la notificación oficial usando plantillas guardadas en la base de datos.
                                    </DialogDescription>
                                </div>
                            </div>

                            {/* View Mode Toggle & Close Button */}
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60">
                                    <Button
                                        type="button"
                                        variant={viewMode === "compose" ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setViewMode("compose")}
                                        className="h-7 px-3 text-xs rounded-lg gap-1.5"
                                    >
                                        <Code className="w-3.5 h-3.5" />
                                        <span>Redactar</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={viewMode === "preview" ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setViewMode("preview")}
                                        className="h-7 px-3 text-xs rounded-lg gap-1.5"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Vista Previa</span>
                                    </Button>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClose}
                                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                                >
                                    Cerrar
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {/* Recipients summary banner */}
                        <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-primary" />
                                    Destinatarios ({reports.length} aprendiz{reports.length === 1 ? "" : "es"}):
                                </span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                                        {validRecipients.length} con correo válido
                                    </Badge>
                                    {invalidRecipients.length > 0 && (
                                        <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30">
                                            {invalidRecipients.length} sin correo
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Mini recipient chips */}
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                                {reports.map((r, i) => (
                                    <div
                                        key={r.id}
                                        className={`px-2 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 ${
                                            r.studentEmail
                                                ? "bg-muted/40 border-border text-foreground"
                                                : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                                        }`}
                                    >
                                        <span className="font-bold">{r.studentName}</span>
                                        <span className="text-[10px] opacity-70 font-mono">({r.groupName})</span>
                                        {!r.studentEmail && (
                                            <span className="text-[9px] font-bold text-rose-500">[Sin correo]</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Template selector and quick actions */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/80">
                            <div className="flex flex-1 items-center gap-2">
                                <Label htmlFor="template-select" className="text-xs font-semibold whitespace-nowrap">
                                    Plantilla guardada:
                                </Label>
                                <div className="flex-1 max-w-md">
                                    <Select
                                        value={selectedTemplateId}
                                        onValueChange={handleSelectTemplate}
                                        disabled={isLoadingTemplates}
                                    >
                                        <SelectTrigger id="template-select" className="h-9 text-xs rounded-xl bg-card">
                                            <SelectValue placeholder="Selecciona una plantilla..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map((tpl) => (
                                                <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                                                    {tpl.isDefault ? `★ ${tpl.title} (Predeterminada)` : tpl.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsTemplateManagerOpen(true)}
                                    className="h-8 px-2.5 text-xs rounded-xl gap-1.5"
                                    title="Administrar, editar o crear plantillas en base de datos"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Gestionar</span>
                                    <span>Plantillas</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowSaveTemplateInput((prev) => !prev)}
                                    className="h-8 px-2.5 text-xs rounded-xl gap-1.5 text-primary hover:bg-primary/10"
                                    title="Guardar el texto actual como una nueva plantilla"
                                >
                                    <BookmarkPlus className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Guardar como</span>
                                    <span>Plantilla</span>
                                </Button>
                            </div>
                        </div>

                        {/* Inline Save As New Template Bar */}
                        {showSaveTemplateInput && (
                            <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2 animate-in fade-in duration-200">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                    <BookmarkPlus className="w-3.5 h-3.5" />
                                    <span>Guardar este mensaje como nueva plantilla en la Base de Datos:</span>
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <Input
                                        placeholder="Nombre de la nueva plantilla (ej: Citación Segunda Instancia)..."
                                        value={newTemplateTitle}
                                        onChange={(e) => setNewTemplateTitle(e.target.value)}
                                        className="h-8 text-xs rounded-xl bg-card flex-1"
                                    />
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleSaveAsNewTemplate}
                                            disabled={isSavingAsTemplate || !newTemplateTitle.trim()}
                                            className="h-8 px-3 text-xs rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                                        >
                                            {isSavingAsTemplate ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Check className="w-3 h-3" />
                                            )}
                                            <span>Guardar en BD</span>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowSaveTemplateInput(false)}
                                            className="h-8 px-2 text-xs text-muted-foreground rounded-xl"
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {viewMode === "compose" ? (
                            /* COMPOSE VIEW */
                            <div className="space-y-3.5">
                                {/* Subject */}
                                <div className="space-y-1">
                                    <Label htmlFor="email-subject" className="text-xs font-semibold">
                                        Asunto del Correo Electrónico
                                    </Label>
                                    <Input
                                        id="email-subject"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="h-9 text-xs rounded-xl font-medium"
                                        placeholder="Asunto del correo..."
                                    />
                                </div>

                                {/* Body */}
                                <div className="space-y-1">
                                    <Label htmlFor="email-body" className="text-xs font-semibold">
                                        Cuerpo del Mensaje
                                    </Label>
                                    <Textarea
                                        id="email-body"
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        rows={10}
                                        className="text-xs rounded-xl font-mono leading-relaxed"
                                        placeholder="Escribe el mensaje aquí..."
                                    />
                                </div>
                            </div>
                        ) : (
                            /* LIVE PREVIEW VIEW */
                            <div className="space-y-3.5 animate-in fade-in duration-200">
                                {reports.length > 1 && (
                                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60">
                                        <Label className="text-xs font-semibold whitespace-nowrap">
                                            Previsualizar datos del aprendiz:
                                        </Label>
                                        <Select
                                            value={previewIndex.toString()}
                                            onValueChange={(val) => setPreviewIndex(parseInt(val, 10))}
                                        >
                                            <SelectTrigger className="h-8 text-xs rounded-lg bg-card max-w-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {reports.map((r, i) => (
                                                    <SelectItem key={r.id} value={i.toString()} className="text-xs">
                                                        {r.studentName} ({r.groupName})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="p-4 rounded-xl border border-border/80 bg-card shadow-2xs space-y-3">
                                    <div className="space-y-1 text-xs border-b border-border/60 pb-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Destinatario:</span>
                                            <span className="font-mono text-foreground font-semibold">
                                                {activePreviewReport.studentEmail || "(Sin correo registrado)"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Aprendiz:</span>
                                            <span className="text-foreground font-medium">
                                                {activePreviewReport.studentName} (Doc: {activePreviewReport.studentDocument || "N/A"})
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Ficha / Grupo:</span>
                                            <span className="text-foreground font-medium">
                                                {activePreviewReport.groupName}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Asunto:</span>
                                            <span className="font-bold text-foreground">
                                                {previewSubject}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs font-sans whitespace-pre-line leading-relaxed text-foreground/90">
                                        {previewBody}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Multi-apprentice Individual Action List when multiple learners */}
                        {reports.length > 1 && (
                            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                                <span className="text-xs font-bold text-foreground block">
                                    Envío Individual Personalizado (opcional):
                                </span>
                                <p className="text-[11px] text-muted-foreground">
                                    Puedes abrir un correo para cada aprendiz de manera personalizada con todas sus variables reemplazadas:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-40 overflow-y-auto">
                                    {reports.map((rep) => (
                                        <div
                                            key={rep.id}
                                            className="p-2 rounded-lg bg-card border border-border/80 flex items-center justify-between gap-2 shadow-2xs"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-foreground truncate">
                                                    {rep.studentName}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground truncate font-mono">
                                                    {rep.studentEmail || "Sin correo"} • {rep.groupName}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={!rep.studentEmail}
                                                onClick={() => handleSendIndividual(rep)}
                                                className="h-7 px-2 text-[11px] rounded-lg gap-1 shrink-0"
                                            >
                                                <Mail className="w-3 h-3 text-primary" />
                                                <span>Enviar</span>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCopyPreview}
                                className="h-8 px-3 text-xs rounded-xl gap-1.5"
                            >
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Copiar Texto</span>
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="h-8 px-3 text-xs rounded-xl"
                            >
                                Cancelar
                            </Button>

                            {reports.length === 1 ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleSendIndividual(reports[0])}
                                    disabled={!reports[0]?.studentEmail}
                                    className="h-8 px-4 text-xs rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shadow-2xs"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Abrir en Cliente de Correo</span>
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSendBulk}
                                    disabled={validRecipients.length === 0}
                                    className="h-8 px-4 text-xs rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shadow-2xs"
                                    title="Abre la app de correo con todos los aprendices en Copia Oculta (CCO / BCC)"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Enviar Masivo CCO ({validRecipients.length})</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Template Manager Modal */}
            <CommitteeEmailTemplatesModal
                isOpen={isTemplateManagerOpen}
                onClose={() => setIsTemplateManagerOpen(false)}
                programId={programId}
                onTemplatesUpdated={(tpls) => {
                    setTemplates(tpls);
                    if (tpls.length > 0 && !selectedTemplateId) {
                        const def = tpls.find((t) => t.isDefault) || tpls[0];
                        setSelectedTemplateId(def.id);
                        setSubject(def.subject);
                        setBody(def.body);
                    }
                }}
            />
        </>
    );
}
