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
import { Badge } from "@/components/ui/badge";
import { 
    Info, 
    Code2, 
    Building2, 
    Award, 
    Sparkles,
    Heart,
    FlaskConical
} from "lucide-react";
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

    const developers = [
        {
            name: "Jhon Fredy Valencia Gómez",
            initials: "JV",
            role: "Instructor / Desarrollador",
            tag: "Full Stack",
        },
        {
            name: "Deimer Andrés Miranda Montoya",
            initials: "DM",
            role: "Instructor / Desarrollador",
            tag: "Full Stack",
        },
        {
            name: "Jaime Alberto Zapata Valencia",
            initials: "JZ",
            role: "Instructor / Desarrollador",
            tag: "Full Stack",
        },
    ];

    return (
        <Dialog>
            <Tooltip>
                <DialogTrigger asChild>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 hover:bg-accent transition-all cursor-pointer"
                        >
                            <Info className="h-4 w-4" />
                            <span className="sr-only">Créditos del Sistema</span>
                        </Button>
                    </TooltipTrigger>
                </DialogTrigger>
                <TooltipContent>
                    <p>Créditos del Sistema</p>
                </TooltipContent>
            </Tooltip>

            <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-[95vw] rounded-3xl p-0 overflow-hidden border border-border/80 shadow-2xl bg-card/95 backdrop-blur-xl">
                {/* Hero Header */}
                <div className="relative overflow-hidden p-5 sm:p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/60">
                    <div className="absolute -right-6 -bottom-6 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shadow-xs shrink-0">
                                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                                    Créditos del Sistema
                                </DialogTitle>
                                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                    Información sobre el desarrollo institucional y equipo creador de AcademiX
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    {/* Entidades Institucionales: Fábrica de Software & Semillero de Investigación */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Fábrica de Software SENA */}
                        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-background/80 border border-border/80 shadow-2xs backdrop-blur-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-xs font-bold text-foreground block truncate">
                                        Fábrica de Software SENA
                                    </span>
                                    <span className="text-[10.5px] text-muted-foreground block truncate">
                                        Servicio Nacional de Aprendizaje
                                    </span>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0">
                                SENA
                            </Badge>
                        </div>

                        {/* Semillero de Investigación de Software */}
                        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-background/80 border border-border/80 shadow-2xs backdrop-blur-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                    <FlaskConical className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-xs font-bold text-foreground block truncate">
                                        Semillero de Investigación de Software
                                    </span>
                                    <span className="text-[10.5px] text-muted-foreground block truncate">
                                        Investigación, Desarrollo e Innovación (SENNOVA)
                                    </span>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 shrink-0">
                                SENNOVA
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                    {/* Contenido Distribuido a lo Ancho en 2 Columnas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                        {/* 1. Líder del Proyecto y Propósito */}
                        <div className="space-y-3.5">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 px-0.5">
                                    <Award className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Líder del Proyecto
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary/5 border border-primary/20 shadow-2xs hover:border-primary/30 transition-colors">
                                    <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                        BG
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-extrabold text-foreground tracking-tight truncate">
                                            Boris David Gómez Guerrero
                                        </h4>
                                        <p className="text-[11px] text-primary font-medium truncate">
                                            Líder del Proyecto & Coordinación
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] font-bold shrink-0 bg-primary/10 text-primary border border-primary/20">
                                        Liderazgo
                                    </Badge>
                                </div>
                            </div>

                            {/* Tarjeta de impacto institucional */}
                            <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/70 space-y-1.5">
                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block">
                                    Compromiso Institucional
                                </span>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Iniciativa desarrollada por la <strong>Fábrica de Software SENA</strong> y el <strong>Semillero de Investigación de Software</strong>, impulsando la innovación tecnológica, optimización de recursos y formación académica de calidad.
                                </p>
                            </div>
                        </div>

                        {/* 2. Desarrolladores del Proyecto */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-0.5">
                                <div className="flex items-center gap-1.5">
                                    <Code2 className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Desarrolladores del Proyecto
                                    </span>
                                </div>
                                <span className="text-[10px] font-semibold text-muted-foreground/80">
                                    Equipo de Desarrollo
                                </span>
                            </div>

                            <div className="space-y-2">
                                {developers.map((dev) => (
                                    <div 
                                        key={dev.name}
                                        className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/70 hover:border-primary/30 hover:bg-muted/50 transition-all shadow-2xs"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-background border border-border/80 flex items-center justify-center text-foreground font-bold text-xs shrink-0 shadow-2xs">
                                            {dev.initials}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs sm:text-sm font-bold text-foreground tracking-tight truncate">
                                                {dev.name}
                                            </h4>
                                            <p className="text-[10.5px] text-muted-foreground truncate">
                                                {dev.role}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] font-medium shrink-0 text-muted-foreground border-border/80">
                                            {dev.tag}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 text-center border-t border-border/50 space-y-1.5">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-500 dark:text-rose-400">
                            <span>Hecho con amor y el corazón para la comunidad</span>
                            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse shrink-0" />
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium">
                            © {new Date().getFullYear()} AcademiX • Plataforma de Gestión Académica
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                            Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
