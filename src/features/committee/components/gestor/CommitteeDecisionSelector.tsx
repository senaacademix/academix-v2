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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Check,
    Loader2,
    Edit3,
    Ban,
    AlertTriangle,
    ShieldCheck,
    HelpCircle,
    X
} from "lucide-react";
import { updateReportDecisionAction } from "../../actions/committeeActions";
import { toast } from "sonner";

interface CommitteeDecisionSelectorProps {
    reportId: string;
    currentDecision: string | null;
    onUpdated?: (newDecision: string | null) => void;
    compact?: boolean;
}

const PRESET_DECISIONS = ["Cancelado", "Condicionado", "Absuelto"] as const;

export function CommitteeDecisionSelector({
    reportId,
    currentDecision,
    onUpdated,
    compact = false
}: CommitteeDecisionSelectorProps) {
    const [decision, setDecision] = useState<string | null>(currentDecision);
    const [isSaving, setIsSaving] = useState(false);
    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const [customInput, setCustomInput] = useState("");

    useEffect(() => {
        setDecision(currentDecision);
        if (currentDecision && !PRESET_DECISIONS.includes(currentDecision as any)) {
            setCustomInput(currentDecision);
        }
    }, [currentDecision]);

    const isPreset = decision && PRESET_DECISIONS.includes(decision as any);
    const isCustom = decision && !isPreset;

    const handleSaveDecision = async (newVal: string | null) => {
        setIsSaving(true);
        try {
            await updateReportDecisionAction(reportId, newVal);
            setDecision(newVal);
            onUpdated?.(newVal);
            toast.success(
                newVal
                    ? `Solución del comité asignada: "${newVal}"`
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
            await handleSaveDecision(null);
        } else if (val === "OTRO") {
            setIsCustomOpen(true);
        } else {
            await handleSaveDecision(val);
        }
    };

    const handleSaveCustom = async () => {
        const trimmed = customInput.trim();
        if (!trimmed) {
            toast.error("Por favor escribe la solución personalizada del comité.");
            return;
        }
        setIsCustomOpen(false);
        await handleSaveDecision(trimmed);
    };

    // Styling configuration based on decision
    const getBadgeStyle = () => {
        if (decision === "Cancelado") {
            return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/25";
        }
        if (decision === "Condicionado") {
            return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25";
        }
        if (decision === "Absuelto") {
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
        if (decision === "Absuelto") return <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
        if (isCustom) return <Edit3 className="w-3 h-3 text-purple-600 dark:text-purple-400" />;
        return <HelpCircle className="w-3 h-3 text-muted-foreground/60" />;
    };

    // Current select value representation
    const currentSelectValue = isPreset ? decision : isCustom ? "OTRO" : "PENDING";

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
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
                    <SelectItem value="Absuelto" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        🛡️ Absuelto
                    </SelectItem>
                    <SelectItem value="OTRO" className="text-xs font-medium text-purple-600 dark:text-purple-400">
                        ✏️ Otro (Escribir solución...)
                    </SelectItem>
                </SelectContent>
            </Select>

            {/* Custom Popover Dialog if "Otro" is chosen or needs edit */}
            <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
                <PopoverTrigger asChild>
                    {isCustom ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsCustomOpen(true)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-purple-600 rounded-md"
                            title="Editar texto de la solución personalizada"
                        >
                            <Edit3 className="w-3 h-3" />
                        </Button>
                    ) : (
                        <span />
                    )}
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3 space-y-2.5 z-50 text-xs shadow-xl border-border/80">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1">
                            <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                            Solución Personalizada del Comité
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsCustomOpen(false)}
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    </div>

                    <Input
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Ej: Plan de mejoramiento a 15 días, llamado de atención..."
                        className="text-xs h-8"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveCustom();
                            }
                        }}
                    />

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setIsCustomOpen(false)}
                            className="h-7 px-2 text-[11px]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveCustom}
                            disabled={!customInput.trim() || isSaving}
                            className="h-7 px-2.5 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
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
