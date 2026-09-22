"use client";

import React, { useState } from "react";
import { GroupElectionDTO } from "../../types";
import {
    castVoteAction,
    withdrawCandidacyAction,
    getStudentElectionAction,
} from "../../actions/electionActions";
import { CandidateCard } from "../shared/CandidateCard";
import { ElectionTally } from "../shared/ElectionTally";
import { WinnerShowcase } from "../shared/WinnerShowcase";
import { PostulationDialog } from "../shared/PostulationDialog";
import { FullscreenVotingBooth } from "./FullscreenVotingBooth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
    Award,
    Vote,
    CheckCircle2,
    Sparkles,
    AlertCircle,
    UserCheck,
    RefreshCw,
    Maximize2,
    LogOut,
} from "lucide-react";
import { toast } from "sonner";

interface StudentElectionDashboardProps {
    initialElection: GroupElectionDTO | null;
    group: { id: string; name: string; programName?: string } | null;
    studentName: string;
}

export function StudentElectionDashboard({
    initialElection,
    group,
    studentName,
}: StudentElectionDashboardProps) {
    const [election, setElection] = useState<GroupElectionDTO | null>(initialElection);
    const [loading, setLoading] = useState(false);

    // Dialog states
    const [postulationOpen, setPostulationOpen] = useState(false);
    const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);

    // Fullscreen voting booth state (auto-opens if user has not voted yet)
    const [votingBoothOpen, setVotingBoothOpen] = useState(true);
    const [isVoting, setIsVoting] = useState(false);

    const refreshData = async () => {
        try {
            setLoading(true);
            const res = await getStudentElectionAction();
            setElection(res.election);
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar estado.");
        } finally {
            setLoading(false);
        }
    };

    // Handler: Withdraw candidacy
    const handleWithdraw = async () => {
        if (!election) return;
        try {
            setLoading(true);
            await withdrawCandidacyAction(election.id);
            toast.success("Has retirado tu postulación.");
            setWithdrawConfirmOpen(false);
            await refreshData();
        } catch (error: any) {
            toast.error(error.message || "Error al retirar la postulación.");
        } finally {
            setLoading(false);
        }
    };

    // Handler: Submit vote from Fullscreen Voting Booth
    const handleBoothVoteSubmit = async (candidateId?: string, isBlankVote: boolean = false) => {
        if (!election) return;
        try {
            setIsVoting(true);
            await castVoteAction(election.id, candidateId, isBlankVote);
            toast.success("¡Tu voto ha sido emitido y registrado exitosamente!");
            setVotingBoothOpen(false);
            await refreshData();
        } catch (error: any) {
            toast.error(error.message || "Error al emitir el voto.");
        } finally {
            setIsVoting(false);
        }
    };

    // If student has no group assigned
    if (!group) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-card rounded-3xl border border-dashed border-border text-center max-w-lg mx-auto">
                <AlertCircle className="w-12 h-12 text-muted-foreground/60 mb-3" />
                <h3 className="text-base font-bold text-foreground">Sin Ficha Asignada</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    No apareces inscrito en ninguna ficha activa actualmente. Comunícate con tu instructor o coordinador para verificar tu matrícula.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-5 pb-12">
            {/* Header Identity Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 sm:p-5 rounded-2xl border border-border/70 shadow-2xs">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                            Elección de Vocero de Ficha
                        </h1>
                        <Badge variant="outline" className="text-xs font-bold border-primary/30 text-primary bg-primary/5">
                            Ficha: {group.name}
                        </Badge>
                        {group.programName && (
                            <Badge variant="secondary" className="text-xs font-semibold text-muted-foreground">
                                {group.programName}
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Hola, <strong>{studentName}</strong>. Aquí puedes participar en la elección democrática de tu vocero y suplente.
                    </p>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshData}
                    disabled={loading}
                    className="h-8 px-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground self-start sm:self-auto"
                >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                    Actualizar
                </Button>
            </div>

            {/* Case 1: No active election in this group */}
            {!election && (
                <div className="flex flex-col items-center justify-center p-10 sm:p-14 rounded-3xl bg-card border border-dashed border-border text-center">
                    <div className="w-16 h-16 rounded-3xl bg-muted text-muted-foreground flex items-center justify-center mb-4">
                        <Award className="w-8 h-8" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                        No hay una elección activa en este momento
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mt-1.5 leading-relaxed">
                        Tu instructor habilitará el proceso electoral cuando sea el momento de elegir al Vocero y al Vocero Suplente de la ficha <strong>{group.name}</strong>.
                    </p>
                </div>
            )}

            {/* Case 2: POSTULATION */}
            {election && election.status === "POSTULATION" && (
                <div className="flex flex-col gap-5">
                    {/* Postulation Callout */}
                    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-card to-primary/5 border border-amber-500/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                                <Award className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                                        ¡Postulaciones Abiertas!
                                    </h2>
                                    <Badge className="bg-amber-500 text-white dark:bg-amber-600 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                                        Fase de Postulación
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xl">
                                    El vocero es el líder de la ficha que canaliza inquietudes, coordina actividades académicas y representa al grupo ante instructores y directivas. ¿Te gustaría asumir este rol?
                                </p>
                            </div>
                        </div>

                        {/* Student postulation CTA */}
                        <div className="shrink-0">
                            {election.isUserPostulated ? (
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl gap-1.5 shadow-2xs">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Estás postulado
                                    </Badge>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setWithdrawConfirmOpen(true)}
                                        className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-destructive"
                                    >
                                        <LogOut className="w-3 h-3 mr-1" />
                                        Retirar postulación
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    size="lg"
                                    onClick={() => setPostulationOpen(true)}
                                    className="rounded-2xl bg-primary text-primary-foreground font-black text-xs sm:text-sm shadow-md hover:bg-primary/90 px-6"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Postularme como Vocero
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Progress indicator toward quorum */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/70 text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-primary" />
                            Postulantes actuales:{" "}
                            <strong className="font-black text-primary">
                                {election.candidates.length} de {election.minCandidates} requeridos
                            </strong>
                        </span>
                        <span className="text-[11px] text-muted-foreground italic">
                            {election.candidates.length >= election.minCandidates
                                ? "Mínimo alcanzado. El instructor iniciará las votaciones pronto."
                                : "Se requieren al menos 2 postulantes para iniciar las votaciones."}
                        </span>
                    </div>

                    {/* Candidates Registered */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                            Compañeros Postulados ({election.candidates.length})
                        </h3>

                        {election.candidates.length === 0 ? (
                            <div className="p-8 rounded-2xl bg-card border border-dashed border-border text-center text-xs text-muted-foreground">
                                Aún no hay compañeros postulados. ¡Sé el primero en postularte!
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {election.candidates.map((c) => (
                                    <CandidateCard
                                        key={c.id}
                                        candidate={c}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Case 3: VOTING */}
            {election && election.status === "VOTING" && (
                <div className="flex flex-col gap-6">
                    {/* Voting status card */}
                    <div className="p-5 sm:p-6 rounded-3xl bg-primary/10 border border-primary/25 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                        <div className="flex items-start sm:items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                                <Vote className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                                        Urna Virtual Abierta
                                    </h2>
                                    <Badge className="bg-primary text-primary-foreground text-[10px] font-black px-2.5 py-0.5 rounded-full">
                                        Votación en Curso
                                    </Badge>
                                </div>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    {election.hasVoted
                                        ? "Ya has ejercido tu voto. A continuación puedes consultar el escrutinio oficial en vivo."
                                        : "La cabina de votación en pantalla completa está disponible para emitir tu voto."}
                                </p>
                            </div>
                        </div>

                        {election.hasVoted ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3.5 py-2 rounded-xl gap-1.5 shadow-2xs self-start md:self-auto">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                Voto Registrado Exitosamente
                            </Badge>
                        ) : (
                            <Button
                                size="lg"
                                onClick={() => setVotingBoothOpen(true)}
                                className="rounded-2xl bg-primary text-primary-foreground text-xs sm:text-sm font-black shadow-md hover:bg-primary/90 h-11 px-5 gap-2 shrink-0"
                            >
                                <Maximize2 className="w-4 h-4" />
                                Abrir Cabina de Votación
                            </Button>
                        )}
                    </div>

                    {/* Fullscreen Voting Booth (100% Screen Modal) */}
                    {!election.hasVoted && (
                        <FullscreenVotingBooth
                            open={votingBoothOpen}
                            onClose={() => setVotingBoothOpen(false)}
                            candidates={election.candidates}
                            groupName={group.name}
                            programName={group.programName}
                            onVoteSubmit={handleBoothVoteSubmit}
                            isSubmitting={isVoting}
                        />
                    )}

                    {/* Transparent Live Tally */}
                    <ElectionTally
                        tally={election.tally}
                        candidates={election.candidates}
                        status={election.status}
                    />
                </div>
            )}

            {/* Case 4: CLOSED */}
            {election && election.status === "CLOSED" && (
                <div className="flex flex-col gap-6">
                    {/* Winner Showcase with official counts for Vocero, Suplente, and Blanco */}
                    <WinnerShowcase
                        winners={election.winners}
                        tally={election.tally}
                        candidates={election.candidates}
                        totalVotes={election.tally.totalVotes}
                        election={election}
                        isTeacher={false}
                    />

                    {/* Final Tally */}
                    <ElectionTally
                        tally={election.tally}
                        candidates={election.candidates}
                        status={election.status}
                    />
                </div>
            )}

            {/* Postulation Dialog */}
            {election && (
                <PostulationDialog
                    open={postulationOpen}
                    onOpenChange={setPostulationOpen}
                    electionId={election.id}
                    onSuccess={refreshData}
                />
            )}

            {/* Withdraw Candidacy Confirmation Dialog */}
            <AlertDialog open={withdrawConfirmOpen} onOpenChange={setWithdrawConfirmOpen}>
                <AlertDialogContent className="max-w-md rounded-3xl p-6">
                    <AlertDialogHeader className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <AlertDialogTitle className="text-lg font-black text-foreground tracking-tight">
                            ¿Retirar tu postulación?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Ya no aparecerás en la lista de candidatos para la vocería de esta ficha. Si cambias de opinión, podrás volver a postularte mientras la fase de postulación siga abierta.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="rounded-xl text-xs font-semibold">
                            Continuar postulado
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleWithdraw}
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold shadow-xs"
                        >
                            Sí, retirar postulación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
