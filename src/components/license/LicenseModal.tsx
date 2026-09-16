"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    ScrollText, 
    Scale, 
    ShieldAlert, 
    Sparkles, 
    Users, 
    UserX 
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function LicenseModal() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60">
                <ScrollText className="h-4 w-4" />
                <span className="sr-only">Licencia de Uso</span>
            </Button>
        );
    }

    return (
        <Dialog>
            <Tooltip>
                <DialogTrigger asChild>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 transition-all">
                            <ScrollText className="h-4 w-4" />
                            <span className="sr-only">Licencia de Uso</span>
                        </Button>
                    </TooltipTrigger>
                </DialogTrigger>
                <TooltipContent>
                    <p>Licencia de Uso</p>
                </TooltipContent>
            </Tooltip>
            
            <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border border-border/80 shadow-2xl bg-card/95 backdrop-blur-xl">
                {/* Hero Header */}
                <div className="relative overflow-hidden p-5 sm:p-7 bg-primary/5 border-b border-primary/15">
                    <Scale className="absolute -right-4 -bottom-6 w-36 h-36 text-primary/5 pointer-events-none select-none" />
                    
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs shrink-0">
                                    <Scale className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                                        Licencia de Uso
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        Términos de uso condicional y restricciones legales de la plataforma AcademiX
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>

                        <Badge className="self-start sm:self-auto bg-primary text-primary-foreground border-transparent px-3 py-1 text-[10.5px] font-black uppercase tracking-wider rounded-full shadow-xs shrink-0">
                            Uso Gratuito (Código Cerrado)
                        </Badge>
                    </div>
                </div>

                <div className="p-5 sm:p-7 space-y-6">
                    {/* Protective Warning Banner */}
                    <div className="relative overflow-hidden flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl border border-destructive/25 bg-destructive/5 dark:bg-destructive/10 text-foreground shadow-2xs">
                        <ShieldAlert className="absolute -right-2 -bottom-3 w-24 h-24 text-destructive/10 pointer-events-none select-none" />
                        
                        <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                            <ShieldAlert className="w-5 h-5 text-destructive" />
                        </div>
                        
                        <div className="space-y-1 relative z-10 min-w-0 flex-1">
                            <p className="font-black text-xs sm:text-sm text-destructive uppercase tracking-wider">
                                Restricción Legal Absoluta de Campo de Uso
                            </p>
                            <p className="text-xs text-foreground/80 leading-relaxed">
                                Este software está licenciado bajo condiciones estrictas de propósito. Está <strong className="text-destructive font-black">estrictamente prohibido</strong> su uso para la fiscalización, control laboral de asistencia o supervisión de desempeño de <strong className="text-foreground">profesores, instructores o personal administrativo</strong>. Su uso está restringido exclusivamente al seguimiento académico de <strong className="text-foreground">estudiantes</strong>.
                            </p>
                        </div>
                    </div>

                    {/* Overview Grid Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-border/70 bg-muted/20 dark:bg-muted/10 p-5 shadow-2xs space-y-3">
                            <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                    <Sparkles className="w-3.5 h-3.5" />
                                </div>
                                <span>¿Por qué esta Licencia?</span>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                                <p>
                                    La prioridad fundamental de esta licencia es la <strong className="text-foreground font-semibold">protección laboral de los docentes</strong>. A diferencia del software libre tradicional, este modelo prohíbe la modificación y reutilización del código, restringiendo su uso para evitar que sea transformado en una herramienta de vigilancia o control institucional.
                                </p>
                                <p>
                                    El software se ofrece de forma gratuita para su uso final, garantizando que cumpla íntegramente con su propósito original pedagógico.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-muted/20 dark:bg-muted/10 p-5 shadow-2xs space-y-3">
                            <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                    <Scale className="w-3.5 h-3.5" />
                                </div>
                                <span>Ventajas Clave</span>
                            </div>
                            <div className="space-y-3 text-xs">
                                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border/60">
                                    <div className="w-6 h-6 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <Users className="w-3 h-3" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-foreground">Claridad jurídica para profesores</p>
                                        <p className="text-muted-foreground text-[11px] mt-0.5 leading-tight">Los instructores pueden exigir el cese inmediato de uso si detectan funciones de vigilancia laboral.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border/60">
                                    <div className="w-6 h-6 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <UserX className="w-3 h-3" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-foreground">Blindaje contra abusos</p>
                                        <p className="text-muted-foreground text-[11px] mt-0.5 leading-tight">El código no puede ser alterado, blindando las restricciones protectoras en todas las instituciones.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
