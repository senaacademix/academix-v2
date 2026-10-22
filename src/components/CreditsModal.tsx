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
    FlaskConical,
    X
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function CreditsModal() {
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);

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
        <Dialog open={open} onOpenChange={setOpen}>
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

            <DialogContent 
                showCloseButton={false}
                className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-[94vw] max-h-[90dvh] sm:max-h-[88vh] rounded-3xl p-0 overflow-hidden border border-border/80 shadow-2xl bg-card/95 backdrop-blur-xl flex flex-col"
            >
                {/* Hero Header (Fijo en la parte superior con botón de cierre siempre accesible) */}
                <div className="relative shrink-0 overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/60">
                    <div className="absolute -right-6 -bottom-6 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    
                    {/* Botón de Cerrar - Siempre en pantalla y táctil */}
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-50 p-2 rounded-xl border border-border/70 bg-background/90 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 touch-manipulation"
                        aria-label="Cerrar modal de créditos"
                    >
                        <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </button>

                    <div className="relative z-10 flex items-center justify-between flex-wrap gap-3 pr-10">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shadow-xs shrink-0">
                                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                                    Créditos del Sistema
                                </DialogTitle>
                                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                    Información sobre el desarrollo institucional y equipo creador de AcademiX
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    {/* Entidades Institucionales: Fábrica de Software & Semillero de Investigación */}
                    <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {/* Fábrica de Software SENA */}
                        <div className="flex items-center justify-between gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-background/80 border border-border/80 shadow-2xs backdrop-blur-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                    <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[11px] sm:text-xs font-bold text-foreground block truncate">
                                        Fábrica de Software SENA
                                    </span>
                                    <span className="text-[10px] sm:text-[10.5px] text-muted-foreground block truncate">
                                        Servicio Nacional de Aprendizaje
                                    </span>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0 px-2 py-0.5">
                                SENA
                            </Badge>
                        </div>

                        {/* Semillero de Investigación de Software */}
                        <div className="flex items-center justify-between gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-background/80 border border-border/80 shadow-2xs backdrop-blur-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                    <FlaskConical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[11px] sm:text-xs font-bold text-foreground block truncate">
                                        Semillero de Investigación de Software
                                    </span>
                                    <span className="text-[10px] sm:text-[10.5px] text-muted-foreground block truncate">
                                        Investigación, Desarrollo e Innovación (SENNOVA)
                                    </span>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 shrink-0 px-2 py-0.5">
                                SENNOVA
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Contenido con scroll vertical suave y acotado al 90dvh en móviles */}
                <div 
                    className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overscroll-contain flex-1 scrollbar-thin"
                    style={{ 
                        WebkitOverflowScrolling: "touch",
                        touchAction: "pan-y" 
                    }}
                >
                    {/* Contenido Distribuido en Columnas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-start">
                        {/* 1. Líder del Proyecto y Propósito */}
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 px-0.5">
                                    <Award className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Líder del Proyecto
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-primary/5 border border-primary/20 shadow-2xs hover:border-primary/30 transition-colors">
                                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                        BG
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs sm:text-sm font-extrabold text-foreground tracking-tight truncate">
                                            Boris David Gómez Guerrero
                                        </h4>
                                        <p className="text-[10.5px] sm:text-[11px] text-primary font-medium truncate">
                                            Líder del Proyecto & Coordinación
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="text-[9px] sm:text-[10px] font-bold shrink-0 bg-primary/10 text-primary border border-primary/20">
                                        Liderazgo
                                    </Badge>
                                </div>
                            </div>

                            {/* Tarjeta de impacto institucional */}
                            <div className="p-3 sm:p-3.5 rounded-2xl bg-muted/20 border border-border/70 space-y-1.5">
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
                                        className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-muted/30 border border-border/70 hover:border-primary/30 hover:bg-muted/50 transition-all shadow-2xs"
                                    >
                                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-background border border-border/80 flex items-center justify-center text-foreground font-bold text-xs shrink-0 shadow-2xs">
                                            {dev.initials}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs sm:text-sm font-bold text-foreground tracking-tight truncate">
                                                {dev.name}
                                            </h4>
                                            <p className="text-[10px] sm:text-[10.5px] text-muted-foreground truncate">
                                                {dev.role}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] sm:text-[10px] font-medium shrink-0 text-muted-foreground border-border/80">
                                            {dev.tag}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer con botón de cierre directo */}
                    <div className="pt-3 text-center border-t border-border/50 space-y-2">
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
                        <div className="pt-1 flex justify-center">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setOpen(false)}
                                className="h-8 px-6 rounded-xl font-bold text-xs border-border/80 hover:bg-muted cursor-pointer touch-manipulation shadow-2xs"
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
