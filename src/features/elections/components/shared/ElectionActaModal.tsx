"use client";

import React, { useState } from "react";
import { GroupElectionDTO } from "../../types";
import { exportElectionActaPDF, ACTA_LEGAL_CONSTANTS } from "../../utils/electionActaExport";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    FileText,
    Download,
    Printer,
    CheckCircle2,
    ShieldCheck,
    Users,
    Vote,
    Calendar,
    Award,
    Building2,
    BookOpen,
    UserCheck,
    ScrollText,
    Percent,
    ExternalLink
} from "lucide-react";

interface ElectionActaModalProps {
    election: GroupElectionDTO;
    isOpen: boolean;
    onClose: () => void;
}

export function ElectionActaModal({ election, isOpen, onClose }: ElectionActaModalProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    const electionDateStr = election.endedAt
        ? format(new Date(election.endedAt), "d 'de' MMMM 'de' yyyy, hh:mm a", { locale: es })
        : (election.startedAt ? format(new Date(election.startedAt), "d 'de' MMMM 'de' yyyy, hh:mm a", { locale: es }) : format(new Date(), "d 'de' MMMM 'de' yyyy, hh:mm a", { locale: es }));

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            exportElectionActaPDF(election);
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const sortedCandidates = [...election.candidates].sort((a, b) => b.votesCount - a.votesCount);
    const voceroPrincipal = election.winners?.voceroPrincipal;
    const voceroSuplente = election.winners?.voceroSuplente;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[96vw] max-w-5xl sm:max-w-5xl md:max-w-5xl lg:max-w-6xl xl:max-w-6xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/80 shadow-2xl rounded-2xl sm:rounded-3xl">
                {/* Header Banner */}
                <div className="bg-slate-950 text-white p-6 sm:p-8 relative overflow-hidden border-b-4 border-emerald-500">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
                                <ScrollText className="w-7 h-7" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-400 flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Documento Institucional Oficial SENA
                                </span>
                                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                                    Acta Oficial de Elección y Posesión
                                </DialogTitle>
                                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                                    Elección de Vocero Principal y Suplente de Grupo | Sistema AcademiX
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 self-start sm:self-auto">
                            <Button
                                size="sm"
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-md gap-2 cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                {isDownloading ? "Generando PDF..." : "Descargar Acta PDF"}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handlePrint}
                                className="border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold text-xs h-10 px-4 rounded-xl gap-2 hidden sm:inline-flex cursor-pointer"
                            >
                                <Printer className="w-4 h-4" />
                                Imprimir
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Body Content / Formatted Official Document */}
                <div className="p-6 sm:p-10 space-y-8 text-foreground bg-card">
                    {/* Document Meta Info Grid (4 Columns) */}
                    <div className="p-5 rounded-2xl bg-muted/30 border border-border/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                        {/* Col 1: Ficha / Grupo */}
                        <div className="space-y-1.5 p-3.5 rounded-xl bg-card border border-border/60 flex flex-col justify-between">
                            <span className="text-muted-foreground font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                <Users className="w-3.5 h-3.5 text-primary" /> Ficha de Formación
                            </span>
                            <div>
                                <p className="text-base sm:text-lg font-black text-foreground">
                                    {election.groupName}
                                </p>
                                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                    {election.programName || "Programa de formación SENA"}
                                </p>
                            </div>
                        </div>

                        {/* Col 2: Ambiente */}
                        <div className="space-y-1.5 p-3.5 rounded-xl bg-card border border-border/60 flex flex-col justify-between">
                            <span className="text-muted-foreground font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Ambiente de Formación
                            </span>
                            <div>
                                <p className="text-sm font-bold text-foreground">
                                    {election.environmentName || "Ambiente Asignado en Sede"}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Sede de aprendizaje presencial
                                </p>
                            </div>
                        </div>

                        {/* Col 3: Materia / Módulo */}
                        <div className="space-y-1.5 p-3.5 rounded-xl bg-card border border-border/60 flex flex-col justify-between">
                            <span className="text-muted-foreground font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Materia / Módulo
                            </span>
                            <div>
                                <p className="text-sm font-bold text-foreground line-clamp-2">
                                    {election.courseName || election.title || "Etapa Lectiva - Módulo Formativo"}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Competencia en desarrollo
                                </p>
                            </div>
                        </div>

                        {/* Col 4: Instructor & Fecha */}
                        <div className="space-y-1.5 p-3.5 rounded-xl bg-card border border-border/60 flex flex-col justify-between">
                            <span className="text-muted-foreground font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Instructor Responsable
                            </span>
                            <div>
                                <p className="text-sm font-bold text-foreground truncate">
                                    {election.createdByTeacherName || "Docente a cargo"}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                    {election.createdByTeacherDoc ? `C.C. ${election.createdByTeacherDoc}` : (election.createdByTeacherEmail || "Verificación institucional")}
                                </p>
                                <div className="pt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Calendar className="w-3 h-3 text-primary shrink-0" />
                                    <span className="truncate">{electionDateStr}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 1: Escrutinio Summary Counters */}
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                            <Vote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            1. Censo Electoral y Participación Ciudadana
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                            <div className="p-4 rounded-xl bg-card border border-border/80 flex flex-col justify-between">
                                <span className="text-[11px] text-muted-foreground font-medium">Censo Electoral Habilitado</span>
                                <span className="text-xl sm:text-2xl font-black text-foreground mt-1.5">
                                    {election.tally.totalEligibleStudents}
                                </span>
                                <span className="text-[11px] text-muted-foreground mt-0.5">Total aprendices de la ficha</span>
                            </div>

                            <div className="p-4 rounded-xl bg-card border border-border/80 flex flex-col justify-between">
                                <span className="text-[11px] text-muted-foreground font-medium">Votantes Efectivos</span>
                                <span className="text-xl sm:text-2xl font-black text-foreground mt-1.5">
                                    {election.tally.totalVotes}
                                </span>
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    {election.tally.participationRate}% Participación
                                </span>
                            </div>

                            <div className="p-4 rounded-xl bg-card border border-border/80 flex flex-col justify-between">
                                <span className="text-[11px] text-muted-foreground font-medium">Candidatos Inscritos</span>
                                <span className="text-xl sm:text-2xl font-black text-foreground mt-1.5">
                                    {election.candidates.length}
                                </span>
                                <span className="text-[11px] text-muted-foreground mt-0.5">Postulaciones validadas</span>
                            </div>

                            <div className="p-4 rounded-xl bg-card border border-border/80 flex flex-col justify-between">
                                <span className="text-[11px] text-muted-foreground font-medium">Votos en Blanco</span>
                                <span className="text-xl sm:text-2xl font-black text-foreground mt-1.5">
                                    {election.tally.blankVotes}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                                    {election.tally.blankVotesPercentage}% de los sufragios
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Detailed Candidate Tally Table */}
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4 text-primary" />
                            2. Escrutinio Oficial y Asignación de Cargos
                        </h4>

                        <div className="overflow-hidden rounded-2xl border border-border/80">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-muted/70 text-muted-foreground font-bold border-b border-border/80">
                                        <th className="py-3 px-4 text-center w-14">#</th>
                                        <th className="py-3 px-4">Candidato / Opción</th>
                                        <th className="py-3 px-4">Identificación / Correo</th>
                                        <th className="py-3 px-4 text-center">Votos Obtenidos</th>
                                        <th className="py-3 px-4 text-center">% Escrutado</th>
                                        <th className="py-3 px-4">Cargo Asignado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {sortedCandidates.map((c, idx) => {
                                        const isPrincipal = voceroPrincipal?.id === c.id;
                                        const isSuplente = voceroSuplente?.id === c.id;

                                        return (
                                            <tr
                                                key={c.id}
                                                className={`transition-colors ${
                                                    isPrincipal
                                                        ? "bg-amber-500/10 font-bold"
                                                        : isSuplente
                                                        ? "bg-sky-500/10 font-medium"
                                                        : "hover:bg-muted/30"
                                                }`}
                                            >
                                                <td className="py-3 px-4 text-center font-bold text-muted-foreground">
                                                    {idx + 1}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-foreground text-sm">
                                                        {c.name}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {c.identificacion ? `C.C./T.I. ${c.identificacion}` : c.email}
                                                </td>
                                                <td className="py-3 px-4 text-center font-black text-foreground text-sm">
                                                    {c.votesCount}
                                                </td>
                                                <td className="py-3 px-4 text-center font-black text-foreground text-sm">
                                                    {c.percentage}%
                                                </td>
                                                <td className="py-3 px-4">
                                                    {isPrincipal && (
                                                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                                                            🥇 Vocero Principal (Electo)
                                                        </Badge>
                                                    )}
                                                    {isSuplente && (
                                                        <Badge className="bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                                                            🥈 Vocero Suplente (Electo)
                                                        </Badge>
                                                    )}
                                                    {!isPrincipal && !isSuplente && (
                                                        <span className="text-muted-foreground text-[11px]">
                                                            Candidato Postulado
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Blank Vote Row */}
                                    <tr className="bg-muted/20 text-muted-foreground">
                                        <td className="py-3 px-4 text-center font-bold">-</td>
                                        <td className="py-3 px-4 font-bold text-foreground">Voto en Blanco</td>
                                        <td className="py-3 px-4">Opción democrática institucional</td>
                                        <td className="py-3 px-4 text-center font-black text-foreground text-sm">
                                            {election.tally.blankVotes}
                                        </td>
                                        <td className="py-3 px-4 text-center font-black text-foreground text-sm">
                                            {election.tally.blankVotesPercentage}%
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-[11px] font-semibold text-muted-foreground">
                                                {election.winners?.isBlankVoteWinner ? "Mayoría en Blanco" : "Opción Neutral"}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 3: Declaración Legal */}
                    <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 text-xs">
                            <h5 className="font-black text-foreground text-sm tracking-tight">
                                Certificación Legal de Elecciones Reales y Transparentes
                            </h5>
                            <p className="text-muted-foreground leading-relaxed text-[11px] sm:text-xs">
                                {ACTA_LEGAL_CONSTANTS.legalDeclaration}
                            </p>
                        </div>
                    </div>

                    {/* Section 4: Responsabilidades del Vocero y Suplente */}
                    <div className="space-y-3.5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            3. Responsabilidades y Deberes Institucionales
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                            {/* Vocero Principal Responsibilities */}
                            <div className="p-5 rounded-2xl bg-card border-2 border-amber-500/30 shadow-2xs flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                                    <Award className="w-4 h-4" />
                                    <span>Deberes del Vocero Principal Electo</span>
                                </div>
                                <ul className="space-y-2 text-muted-foreground leading-relaxed list-disc list-inside">
                                    {ACTA_LEGAL_CONSTANTS.responsibilitiesPrincipal.map((resp, i) => (
                                        <li key={i} className="pl-1">
                                            <span className="text-foreground/90">{resp}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Vocero Suplente Responsibilities */}
                            <div className="p-5 rounded-2xl bg-card border-2 border-sky-500/30 shadow-2xs flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 font-bold text-sm">
                                    <Users className="w-4 h-4" />
                                    <span>Deberes del Vocero Suplente Electo</span>
                                </div>
                                <ul className="space-y-2 text-muted-foreground leading-relaxed list-disc list-inside">
                                    {ACTA_LEGAL_CONSTANTS.responsibilitiesSuplente.map((resp, i) => (
                                        <li key={i} className="pl-1">
                                            <span className="text-foreground/90">{resp}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Firmas de Posesión */}
                    <div className="pt-6 border-t border-border/80">
                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-8 text-center">
                            Firmas Oficiales de Conformidad y Posesión Institucional
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs">
                            <div className="flex flex-col items-center">
                                <div className="w-52 border-b-2 border-muted-foreground/60 mb-2 h-12 flex items-end justify-center pb-1">
                                    <span className="text-[10px] text-muted-foreground font-mono italic">Firma Registrada</span>
                                </div>
                                <span className="font-bold text-foreground text-sm">
                                    {election.createdByTeacherName || "Docente a cargo"}
                                </span>
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    Instructor Responsable
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {election.createdByTeacherDoc ? `C.C. ${election.createdByTeacherDoc}` : "Verificación Digital"}
                                </span>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="w-52 border-b-2 border-muted-foreground/60 mb-2 h-12 flex items-end justify-center pb-1">
                                    <span className="text-[10px] text-muted-foreground font-mono italic">Firma Electa</span>
                                </div>
                                <span className="font-bold text-foreground text-sm">
                                    {voceroPrincipal?.name || "Sin Asignar"}
                                </span>
                                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    Vocero Principal
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {voceroPrincipal?.identificacion ? `Doc. ${voceroPrincipal.identificacion}` : "Electo en jornada"}
                                </span>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="w-52 border-b-2 border-muted-foreground/60 mb-2 h-12 flex items-end justify-center pb-1">
                                    <span className="text-[10px] text-muted-foreground font-mono italic">Firma Electa</span>
                                </div>
                                <span className="font-bold text-foreground text-sm">
                                    {voceroSuplente?.name || "Sin Asignar"}
                                </span>
                                <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                                    Vocero Suplente
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {voceroSuplente?.identificacion ? `Doc. ${voceroSuplente.identificacion}` : "Electo en jornada"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Modal Controls */}
                <DialogFooter className="p-5 bg-muted/30 border-t border-border/80 flex sm:items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground">
                        Documento oficial emitido a través del sistema de votaciones digitales AcademiX SENA.
                    </p>
                    <div className="flex items-center gap-2.5">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="rounded-xl text-xs font-semibold h-10 px-4 cursor-pointer"
                        >
                            Cerrar
                        </Button>
                        <Button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-md gap-2 cursor-pointer"
                        >
                            <Download className="w-4 h-4" />
                            {isDownloading ? "Descargando..." : "Descargar Acta en PDF"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
