"use client";

import React from "react";
import {
    Wrench,
    ArrowRight,
    ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TOOLS_REGISTRY } from "../constants/toolsRegistry";

interface ToolsHubProps {
    onSelectTool: (toolId: string) => void;
    userRole?: string;
}

export function ToolsHub({ onSelectTool, userRole = "gestor" }: ToolsHubProps) {
    const availableTools = TOOLS_REGISTRY.filter(
        (t) => t.status === "available" && (!t.allowedRoles || t.allowedRoles.includes(userRole as any))
    );

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-300">
            {/* Signature Institutional Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-primary/5 border border-primary/20 p-5 sm:p-7 lg:p-8 shadow-2xs">
                <Wrench className="absolute -right-3 -bottom-6 w-36 h-36 text-primary/5 pointer-events-none select-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-2xs shrink-0">
                                <Wrench className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                        Centro de <span className="text-primary">Herramientas</span>
                                    </h1>
                                    <Badge
                                        variant="outline"
                                        className="text-[10.5px] py-0.5 px-2.5 bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-wider"
                                    >
                                        AcademiX Hub
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            Panel modular de herramientas y utilidades pedagógicas diseñadas para dinamizar la formación, organizar equipos de trabajo y auditar juicios evaluativos de forma 100% autónoma.
                        </p>
                    </div>

                    {/* Stats Pill */}
                    <div className="flex items-center gap-3 bg-muted/60 dark:bg-muted/30 p-2 rounded-2xl border border-border/60 text-xs text-muted-foreground shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border/50 text-foreground font-bold shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span>{availableTools.length} {availableTools.length === 1 ? "Herramienta" : "Herramientas"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 text-muted-foreground font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                            <span>100% Local</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section Title */}
            <div className="flex items-center gap-2.5 pt-1">
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                    Herramientas Disponibles
                </h2>
                <Badge variant="secondary" className="text-xs font-mono px-2 py-0.5 rounded-full">
                    {availableTools.length}
                </Badge>
            </div>

            {/* Tools Grid - Tarjetas Pequeñas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {availableTools.map((tool) => {
                    const Icon = tool.icon;

                    return (
                        <Card
                            key={tool.id}
                            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer p-4 sm:p-5"
                            onClick={() => onSelectTool(tool.id)}
                        >
                            {/* Top subtle glow accent line on hover */}
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                            <div className="space-y-3">
                                {/* Top Badges Row */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] sm:text-[11px] font-semibold border ${tool.badgeBg} rounded-md px-2 py-0.5`}
                                        >
                                            {tool.category}
                                        </Badge>
                                        {tool.isAutonomous && (
                                            <Badge
                                                variant="secondary"
                                                className="text-[9px] sm:text-[10px] font-medium py-0.5 px-1.5 bg-muted/80 text-muted-foreground font-mono rounded-md border border-border/40"
                                            >
                                                Autónoma
                                            </Badge>
                                        )}
                                    </div>

                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] sm:text-[11px] font-semibold gap-1.5 rounded-full px-2.5 py-0.5 shadow-2xs shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Disponible
                                    </Badge>
                                </div>

                                {/* Icon + Title */}
                                <div className="flex items-start gap-3 pt-0.5">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 border bg-primary/10 border-primary/20 text-primary shadow-2xs">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                                            {tool.title}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                            <span className="font-mono px-1 py-0.2 rounded bg-muted/70 border border-border/40 font-medium">
                                                {tool.version}
                                            </span>
                                            {tool.author && (
                                                <span>• {tool.author}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Short Description */}
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                                    {tool.description}
                                </p>
                            </div>

                            {/* Button to enter the tool */}
                            <Button
                                className="w-full justify-between gap-2 font-semibold text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs group-hover:shadow-md transition-all mt-4"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectTool(tool.id);
                                }}
                            >
                                <span>Ingresar a la herramienta</span>
                                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                            </Button>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
