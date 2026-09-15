"use client";

import React, { useState } from "react";
import {
    Compass,
    Target,
    HelpCircle,
    CheckCircle2,
    Clock,
    FileSpreadsheet,
    CalendarClock,
    UploadCloud,
    BarChart3,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Lightbulb,
    FileDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SofiaToolInfoBanner() {
    const [isExpanded, setIsExpanded] = useState<boolean>(true);

    return (
        <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/30 overflow-hidden shadow-xs transition-all duration-300">
            {/* Header / Collapse Toggle Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:px-6 bg-muted/30 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                        <Compass className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm sm:text-base font-bold text-foreground">
                                Objetivo de la Herramienta y Guía Paso a Paso
                            </h2>
                            <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold"
                            >
                                Información Clave
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Conoce para qué sirve este procesador y cómo sacarle el máximo provecho en tu gestión académica.
                        </p>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 shrink-0 ml-auto sm:ml-0"
                >
                    <span>{isExpanded ? "Ocultar detalles" : "Ver objetivo y guía"}</span>
                    {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                    )}
                </Button>
            </div>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="p-4 sm:p-6 space-y-6 animate-in fade-in-50 duration-200">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: Objetivo y Propósito (5 cols) */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                                    <Target className="w-4 h-4" />
                                    <span>¿Cuál es el Objetivo?</span>
                                </div>
                                <h3 className="text-base font-extrabold text-foreground leading-snug">
                                    Convertir sábanas densas de Sofia Plus en matrices ejecutivas de seguimiento
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Los reportes oficiales de Sofia Plus se descargan con cientos de filas y columnas desorganizadas sin un orden cronológico claro. El objetivo de esta herramienta es procesar automáticamente ese archivo para:
                                </p>
                            </div>

                            {/* 3 Value Pillars */}
                            <div className="space-y-2.5">
                                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="space-y-0.5 text-xs">
                                        <div className="font-semibold text-foreground">
                                            Auditoría Rápida para Comités
                                        </div>
                                        <p className="text-muted-foreground text-[11px] leading-normal">
                                            Identifica al instante aprendices con RA en estado <strong>&quot;Por Evaluar&quot;</strong> o <strong>&quot;No Aprobado&quot;</strong> para citaciones y planes de mejoramiento.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                                    <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                                        <CalendarClock className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="space-y-0.5 text-xs">
                                        <div className="font-semibold text-foreground">
                                            Organización por Trimestres
                                        </div>
                                        <p className="text-muted-foreground text-[11px] leading-normal">
                                            Agrupa los RA en orden cronológico real mediante plantillas JSON reutilizables para cualquier ficha del programa.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                                    <div className="w-6 h-6 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-600 shrink-0 mt-0.5">
                                        <FileDown className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="space-y-0.5 text-xs">
                                        <div className="font-semibold text-foreground">
                                            Exportación Corporativa Oficial
                                        </div>
                                        <p className="text-muted-foreground text-[11px] leading-normal">
                                            Genera informes en <strong>Excel con estilo ejecutivo</strong> y <strong>PDFs con membrete SENA</strong> listos para presentar ante coordinación académica.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: ¿Cómo se usa? (7 cols) */}
                        <div className="lg:col-span-7 space-y-4">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                                <HelpCircle className="w-4 h-4" />
                                <span>¿Cómo se usa? — Flujo de 4 Pasos</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Step 1 */}
                                <div className="p-3.5 rounded-xl bg-card border border-border/70 hover:border-emerald-500/40 transition-colors space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                                            1
                                        </span>
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border">
                                            Origen
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                            Descargar de Sofia Plus
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            Ingresa a Sofia Plus con tu rol. En el módulo de reportes, descarga el archivo de <strong>Juicios Evaluativos</strong> de tu ficha en formato <code>.xlsx</code> o <code>.xls</code>.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="p-3.5 rounded-xl bg-card border border-border/70 hover:border-blue-500/40 transition-colors space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-600 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                                            2
                                        </span>
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-500/30 text-blue-600">
                                            Opcional
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                            <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                                            Organizar Trimestres
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            En la pestaña <strong>Organizador de Línea de Tiempo</strong>, extrae los RA, agrúpalos por trimestres (T1, T2...) y descarga tu plantilla en formato <code>.json</code>.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="p-3.5 rounded-xl bg-card border border-border/70 hover:border-primary/40 transition-colors space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="w-6 h-6 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center border border-primary/30">
                                            3
                                        </span>
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border">
                                            Proceso
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                            <UploadCloud className="w-3.5 h-3.5 text-primary" />
                                            Cargar en el Generador
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            Arrastra el archivo Excel (y la plantilla JSON opcional si la creaste) en el recuadro de carga y pulsa <strong>&quot;Generar Matriz de Juicios&quot;</strong>.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 4 */}
                                <div className="p-3.5 rounded-xl bg-card border border-border/70 hover:border-purple-500/40 transition-colors space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="w-6 h-6 rounded-full bg-purple-500/15 text-purple-600 font-bold text-xs flex items-center justify-center border border-purple-500/30">
                                            4
                                        </span>
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border">
                                            Resultados
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                            <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                                            Auditar y Exportar
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            Filtra aprendices por estado o documento, analiza las métricas de rendimiento y exporta en <strong>Excel o PDF corporativo</strong> con un solo clic.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Security Note */}
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground">
                                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>
                                    <strong>Herramienta 100% Autónoma:</strong> Todo el procesamiento ocurre en memoria de tu navegador. Los archivos no se almacenan en servidores ni modifican la base de datos de AcademiX.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
