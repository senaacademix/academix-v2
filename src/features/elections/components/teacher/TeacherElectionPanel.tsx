"use client";

import React, { useState } from "react";
import { GroupElectionDTO } from "../../types";
import {
    createElectionAction,
    startVotingAction,
    closeElectionAction,
    cancelElectionAction,
    getGroupElectionAction,
} from "../../actions/electionActions";
import { CandidateCard } from "../shared/CandidateCard";
import { ElectionTally } from "../shared/ElectionTally";
import { WinnerShowcase } from "../shared/WinnerShowcase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Award,
    Play,
    CheckCircle2,
    Users,
    AlertTriangle,
    RotateCcw,
    PlusCircle,
    Info,
    RefreshCw,
    StopCircle,
} from "lucide-react";
import { toast } from "sonner";
import { StudentVoceroBadge } from "@/components/StudentVoceroBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TeacherElectionPanelProps {
    groupId: string;
    groupName: string;
    programName?: string;
    totalStudents: number;
    initialElection: GroupElectionDTO | null;
    onRefresh?: () => void;
}

export function TeacherElectionPanel({
    groupId,
    groupName,
    programName,
    totalStudents,
    initialElection,
    onRefresh,
}: TeacherElectionPanelProps) {
    const [election, setElection] = useState<GroupElectionDTO | null>(initialElection);
    const [loading, setLoading] = useState(false);

    // Dialog state for creating an election
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [electionTitle, setElectionTitle] = useState(`Elección de Vocero - ${groupName}`);
    const [electionDesc, setElectionDesc] = useState(
        "Proceso democrático y transparente para elegir el Vocero Principal y Vocero Suplente de la ficha."
    );

    // Confirmation dialogs
    const [startVotingConfirm, setStartVotingConfirm] = useState(false);
    const [closeVotingConfirm, setCloseVotingConfirm] = useState(false);
    const [cancelConfirm, setCancelConfirm] = useState(false);

    const refreshData = async () => {
        try {
            setLoading(true);
            const updated = await getGroupElectionAction(groupId);
            setElection(updated);
            onRefresh?.();
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar estado.");
        } finally {
            setLoading(false);
        }
    };

    // Handler: Create election
    const handleCreateElection = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await createElectionAction(groupId, electionTitle, electionDesc);
            setElection(res.election);
            setCreateDialogOpen(false);
            toast.success("¡Elección habilitada! Se abrieron las postulaciones para los aprendices.");
            onRefresh?.();
        } catch (error: any) {
            toast.error(error.message || "Error al crear la elección.");
        } finally {
            setLoading(false);
        }
    };

    // Handler: Start voting
    const handleStartVoting = async () => {
        if (!election) return;
        try {
            setLoading(true);
            await startVotingAction(election.id);
            toast.success("¡La votación ha iniciado! Los aprendices ya pueden emitir su voto.");
            setStartVotingConfirm(false);
            await refreshData();
        } catch (error: any) {
            toast.error(error.message || "Error al iniciar la votación.");
        } finally {
            setLoading(false);
        }
    };

    // Handler: Close voting
    const handleCloseVoting = async () => {
        if (!election) return;
        try {
            setLoading(true);
            await closeElectionAction(election.id);
            toast.success("¡Votación finalizada con éxito! Resultados oficiales consolidados.");
            setCloseVotingConfirm(false);
            await refreshData();
        } catch (error: any) {
            toast.error(error.message || "Error al finalizar la votación.");
        } finally {
            setLoading(false);
        }
    };

    // Handler: Cancel election
    const handleCancelElection = async () => {
        if (!election) return;
        try {
            setLoading(true);
            await cancelElectionAction(election.id);
            toast.success("Elección cancelada.");
            setCancelConfirm(false);
            await refreshData();
        } catch (error: any) {
            toast.error(error.message || "Error al cancelar la elección.");
        } finally {
            setLoading(false);
        }
    };

    const hasMinCandidates = (election?.candidates.length || 0) >= (election?.minCandidates || 2);

    return (
        <div className="w-full flex flex-col gap-5">
            {/* Header info row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 sm:p-5 rounded-2xl border border-border/70 shadow-2xs">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                            {groupName}
                        </h2>
                        {programName && (
                            <Badge variant="outline" className="text-xs font-semibold text-muted-foreground">
                                {programName}
                            </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs font-medium gap-1">
                            <Users className="w-3 h-3 text-primary" />
                            {totalStudents} aprendices
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Gestión del proceso electoral de vocería de la ficha.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={refreshData}
                        disabled={loading}
                        className="h-8 px-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                        Actualizar
                    </Button>

                    {!election && (
                        <Button
                            size="sm"
                            onClick={() => setCreateDialogOpen(true)}
                            className="h-8 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90"
                        >
                            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                            Habilitar Elección
                        </Button>
                    )}
                </div>
            </div>

            {/* State A: No election created yet */}
            {!election && (
                <div className="flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl bg-card border border-dashed border-border text-center">
                    <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 mb-4">
                        <Award className="w-8 h-8" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                        No hay una elección activa para esta ficha
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mt-1.5 leading-relaxed">
                        Como instructor puedes habilitar la postulación de voceros. Una vez habilitada, todos los aprendices verán la opción para postularse en su panel de AcademiX.
                    </p>
                    <Button
                        onClick={() => setCreateDialogOpen(true)}
                        className="mt-6 rounded-2xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold shadow-sm hover:bg-primary/90 px-6 py-2.5"
                    >
                        <Award className="w-4 h-4 mr-2" />
                        Habilitar Elección de Vocero y Suplente
                    </Button>
                </div>
            )}

            {/* State B: POSTULATION */}
            {election && election.status === "POSTULATION" && (
                <div className="flex flex-col gap-5">
                    {/* Status card */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm sm:text-base font-black text-foreground tracking-tight">
                                        Fase de Postulación Abierta
                                    </h3>
                                    <Badge className="bg-amber-500 text-white dark:bg-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        Postulaciones Activas
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Los aprendices pueden postularse desde su panel. Se requieren mínimo 2 postulantes (uno para vocero y otro para suplente) para poder iniciar las votaciones.
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCancelConfirm(true)}
                                className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-destructive"
                            >
                                Cancelar Proceso
                            </Button>
                            <Button
                                size="sm"
                                disabled={!hasMinCandidates || loading}
                                onClick={() => setStartVotingConfirm(true)}
                                className={`rounded-xl text-xs font-bold shadow-xs ${
                                    hasMinCandidates
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary/20"
                                        : "opacity-60"
                                }`}
                            >
                                <Play className="w-3.5 h-3.5 mr-1.5" />
                                Iniciar Votación
                            </Button>
                        </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/70 text-xs">
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-semibold text-foreground">
                                Postulantes inscritos:{" "}
                                <strong className="font-black text-primary">
                                    {election.candidates.length} de {election.minCandidates} requeridos
                                </strong>
                            </span>
                        </div>
                        {hasMinCandidates ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Listo para iniciar votación
                            </Badge>
                        ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                                Faltan {election.minCandidates - election.candidates.length} candidato(s)
                            </span>
                        )}
                    </div>

                    {/* Candidates Grid */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                            Candidatos Registrados ({election.candidates.length})
                        </h4>

                        {election.candidates.length === 0 ? (
                            <div className="p-8 rounded-2xl bg-card border border-dashed border-border text-center text-xs text-muted-foreground">
                                Aún no se ha postulado ningún aprendiz. Cuando se postulen aparecerán aquí.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {election.candidates.map((c) => (
                                    <CandidateCard key={c.id} candidate={c} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* State C: VOTING */}
            {election && election.status === "VOTING" && (
                <div className="flex flex-col gap-5">
                    {/* Status header banner */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <Play className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm sm:text-base font-black text-foreground tracking-tight">
                                        Votación en Curso
                                    </h3>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full animate-pulse">
                                        ● En Vivo
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Los aprendices están emitiendo sus votos de forma única e irreversible. El conteo es 100% transparente para todos.
                                </p>
                            </div>
                        </div>

                        <Button
                            size="sm"
                            onClick={() => setCloseVotingConfirm(true)}
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-xs shrink-0 gap-1.5"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Finalizar y Cerrar Votación
                        </Button>
                    </div>

                    {/* Transparent Live Tally */}
                    <ElectionTally
                        tally={election.tally}
                        candidates={election.candidates}
                        status={election.status}
                    />

                    {/* Candidate cards with live counts */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                            Candidatos y Votos Obtenidos
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {election.candidates.map((c) => (
                                <CandidateCard
                                    key={c.id}
                                    candidate={c}
                                    showVotes={true}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* State D: CLOSED */}
            {election && election.status === "CLOSED" && (
                <div className="flex flex-col gap-5">
                    {/* Winner Showcase */}
                    <WinnerShowcase
                        winners={election.winners}
                        tally={election.tally}
                        candidates={election.candidates}
                        totalVotes={election.tally.totalVotes}
                        election={election}
                        isTeacher={true}
                    />

                    {/* Final Tally */}
                    <ElectionTally
                        tally={election.tally}
                        candidates={election.candidates}
                        status={election.status}
                    />

                    {/* Start new election option */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/70">
                        <div>
                            <h4 className="text-xs sm:text-sm font-bold text-foreground">
                                ¿Deseas convocar un nuevo proceso electoral para esta ficha?
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Puedes iniciar una nueva elección si se requiere relevar la vocería o convocar a un nuevo periodo formativo.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCreateDialogOpen(true)}
                            className="rounded-xl text-xs font-bold shrink-0"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Habilitar Nueva Elección
                        </Button>
                    </div>
                </div>
            )}

            {/* Modal: Create Election */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-md rounded-3xl p-6">
                    <form onSubmit={handleCreateElection} className="space-y-4">
                        <DialogHeader className="space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                <Award className="w-6 h-6" />
                            </div>
                            <DialogTitle className="text-lg font-black text-foreground tracking-tight">
                                Habilitar Elección de Vocero
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                                Se abrirá inmediatamente la fase de postulación para que los aprendices de la ficha <strong>{groupName}</strong> inscriban sus candidaturas.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="title" className="text-xs font-bold text-foreground">
                                    Título de la Elección
                                </Label>
                                <Input
                                    id="title"
                                    value={electionTitle}
                                    onChange={(e) => setElectionTitle(e.target.value)}
                                    className="rounded-xl text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="desc" className="text-xs font-bold text-foreground">
                                    Indicaciones o Descripción
                                </Label>
                                <Textarea
                                    id="desc"
                                    value={electionDesc}
                                    onChange={(e) => setElectionDesc(e.target.value)}
                                    className="rounded-xl text-xs resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-4 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateDialogOpen(false)}
                                className="rounded-xl text-xs font-semibold"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading || !electionTitle.trim()}
                                className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90"
                            >
                                {loading ? "Habilitando..." : "Habilitar Postulaciones"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Alert Dialog: Confirm Start Voting */}
            <AlertDialog open={startVotingConfirm} onOpenChange={setStartVotingConfirm}>
                <AlertDialogContent className="max-w-md rounded-3xl p-6">
                    <AlertDialogHeader className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                            <Play className="w-6 h-6" />
                        </div>
                        <AlertDialogTitle className="text-lg font-black text-foreground tracking-tight">
                            ¿Iniciar fase de votación?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Se cerrará el registro de nuevas postulaciones y se habilitará la urna virtual para que todos los aprendices voten. Recuerda que los aprendices no podrán cambiar su voto una vez emitido.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="rounded-xl text-xs font-semibold">
                            Revisar postulantes
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleStartVoting}
                            className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90"
                        >
                            Sí, iniciar votación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Alert Dialog: Confirm Close Voting */}
            <AlertDialog open={closeVotingConfirm} onOpenChange={setCloseVotingConfirm}>
                <AlertDialogContent className="max-w-md rounded-3xl p-6">
                    <AlertDialogHeader className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                            <Award className="w-6 h-6" />
                        </div>
                        <AlertDialogTitle className="text-lg font-black text-foreground tracking-tight">
                            ¿Finalizar la votación de la ficha?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Al cerrar la votación se consolidará el escrutinio oficial y se proclamarán formalmente el <strong>Vocero Principal</strong> y el <strong>Vocero Suplente</strong> elegidos por los aprendices.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="rounded-xl text-xs font-semibold">
                            Continuar votación
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCloseVoting}
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-xs"
                        >
                            Sí, finalizar y proclamar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Alert Dialog: Confirm Cancel Election */}
            <AlertDialog open={cancelConfirm} onOpenChange={setCancelConfirm}>
                <AlertDialogContent className="max-w-md rounded-3xl p-6">
                    <AlertDialogHeader className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <AlertDialogTitle className="text-lg font-black text-foreground tracking-tight">
                            ¿Cancelar este proceso electoral?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Esta acción cancelará la elección actual y removerá las postulaciones registradas hasta el momento. Podrás crear una nueva elección cuando lo consideres.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="rounded-xl text-xs font-semibold">
                            Volver
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelElection}
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold shadow-xs"
                        >
                            Sí, cancelar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
