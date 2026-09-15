"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, FileSpreadsheet, CalendarClock, Download, Sparkles, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SofiaHelpGuideModal() {
    return (
        <Dialog>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs font-semibold rounded-xl border-primary/30 text-primary hover:bg-primary/10 transition-all"
                            >
                                <HelpCircle className="h-4 w-4" />
                                <span>Guía de Uso</span>
                            </Button>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>¿Cómo usar la herramienta de reportes?</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold tracking-widest uppercase text-emerald-600">
                            Herramienta Autónoma
                        </span>
                    </div>
                    <DialogTitle className="text-xl font-bold">¿Cómo usar el Procesador Sofia Plus?</DialogTitle>
                    <DialogDescription className="text-xs">
                        Procesa juicios evaluativos descargados de Sofia Plus sin alterar la base de datos institucional.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-3">
                    {/* Paso 1 */}
                    <div className="flex gap-3.5">
                        <div className="flex-none flex flex-col items-center">
                            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                                <FileSpreadsheet className="h-4 w-4" />
                            </div>
                            <div className="w-px h-full bg-border my-2" />
                        </div>
                        <div className="space-y-1.5 pb-2">
                            <h4 className="font-bold text-sm">1. Descargar el Excel de Juicios de Sofia Plus</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Descarga el archivo de <strong>Juicios de Evaluación</strong> directamente de la plataforma Sofia Plus sin modificar sus columnas ni cabeceras originales.
                            </p>
                        </div>
                    </div>

                    {/* Paso 2 */}
                    <div className="flex gap-3.5">
                        <div className="flex-none flex flex-col items-center">
                            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-500/20">
                                <CalendarClock className="h-4 w-4" />
                            </div>
                            <div className="w-px h-full bg-border my-2" />
                        </div>
                        <div className="space-y-1.5 pb-2">
                            <h4 className="font-bold text-sm">2. Organizar por Periodos Formativos (Opcional)</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                En la pestaña <strong>Organizador de Línea de Tiempo</strong>, puedes crear trimestres o fases, arrastrar y soltar los RA para agruparlos en orden cronológico, y descargar la plantilla en <strong>.json</strong>.
                            </p>
                        </div>
                    </div>

                    {/* Paso 3 */}
                    <div className="flex gap-3.5">
                        <div className="flex-none flex flex-col items-center">
                            <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 border border-purple-500/20">
                                <Download className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <h4 className="font-bold text-sm">3. Generar Matriz, Analítica y Exportar</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Carga el archivo en <strong>Generador de Reportes</strong>. Podrás explorar la matriz interactiva, revisar KPIs en tiempo real y exportar en <strong>Excel Corporativo (ExcelJS)</strong> o <strong>PDF Corporativo (@react-pdf/renderer)</strong>.
                            </p>
                        </div>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-2.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Esta herramienta opera de forma 100% autónoma en memoria: no modifica registros ni tablas en la base de datos de AcademiX.</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
