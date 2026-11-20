"use client";

import React, { useState, useEffect } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Check,
    Loader2,
    Edit3,
    Ban,
    AlertTriangle,
    ShieldCheck,
    LogOut,
    HelpCircle,
    MessageSquareText,
    X
} from "lucide-react";
import { updateReportDecisionAction } from "../../actions/committeeActions";
import { toast } from "sonner";

interface CommitteeDecisionSelectorProps {
    reportId: string;
    currentDecision: string | null;
    currentObservation?: string | null;
    onUpdated?: (newDecision: string | null, newObservation?: string | null) => void;
    compact?: boolean;
}

const PRESET_DECISIONS = ["Cancelado", "Condicionado", "Retiro Voluntario", "Exonerado"] as const;

function normalizeDecisionValue(val: string | null): string | null {
    if (!val) return null;
    if (val.trim().toLowerCase() === "absuelto") return "Exonerado";
    return val;
}

export function CommitteeDecisionSelector({
    reportId,
    currentDecision,
    currentObservation = null,
    onUpdated
}: CommitteeDecisionSelectorProps) {
    const [decision, setDecision] = useState<string | null>(normalizeDecisionValue(currentDecision));
    const [observation, setObservation] = useState<string>(currentObservation || "");
    const [isSaving, setIsSaving] = useState(false);

    // Popover state for configuring custom decision name and/or gestor observation
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [pendingDecisionMode, setPendingDecisionMode] = useState<string | null>(null);
    const [customDecisionInput, setCustomDecisionInput] = useState("");
    const [draftObservation, setDraftObservation] = useState("");

    useEffect(() => {
        const normalized = normalizeDecisionValue(currentDecision);
        setDecision(normalized);
        if (normalized && !PRESET_DECISIONS.includes(normalized as any)) {
            setCustomDecisionInput(normalized);
        }
    }, [currentDecision]);

    useEffect(() => {
        setObservation(currentObservation || "");
    }, [currentObservation]);

    const isPreset = decision && PRESET_DECISIONS.includes(decision as any);
    const isCustom = decision && !isPreset;

    const handleSaveDecision = async (newDecisionVal: string | null, newObsVal: string | null) => {
        setIsSaving(true);
        try {
            const cleanObs = newDecisionVal ? (newObsVal?.trim() || null) : null;
            await updateReportDecisionAction(reportId, newDecisionVal, cleanObs);
            setDecision(newDecisionVal);
            setObservation(cleanObs || "");
            onUpdated?.(newDecisionVal, cleanObs);
            toast.success(
                newDecisionVal
                    ? `Solución del comité guardada: "${newDecisionVal}"`
                    : "Solución del comité reiniciada a pendiente."
            );
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar la solución del comité.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectChange = async (val: string) => {
        if (val === "PENDING") {
            await handleSaveDecision(null, null);
        } else if (val === "OTRO") {
            setPendingDecisionMode("OTRO");
            setCustomDecisionInput(isCustom ? (decision || "") : "");
            setDraftObservation(observation || "");
            setIsEditorOpen(true);
        } else {
            // Save the selected preset immediately and open the observation popover so the Gestor can add/edit the observation
            await handleSaveDecision(val, observation || null);
            setPendingDecisionMode(val);
            setDraftObservation(observation || "");
            setIsEditorOpen(true);
        }
    };

    const handleOpenObservationEditor = () => {
        if (!decision) return;
        setPendingDecisionMode(isPreset ? decision : "OTRO");
        if (!isPreset) {
            setCustomDecisionInput(decision);
        }
        setDraftObservation(observation || "");
        setIsEditorOpen(true);
    };

    const handleConfirmPopoverSave = async () => {
        let finalDecision = pendingDecisionMode;
        if (pendingDecisionMode === "OTRO") {
            const trimmedCustom = customDecisionInput.trim();
            if (!trimmedCustom) {
                toast.error("Por favor escribe la solución personalizada del comité.");
                return;
            }
            finalDecision = trimmedCustom;
        }
        if (!finalDecision) return;

        setIsEditorOpen(false);
        await handleSaveDecision(finalDecision, draftObservation);
    };

    const getBadgeStyle = () => {
        if (decision === "Cancelado") {
            return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/25";
        }
        if (decision === "Condicionado") {
            return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25";
        }
        if (decision === "Retiro Voluntario") {
            return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 hover:bg-sky-500/25";
        }
        if (decision === "Exonerado") {
            return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25";
        }
        if (isCustom) {
            return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/25";
        }
        return "bg-muted text-muted-foreground border-border hover:bg-accent";
    };

    const getDecisionIcon = () => {
        if (isSaving) return <Loader2 className="w-3 h-3 animate-spin text-primary" />;
        if (decision === "Cancelado") return <Ban className="w-3 h-3 text-rose-600 dark:text-rose-400" />;
        if (decision === "Condicionado") return <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
        if (decision === "Retiro Voluntario") return <LogOut className="w-3 h-3 text-sky-600 dark:text-sky-400" />;
        if (decision === "Exonerado") return <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
        if (isCustom) return <Edit3 className="w-3 h-3 text-purple-600 dark:text-purple-400" />;
        return <HelpCircle className="w-3 h-3 text-muted-foreground/60" />;
    };

    const currentSelectValue = isPreset ? decision : isCustom ? "OTRO" : "PENDING";

    return (
        <div className="flex items-center gap-1 flex-wrap">
            <Select
                value={currentSelectValue}
                onValueChange={handleSelectChange}
                disabled={isSaving}
            >
                <SelectTrigger
                    className={`h-7 px-2 text-[11px] font-semibold border rounded-lg transition-all shadow-2xs gap-1.5 ${getBadgeStyle()}`}
                    title={decision ? `Solución asignada: ${decision}` : "Determinar solución del comité"}
                >
                    <div className="flex items-center gap-1 truncate max-w-[130px]">
                        {getDecisionIcon()}
                        <span className="truncate">
                            {decision ? decision : "Sin definir"}
                        </span>
                    </div>
                </SelectTrigger>
                <SelectContent align="end" className="text-xs min-w-[190px]">
                    <SelectItem value="PENDING" className="text-xs text-muted-foreground">
                        ⏳ Sin definir (Pendiente)
                    </SelectItem>
                    <SelectItem value="Cancelado" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                        🚫 Cancelado
                    </SelectItem>
                    <SelectItem value="Condicionado" className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        ⚠️ Condicionado
                    </SelectItem>
                    <SelectItem value="Retiro Voluntario" className="text-xs font-medium text-sky-600 dark:text-sky-400">
                        🚪 Retiro Voluntario
                    </SelectItem>
                    <SelectItem value="Exonerado" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        🛡️ Exonerado
                    </SelectItem>
                    <SelectItem value="OTRO" className="text-xs font-medium text-purple-600 dark:text-purple-400">
                        ✏️ Otro (Escribir solución...)
                    </SelectItem>
                </SelectContent>
            </Select>

            {/* Popover for adding/editing Gestor Observation (and custom decision name if OTRO) */}
            <Popover open={isEditorOpen} onOpenChange={setIsEditorOpen}>
                <TooltipProvider delayDuration={120}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                                {decision ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleOpenObservationEditor}
                                        className={`h-7 w-7 p-0 rounded-lg border transition-colors ${
                                            observation.trim()
                                                ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                                : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
                                        }`}
                                    >
                                        <MessageSquareText className="w-3.5 h-3.5" />
                                    </Button>
                                ) : (
                                    <span />
                                )}
                            </PopoverTrigger>
                        </TooltipTrigger>
                        {decision && (
                            <TooltipContent side="top" className="max-w-xs p-2.5 space-y-1 text-xs">
                                <p className="font-bold text-foreground">
                                    {observation.trim()
                                        ? "Observación del Gestor (clic para editar):"
                                        : "Agregar observación a la solución"}
                                </p>
                                {observation.trim() && (
                                    <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-snug">
                                        {observation}
                                    </p>
                                )}
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>

                <PopoverContent className="w-80 p-3.5 space-y-3 z-50 text-xs shadow-xl border-border/80">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                            <MessageSquareText className="w-3.5 h-3.5 text-primary" />
                            <span>
                                {pendingDecisionMode === "OTRO"
                                    ? "Solución y Observación del Comité"
                                    : `Observación — ${pendingDecisionMode || decision}`}
                            </span>
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsEditorOpen(false)}
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    </div>

                    {pendingDecisionMode === "OTRO" && (
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground block">
                                Solución personalizada <span className="text-destructive">*</span>
                            </label>
                            <Input
                                type="text"
                                value={customDecisionInput}
                                onChange={(e) => setCustomDecisionInput(e.target.value)}
                                placeholder="Ej: Plan de mejoramiento, llamado de atención..."
                                className="text-xs h-8"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-foreground block">
                            Observación del Gestor Académico
                        </label>
                        <Textarea
                            value={draftObservation}
                            onChange={(e) => setDraftObservation(e.target.value)}
                            placeholder="Escribe la observación o compromisos definidos en el comité (visible para el instructor)..."
                            rows={3}
                            className="text-xs resize-none"
                            autoFocus={pendingDecisionMode !== "OTRO"}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditorOpen(false)}
                            className="h-7 px-2.5 text-[11px]"
                        >
                            Cerrar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleConfirmPopoverSave}
                            disabled={(pendingDecisionMode === "OTRO" && !customDecisionInput.trim()) || isSaving}
                            className="h-7 px-3 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
                        >
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            <span>Guardar</span>
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
