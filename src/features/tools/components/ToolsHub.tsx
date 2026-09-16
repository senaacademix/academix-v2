"use client";

import React, { useState, useEffect } from "react";
import {
    Wrench,
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
    LayoutGrid,
    Layers,
    Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TOOLS_REGISTRY } from "../constants/toolsRegistry";

interface ToolsHubProps {
    onSelectTool: (toolId: string) => void;
}

export function ToolsHub({ onSelectTool }: ToolsHubProps) {
    const availableTools = TOOLS_REGISTRY.filter((t) => t.status === "available");
    const [cardSize, setCardSize] = useState<"compact" | "detailed">("compact");

    useEffect(() => {
        const saved = localStorage.getItem("academix_tools_card_size");
        if (saved === "compact" || saved === "detailed") {
            setCardSize(saved);
        }
    }, []);

    const handleToggleCardSize = (size: "compact" | "detailed") => {
        setCardSize(size);
        localStorage.setItem("academix_tools_card_size", size);
    };

    return (
        <div className="space-y-8 pb-16 animate-in fade-in duration-300">
            {/* Main Institutional Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/40 p-6 md:p-8 border border-border/80 shadow-xs">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-2xs">
                                <Wrench className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                                        Centro de Herramientas
                                    </h1>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] py-0.5 px-2 bg-primary/5 text-primary border-primary/20 font-semibold"
                                    >
                                        AcademiX Hub
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Panel modular de herramientas y utilidades independientes diseñadas para optimizar la gestión formativa, análisis de juicios evaluativos y organización curricular de forma 100% autónoma.
                        </p>
                    </div>

                    {/* Stats Pill */}
                    <div className="flex items-center gap-3 bg-muted/60 dark:bg-muted/30 p-2 rounded-xl border border-border/60 text-xs text-muted-foreground shrink-0">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border/50 text-foreground font-medium shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{availableTools.length} {availableTools.length === 1 ? "Disponible" : "Disponibles"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 text-muted-foreground">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Local & Seguro</span>
                        </div>
                    </div>
                </div>

                {/* Decorative background element */}
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Toolbar row with title and View Switcher */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2.5">
                    <h2 className="text-base sm:text-lg font-bold text-foreground">
                        Herramientas Disponibles
                    </h2>
                    <Badge variant="secondary" className="text-xs font-mono px-2 py-0.5 rounded-full">
                        {availableTools.length}
                    </Badge>
                </div>

                {/* View Switcher: Pequeña vs Detallada */}
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/60 text-xs">
                    <button
                        type="button"
                        onClick={() => handleToggleCardSize("compact")}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 cursor-pointer",
                            cardSize === "compact"
                                ? "bg-card text-foreground shadow-xs border border-border/60 font-bold"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Tarjeta pequeña y compacta"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Tarjeta Pequeña</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleToggleCardSize("detailed")}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 cursor-pointer",
                            cardSize === "detailed"
                                ? "bg-card text-foreground shadow-xs border border-border/60 font-bold"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Tarjeta detallada con capacidades clave"
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Detallada</span>
                    </button>
                </div>
            </div>

            {/* Tools Grid */}
            {cardSize === "compact" ? (
                /* Compact / Small Card Mode */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
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
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 border bg-primary/10 border-primary/20 text-primary shadow-2xs">
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

                                    {/* Description */}
                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                        {tool.description}
                                    </p>

                                    {/* Mini feature tags */}
                                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                        {tool.features.slice(0, 3).map((feature, idx) => {
                                            const label = feature.split("(")[0].trim();
                                            return (
                                                <span
                                                    key={idx}
                                                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-foreground/75 border border-border/40 truncate max-w-[210px]"
                                                    title={feature}
                                                >
                                                    {label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Compact Action Footer */}
                                <div className="pt-3 mt-3.5 border-t border-border/40 flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-primary group-hover:underline">
                                        Abrir herramienta
                                    </span>
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 group-hover:bg-primary text-primary group-hover:text-primary-foreground flex items-center justify-center transition-all duration-200 shadow-2xs">
                                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                /* Detailed Card Mode */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableTools.map((tool) => {
                        const Icon = tool.icon;

                        return (
                            <Card
                                key={tool.id}
                                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border-border/80 bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                                onClick={() => onSelectTool(tool.id)}
                            >
                                {/* Top subtle glow accent line on hover */}
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <CardHeader className="pb-3 space-y-3.5">
                                    {/* Top Badges Row */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <Badge
                                                variant="outline"
                                                className={`text-[11px] font-semibold border ${tool.badgeBg} rounded-lg px-2.5 py-0.5`}
                                            >
                                                {tool.category}
                                            </Badge>
                                            {tool.isAutonomous && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] font-medium py-0.5 px-2 bg-muted/80 text-muted-foreground font-mono rounded-lg border border-border/50"
                                                >
                                                    Autónoma
                                                </Badge>
                                            )}
                                        </div>

                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 text-[11px] font-semibold gap-1.5 rounded-full px-2.5 py-0.5 shadow-2xs shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Disponible
                                        </Badge>
                                    </div>

                                    {/* Icon + Title */}
                                    <div className="flex items-start gap-3.5 pt-1">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 border bg-primary/10 border-primary/25 text-primary shadow-2xs group-hover:shadow-xs">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                                                {tool.title}
                                            </CardTitle>
                                            <div className="flex items-center gap-1.5 pt-0.5">
                                                <span className="text-[10px] text-muted-foreground font-mono px-1.5 py-0.5 rounded bg-muted/70 border border-border/50 font-medium">
                                                    {tool.version}
                                                </span>
                                                {tool.author && (
                                                    <span className="text-[10px] text-muted-foreground/80">
                                                        • {tool.author}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <CardDescription className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                                        {tool.description}
                                    </CardDescription>
                                </CardHeader>

                                {/* Features list */}
                                <CardContent className="pb-4 pt-0">
                                    <div className="space-y-2.5 pt-3.5 border-t border-border/60">
                                        <div className="text-[11px] font-bold text-foreground/75 uppercase tracking-wider flex items-center justify-between">
                                            <span>Capacidades clave:</span>
                                        </div>
                                        <ul className="space-y-2">
                                            {tool.features.map((feature, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-start gap-2.5 text-xs text-foreground/80 leading-snug"
                                                >
                                                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/25 mt-0.5">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                    </div>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>

                                {/* Footer / CTA */}
                                <CardFooter className="pt-3 pb-4 px-6 border-t border-border/40 bg-muted/20">
                                    <Button
                                        className="w-full justify-between gap-2 font-semibold text-xs sm:text-sm h-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs group-hover:shadow-md transition-all rounded-xl"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectTool(tool.id);
                                        }}
                                    >
                                        <span>Abrir Herramienta</span>
                                        <div className="w-6 h-6 rounded-lg bg-primary-foreground/15 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1">
                                            <ArrowRight className="w-3.5 h-3.5 text-primary-foreground" />
                                        </div>
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
