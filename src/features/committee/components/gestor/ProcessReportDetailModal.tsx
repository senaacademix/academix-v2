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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    ExternalLink,
    Copy,
    Calendar,
    UserCheck,
    AlertTriangle,
    FileText,
    School,
    Check,
    ShieldAlert,
    Mail
} from "lucide-react";
import { toast } from "sonner";
import { CommitteeReportDTO, CommitteeFaultType } from "../../types";
import { formatSafeDateTime } from "../../utils/dateUtils";

interface ProcessReportDetailModalProps {
    report: CommitteeReportDTO | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateStatus?: (reportId: string, status: string) => Promise<void>;
}

const FAULT_BADGES: Record<CommitteeFaultType, { label: string; className: string }> = {
    ACADEMICO: {
        label: "Académico",
        className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
    },
    DISCIPLINARIO: {
        label: "Disciplinario",
        className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
    },
    INASISTENCIA: {
        label: "Inasistencia",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
    },
    MIXTO: {
        label: "Mixto (Académico / Disciplinario)",
        className: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
    }
};

export function ProcessReportDetailModal({
    report,
    isOpen,
    onClose,
    onUpdateStatus
}: ProcessReportDetailModalProps) {
    const [copied, setCopied] = React.useState(false);

    if (!report) return null;

    const copyEvidenceUrl = () => {
        if (!report.evidenceUrl) return;
        navigator.clipboard.writeText(report.evidenceUrl);
        setCopied(true);
        toast.success("Enlace de evidencias copiado al portapapeles.");
        setTimeout(() => setCopied(false), 2000);
    };

    const faultConfig = FAULT_BADGES[report.faultType] || {
        label: report.faultType,
        className: "bg-muted text-muted-foreground border-border"
    };

    const formattedDate = formatSafeDateTime(report.createdAt);

    const handleSendEmail = () => {
        if (!report.studentEmail) {
            toast.error("El aprendiz no tiene un correo electrónico registrado.");
            return;
        }

        const subject = encodeURIComponent(
            `Citación a Comité de Evaluación y Seguimiento - ${report.groupName}`
        );
        const body = encodeURIComponent(
            `Apreciado(a) aprendiz ${report.studentName},\n\n` +
            `Por medio de la presente se le notifica que ha sido convocado(a) al proceso de Comité de Evaluación y Seguimiento:\n\n` +
            `• Proceso: ${report.processTitle}\n` +
            `• Ficha / Grupo: ${report.groupName}\n` +
            `• Causal o Falta: ${report.faultType}\n` +
            `• Hechos o Motivo: ${report.reason}\n\n` +
            `Favor estar atento(a) a las instrucciones y fecha de la sesión.\n\n` +
            `Cordialmente,\nGestión Académica - AcademiX`
        );

        const mailtoUrl = `mailto:${encodeURIComponent(report.studentEmail)}?subject=${subject}&body=${body}`;
        const tempLink = document.createElement("a");
        tempLink.href = mailtoUrl;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-border/80 rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/60 p-6 pb-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12 border-2 border-primary/20 shadow-xs">
                                <AvatarImage src={report.studentImage || undefined} alt={report.studentName} />
                                <AvatarFallback className="font-bold text-sm bg-primary/15 text-primary">
                                    {report.studentName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                                    {report.studentName}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
                                    <span>Doc: {report.studentDocument || "No registrado"}</span>
                                    <span>•</span>
                                    <span>{report.groupName}</span>
                                    {report.studentEmail && (
                                        <>
                                            <span>•</span>
                                            <a
                                                href={`mailto:${report.studentEmail}`}
                                                className="text-primary hover:underline font-mono"
                                            >
                                                {report.studentEmail}
                                            </a>
                                        </>
                                    )}
                                </DialogDescription>
                            </div>
                        </div>

                        <Badge variant="outline" className={`text-xs px-2.5 py-0.5 border ${faultConfig.className}`}>
                            {faultConfig.label}
                        </Badge>
                    </div>
                </div>

                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Process and Ficha banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
                        <div className="space-y-0.5">
                            <span className="text-muted-foreground font-medium">Proceso de Comité:</span>
                            <p className="font-semibold text-foreground line-clamp-1">{report.processTitle}</p>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-muted-foreground font-medium">Ficha / Grupo:</span>
                            <p className="font-semibold text-foreground">{report.groupName}</p>
                        </div>
                    </div>

                    {/* Reported by & Date */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-primary" />
                            <span>
                                Reportado por: <strong className="text-foreground">{report.reportedByName}</strong>
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{formattedDate}</span>
                        </div>
                    </div>

                    {/* Reason / Motivo del caso */}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <FileText className="w-4 h-4 text-primary" />
                            <span>Motivo o Hechos del Caso:</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-card border border-border/70 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed shadow-2xs">
                            {report.reason}
                        </div>
                    </div>

                    {/* Observations if any */}
                    {report.observations && (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span>Observaciones Adicionales:</span>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-foreground/90 whitespace-pre-wrap">
                                {report.observations}
                            </div>
                        </div>
                    )}

                    {/* Evidence Section */}
                    {report.evidenceUrl ? (
                        <div className="space-y-2 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/25">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    Evidencias Adjuntas del Caso
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">URL Externa</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    readOnly
                                    value={report.evidenceUrl}
                                    className="flex-1 bg-card border border-border/80 rounded-lg px-3 py-1.5 text-xs font-mono text-foreground truncate focus:outline-hidden"
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={copyEvidenceUrl}
                                    className="h-8 px-2.5 text-xs shrink-0"
                                    title="Copiar enlace"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0"
                                    onClick={() => window.open(report.evidenceUrl!, "_blank", "noopener,noreferrer")}
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Abrir Evidencias</span>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 opacity-50 shrink-0" />
                            <span>No se adjuntó enlace de evidencias para este reporte (opcional).</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 bg-muted/30 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Estado actual:</span>
                        <Badge variant="secondary" className="text-[11px] font-semibold">
                            {report.status}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        {report.studentEmail && (
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={handleSendEmail}
                                className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Enviar Correo</span>
                            </Button>
                        )}

                        <Button type="button" variant="outline" onClick={onClose} className="text-xs h-9">
                            Cerrar
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
