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
import { Info, Code2, Building2 } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function CreditsModal() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60">
                <Info className="h-4 w-4" />
                <span className="sr-only">Créditos</span>
            </Button>
        );
    }

    return (
        <Dialog>
            <Tooltip>
                <DialogTrigger asChild>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 transition-all">
                            <Info className="h-4 w-4" />
                            <span className="sr-only">Créditos</span>
                        </Button>
                    </TooltipTrigger>
                </DialogTrigger>
                <TooltipContent>
                    <p>Créditos</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-md w-[95vw] rounded-3xl p-0 overflow-hidden border border-border/80 shadow-2xl bg-card/95 backdrop-blur-xl">
                {/* Hero Header */}
                <div className="relative overflow-hidden p-5 sm:p-6 bg-primary/5 border-b border-primary/15">
                    <Info className="absolute -right-3 -bottom-5 w-32 h-32 text-primary/5 pointer-events-none select-none" />
                    
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs shrink-0">
                            <Info className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black tracking-tight text-foreground">
                                Créditos del Sistema
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Información sobre el desarrollo institucional de AcademiX
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                    {/* Desarrolladores del Proyecto */}
                    <div className="relative overflow-hidden p-5 rounded-2xl border border-primary/25 bg-primary/5 shadow-2xs text-center space-y-3">
                        <div className="flex items-center justify-center gap-1.5 text-primary font-black text-[10.5px] uppercase tracking-wider">
                            <Code2 className="h-4 w-4 text-primary animate-pulse shrink-0" />
                            <span>Desarrolladores del Proyecto</span>
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                                Jhon Fredy Valencia Gómez
                            </h3>
                            <h3 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                                Deimer Andrés Miranda Montoya
                            </h3>
                            <h3 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                                Jaime Alberto Zapata Valencia
                            </h3>
                        </div>
                    </div>

                    {/* Líder del Proyecto */}
                    <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-0.5">
                        <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                            Líder del Proyecto
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground">
                            Boris David Gómez Guerrero
                        </h4>
                    </div>

                    {/* Fábrica de Software SENA */}
                    <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-bold tracking-wide">
                            Fábrica de Software SENA
                        </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground text-center pt-1">
                        © {new Date().getFullYear()} AcademiX. Todos los derechos reservados.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
