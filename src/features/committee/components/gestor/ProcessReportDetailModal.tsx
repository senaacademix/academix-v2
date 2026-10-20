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
    Mail,
    Clock,
    Scale,
    Ban,
    CheckCircle2,
    GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { CommitteeReportDTO, FAULT_TYPE_CONFIG, formatFaultTypeLabel } from "../../types";
import { formatSafeDateTime } from "../../utils/dateUtils";
import { CommitteeDecisionSelector } from "./CommitteeDecisionSelector";
import { StudentAcademicRecordModal } from "../common/StudentAcademicRecordModal";

interface ProcessReportDetailModalProps {
    report: CommitteeReportDTO | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateStatus?: (reportId: string, status: string) => Promise<void>;
    readOnlyDecision?: boolean;
}

export function ProcessReportDetailModal({
    report,
    isOpen,
    onClose,
    onUpdateStatus,
    readOnlyDecision = false
}: ProcessReportDetailModalProps) {
    const [copied, setCopied] = React.useState(false);
    const [isAcademicRecordOpen, setIsAcademicRecordOpen] = React.useState(false);

    if (!report) return null;

    const copyEvidenceUrl = () => {
        if (!report.evidenceUrl) return;
        navigator.clipboard.writeText(report.evidenceUrl);
        setCopied(true);
        toast.success("Enlace de evidencias copiado al portapapeles.");
        setTimeout(() => setCopied(false), 2000);
    };

    const faultConfig = FAULT_TYPE_CONFIG[report.faultType] || {
        label: report.faultType,
        badgeClass: "bg-muted text-muted-foreground border-border",
        icon: "📋"
    };

    const faultLabel = formatFaultTypeLabel(report.faultType, report.customFaultType);

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
            `• Causal o Falta: ${faultLabel}\n` +
            `• Observaciones: ${report.observations || report.reason}\n\n` +
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
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 overflow-hidden border-border/80 rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/60 p-5 sm:p-6 pb-4 sm:pb-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Avatar className="w-11 h-11 sm:w-12 sm:h-12 border-2 border-primary/20 shadow-xs shrink-0">
                                <AvatarImage src={report.studentImage || undefined} alt={report.studentName} />
                                <AvatarFallback className="font-bold text-sm bg-primary/15 text-primary">
                                    {report.studentName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-0.5">
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

                        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                            <Badge variant="outline" className={`text-xs px-2.5 py-0.5 border ${faultConfig.badgeClass}`}>
                                {faultConfig.icon ? `${faultConfig.icon} ` : ""}{faultLabel}
                            </Badge>
                            {(report.absenceDays ?? report.absenceHours ?? 0) > 0 && (
                                <Badge variant="outline" className="text-xs px-2 py-0.5 border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-mono">
                                    {report.absenceDays ?? report.absenceHours} {(report.absenceDays ?? report.absenceHours) === 1 ? "día inasistencia" : "días inasistencias"}
                                </Badge>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAcademicRecordOpen(true)}
                                className="h-7 px-2.5 text-xs text-primary border-primary/30 hover:bg-primary/10 rounded-lg gap-1 font-medium"
                                title="Ver registro académico completo del aprendiz"
                            >
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>Registro Académico</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg ml-1"
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Process & Ficha */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                        <div className="space-y-0.5">
                            <span className="text-muted-foreground font-medium block text-[11px]">Proceso de Comité:</span>
                            <p className="font-semibold text-foreground line-clamp-1">{report.processTitle}</p>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-muted-foreground font-medium block text-[11px]">Ficha / Horario:</span>
                            <p className="font-semibold text-foreground">{report.groupName}</p>
                            {report.groupSchedule && (
                                <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                                    <span>{report.groupSchedule}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Solución o Decisión del Comité */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                        <div className="space-y-0.5">
                            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                                <Scale className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                Solución / Decisión del Comité:
                            </span>
                            <p className="text-muted-foreground text-[11px]">
                                {readOnlyDecision
                                    ? "Determinación oficial asignada por la Coordinación / Comité de Evaluación."
                                    : "Selecciona o escribe la determinación final para este aprendiz (Cancelado, Condicionado, Absuelto u Otro)."}
                            </p>
                        </div>
                        <div className="shrink-0">
                            {readOnlyDecision ? (
                                <ReadOnlyDecisionBadge decision={report.committeeDecision} />
                            ) : (
                                <CommitteeDecisionSelector
                                    reportId={report.id}
                                    currentDecision={report.committeeDecision || null}
                                    onUpdated={(newVal) => {
                                        report.committeeDecision = newVal;
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Reported by */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border-b border-border/60 pb-3">
                        <UserCheck className="w-4 h-4 text-primary" />
                        <span>
                            Reportado por: <strong className="text-foreground">{report.reportedByName}</strong>
                        </span>
                    </div>

                    {/* Observaciones del caso */}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <FileText className="w-4 h-4 text-primary" />
                            <span>Observaciones:</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-card border border-border/70 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed shadow-2xs">
                            {report.observations || report.reason}
                        </div>
                    </div>

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

                <DialogFooter className="p-4 bg-muted/30 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Estado actual:</span>
                        <Badge variant="secondary" className="text-[11px] font-semibold">
                            {report.status}
                        </Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                        {report.studentEmail && (
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={handleSendEmail}
                                className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial justify-center"
                            >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Enviar Correo</span>
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAcademicRecordOpen(true)}
                            className="text-xs h-9 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 flex-1 sm:flex-initial justify-center font-medium"
                        >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Registro Académico</span>
                        </Button>

                        <Button type="button" variant="outline" onClick={onClose} className="text-xs h-9 flex-1 sm:flex-initial justify-center">
                            Cerrar
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Academic Record Fullscreen Modal */}
        <StudentAcademicRecordModal
            isOpen={isAcademicRecordOpen}
            onClose={() => setIsAcademicRecordOpen(false)}
            student={report}
        />
        </>
    );
}

function ReadOnlyDecisionBadge({ decision }: { decision?: string | null }) {
    if (!decision) {
        return (
            <Badge
                variant="outline"
                className="text-xs py-1 px-3 bg-muted/60 text-muted-foreground border-border/70 flex items-center gap-1.5 font-medium shadow-2xs"
            >
                <Clock className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                <span>Pendiente de resolución</span>
            </Badge>
        );
    }

    const lower = decision.toLowerCase().trim();
    if (lower.startsWith("cancelado")) {
        return (
            <Badge
                variant="outline"
                className="text-xs py-1 px-3 bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 flex items-center gap-1.5 font-bold shadow-2xs"
            >
                <Ban className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{decision}</span>
            </Badge>
        );
    }

    if (lower.startsWith("condicionado")) {
        return (
            <Badge
                variant="outline"
                className="text-xs py-1 px-3 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-1.5 font-bold shadow-2xs"
            >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{decision}</span>
            </Badge>
        );
    }

    if (lower.startsWith("absuelto")) {
        return (
            <Badge
                variant="outline"
                className="text-xs py-1 px-3 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 flex items-center gap-1.5 font-bold shadow-2xs"
            >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{decision}</span>
            </Badge>
        );
    }

    return (
        <Badge
            variant="outline"
            className="text-xs py-1 px-3 bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 flex items-center gap-1.5 font-bold shadow-2xs"
        >
            <Scale className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>{decision}</span>
        </Badge>
    );
}

