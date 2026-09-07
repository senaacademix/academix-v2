"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Building2, 
    Users, 
    Layers, 
    MapPin, 
    Laptop, 
    CheckCircle2, 
    Sparkles,
    FileText,
    FileSpreadsheet,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { exportProgramEnvironmentsPdf, exportProgramEnvironmentsExcel } from "../../utils/programExportUtils";

interface ProgramEnvironmentsTabProps {
    program: any;
}

export function ProgramEnvironmentsTab({ program }: ProgramEnvironmentsTabProps) {
    const environments = useMemo(() => program.environments || [], [program.environments]);
    const groups = useMemo(() => program.groups || [], [program.groups]);

    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const handleExportPdf = async () => {
        setIsExportingPdf(true);
        toast.info("Generando PDF de ambientes con @react-pdf/renderer...");
        try {
            await exportProgramEnvironmentsPdf(program);
            toast.success("PDF de ambientes descargado exitosamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar los ambientes en PDF");
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleExportExcel = async () => {
        setIsExportingExcel(true);
        toast.info("Generando Excel de ambientes con ExcelJS...");
        try {
            await exportProgramEnvironmentsExcel(program);
            toast.success("Excel de ambientes descargado exitosamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar los ambientes en Excel");
        } finally {
            setIsExportingExcel(false);
        }
    };

    // Map environments with their groups in this program
    const envsWithUsage = useMemo(() => {
        // Collect environments both from program.environments and from group.environment
        const envMap = new Map<string, any>();

        environments.forEach((env: any) => {
            envMap.set(env.id, {
                ...env,
                usedByGroups: []
            });
        });

        groups.forEach((g: any) => {
            if (g.environment) {
                if (!envMap.has(g.environment.id)) {
                    envMap.set(g.environment.id, {
                        ...g.environment,
                        usedByGroups: []
                    });
                }
                const existing = envMap.get(g.environment.id);
                if (!existing.usedByGroups.some((grp: any) => grp.id === g.id)) {
                    existing.usedByGroups.push({
                        id: g.id,
                        name: g.name,
                        categoria: g.categoria,
                        studentCount: g.students?.length || 0
                    });
                }
            }
        });

        return Array.from(envMap.values());
    }, [environments, groups]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
                <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-foreground">Ambientes de Aprendizaje e Infraestructura</h3>
                    <p className="text-xs text-muted-foreground">
                        Espacios físicos y tecnológicos asociados a las fichas de formación de este programa.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary border-primary/20">
                        {envsWithUsage.length} {envsWithUsage.length === 1 ? "Ambiente" : "Ambientes"}
                    </Badge>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPdf}
                        disabled={isExportingPdf}
                        className="h-8 gap-1.5 rounded-xl text-xs font-bold border-red-500/30 text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 shadow-xs shrink-0"
                        title="Exportar ambientes en PDF (@react-pdf/renderer)"
                    >
                        {isExportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
                        <span>Exportar PDF</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        disabled={isExportingExcel}
                        className="h-8 gap-1.5 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-xs shrink-0"
                        title="Exportar ambientes en Excel estilizado (ExcelJS)"
                    >
                        {isExportingExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                        <span>Exportar Excel</span>
                    </Button>
                </div>
            </div>

            {envsWithUsage.length === 0 ? (
                <div className="p-12 text-center bg-card rounded-3xl border border-dashed border-border/70">
                    <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <h4 className="font-bold text-foreground text-sm">Sin ambientes asignados</h4>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                        Este programa o sus fichas no tienen ambientes de formación vinculados actualmente.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {envsWithUsage.map((env: any) => (
                        <Card key={env.id} className="border border-border/80 bg-card shadow-xs rounded-3xl overflow-hidden flex flex-col justify-between">
                            <CardHeader className="p-5 border-b border-border/60">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-foreground truncate">
                                                {env.name}
                                            </h4>
                                            {env.location && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{env.location}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {env.capacity && (
                                        <Badge variant="outline" className="text-[11px] font-bold bg-muted/40 shrink-0">
                                            Cap. {env.capacity}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="p-5 space-y-4 flex-1">
                                {env.description && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {env.description}
                                    </p>
                                )}

                                {/* Resources pills */}
                                {env.resources && env.resources.length > 0 && (
                                    <div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                                            Recursos del Ambiente
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {env.resources.map((res: string, idx: number) => (
                                                <span key={idx} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                                                    {res}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Fichas using this environment */}
                                <div className="pt-2 border-t border-border/50">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                                        Fichas Asignadas ({env.usedByGroups?.length || 0})
                                    </span>
                                    {env.usedByGroups && env.usedByGroups.length > 0 ? (
                                        <div className="space-y-1">
                                            {env.usedByGroups.map((grp: any) => (
                                                <div key={grp.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/30 text-xs">
                                                    <span className="font-bold text-foreground">{grp.name}</span>
                                                    <span className="text-[11px] text-muted-foreground">{grp.studentCount} aprendices</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-muted-foreground italic">
                                            Sin fichas asignadas a este espacio.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
