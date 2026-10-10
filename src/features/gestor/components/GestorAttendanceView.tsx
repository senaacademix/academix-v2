"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
    CalendarDays, 
    Users, 
    BookOpen, 
    Layers, 
    Search, 
    ChevronRight, 
    Sparkles, 
    Filter,
    CalendarClock,
    School,
    GraduationCap,
    ArrowLeft,
    ShieldCheck,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { GroupScheduleAttendanceView } from "@/features/teacher/components/GroupScheduleAttendanceView";
import { cn } from "@/lib/utils";

export interface GestorGroupItem {
    id: string;
    name: string;
    description?: string | null;
    programId: string;
    programName?: string;
    studentCount?: number;
    categoria?: string;
}

interface GestorAttendanceViewProps {
    groups: GestorGroupItem[];
    initialGroupId?: string;
    programId?: string;
    programs?: Array<{ id: string; name: string }>;
    userRole?: string;
    userName?: string;
}

export function GestorAttendanceView({
    groups,
    initialGroupId,
    programId,
    programs = [],
    userRole = "gestor",
    userName,
}: GestorAttendanceViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Estado del grupo seleccionado (por defecto el primer grupo de Etapa Lectiva o el inicial)
    const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
        if (initialGroupId && groups.some(g => g.id === initialGroupId)) {
            return initialGroupId;
        }
        const lectivaGroups = groups.filter(g => (g.categoria || "LECTIVA") === "LECTIVA");
        return lectivaGroups[0]?.id || groups[0]?.id || "";
    });

    // Filtros de búsqueda para fichas
    const [groupSearchQuery, setGroupSearchQuery] = useState("");
    
    // Categoría/Etapa seleccionada (por defecto LECTIVA, sin opción de 'Todas las etapas')
    const [categoryFilter, setCategoryFilter] = useState<string>(() => {
        if (initialGroupId) {
            const initialGroup = groups.find(g => g.id === initialGroupId);
            if (initialGroup?.categoria) return initialGroup.categoria;
        }
        return "LECTIVA";
    });

    // Programa seleccionado para el selector si hay múltiples
    const [selectedProgramId, setSelectedProgramId] = useState<string>(programId || programs[0]?.id || "");

    // Sincronizar actualización de URL al cambiar de grupo
    const handleGroupChange = (newGroupId: string) => {
        setSelectedGroupId(newGroupId);
        try {
            const params = new URLSearchParams(searchParams?.toString() || "");
            params.set("groupId", newGroupId);
            if (programId) params.set("programId", programId);
            router.replace(`?${params.toString()}`, { scroll: false });
        } catch (e) {
            // Ignorar errores de router en pruebas o SSR
        }
    };

    // Cambiar de categoría/etapa y auto-seleccionar la primera ficha de esa etapa
    const handleCategoryChange = (newCategory: string) => {
        setCategoryFilter(newCategory);
        const groupsInNewCat = groups.filter(g => (g.categoria || "LECTIVA") === newCategory);
        if (groupsInNewCat.length > 0 && !groupsInNewCat.some(g => g.id === selectedGroupId)) {
            handleGroupChange(groupsInNewCat[0].id);
        }
    };

    // Filtrar grupos por búsqueda de texto y categoría obligatoria
    const filteredGroups = useMemo(() => {
        return groups.filter(g => {
            const cat = g.categoria || "LECTIVA";
            if (cat !== categoryFilter) {
                return false;
            }
            if (groupSearchQuery.trim()) {
                const query = groupSearchQuery.toLowerCase();
                const matchName = g.name.toLowerCase().includes(query);
                const matchDesc = g.description?.toLowerCase().includes(query);
                const matchProg = g.programName?.toLowerCase().includes(query);
                if (!matchName && !matchDesc && !matchProg) return false;
            }
            return true;
        });
    }, [groups, groupSearchQuery, categoryFilter]);

    // Ficha actualmente seleccionada
    const currentGroup = useMemo(() => {
        return groups.find(g => g.id === selectedGroupId) || null;
    }, [groups, selectedGroupId]);

    // Formato de grupos para el componente de vista
    const formattedGroupsList = useMemo(() => {
        return groups.map(g => ({ id: g.id, name: g.name }));
    }, [groups]);

    const activeProgramName = currentGroup?.programName || programs.find(p => p.id === programId)?.name || "Programa Académico";

    return (
        <TooltipProvider>
            <div className="w-full space-y-6 animate-in fade-in-50 duration-300">
                
                {/* ── BANNER HERO INSTITUCIONAL PARA GESTOR ── */}
                <div className="relative rounded-3xl bg-gradient-to-br from-card via-card/95 to-primary/5 border border-border/80 p-5 sm:p-7 shadow-xs overflow-hidden backdrop-blur-xl">
                    <CalendarDays className="absolute right-0 top-0 w-80 h-80 text-primary/5 -translate-y-1/3 translate-x-1/4 pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="px-3 py-1 rounded-full bg-primary/10 border-primary/25 text-primary text-xs font-bold shadow-2xs">
                                    <Sparkles className="w-3.5 h-3.5 mr-1 text-primary" />
                                    {userRole === "admin" ? "Administración Central" : userRole === "observer" ? "Monitoreo Institucional" : "Gestión Curricular"}
                                </Badge>

                                {activeProgramName && (
                                    <Badge variant="outline" className="px-3 py-1 rounded-full bg-muted/60 border-border/70 text-foreground text-xs font-bold">
                                        <School className="w-3.5 h-3.5 mr-1 text-primary" />
                                        {activeProgramName}
                                    </Badge>
                                )}
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                                Sábana Semanal de{" "}
                                <span className="bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
                                    Asistencia por Ficha
                                </span>
                            </h1>

                            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                                Supervisa el registro consolidado de asistencia de aprendices en todas las materias, franjas horarias e instructores de cada ficha de formación.
                            </p>
                        </div>

                        {/* Botones de navegación contextual */}
                        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                asChild 
                                className="rounded-xl h-10 border-border/80 bg-background/80 hover:bg-muted text-foreground font-bold text-xs shadow-2xs"
                            >
                                <Link href={programId ? `/dashboard/gestor?programId=${programId}` : "/dashboard/gestor"}>
                                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                                    Panel Gestor
                                </Link>
                            </Button>

                            <Button 
                                variant="outline" 
                                size="sm" 
                                asChild 
                                className="rounded-xl h-10 border-border/80 bg-background/80 hover:bg-muted text-foreground font-bold text-xs shadow-2xs"
                            >
                                <Link href={programId ? `/dashboard/gestor/schedules?programId=${programId}` : "/dashboard/gestor/schedules"}>
                                    <CalendarClock className="w-3.5 h-3.5 mr-1.5 text-primary" />
                                    Horarios
                                </Link>
                            </Button>

                            <Button 
                                variant="outline" 
                                size="sm" 
                                asChild 
                                className="rounded-xl h-10 border-border/80 bg-background/80 hover:bg-muted text-foreground font-bold text-xs shadow-2xs"
                            >
                                <Link href={programId ? `/dashboard/gestor/courses?programId=${programId}` : "/dashboard/gestor/courses"}>
                                    <BookOpen className="w-3.5 h-3.5 mr-1.5 text-primary" />
                                    Estructura
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ── BARRA SELECTORA DE FICHAS / GRUPOS ── */}
                {groups.length > 0 ? (
                    <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                                    Seleccionar Ficha de Formación ({groups.length})
                                </h3>
                            </div>

                            {/* Filtros rápidos: Búsqueda y categoría */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative w-full sm:w-56">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por ficha o código..."
                                        value={groupSearchQuery}
                                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                                        className="h-9 pl-8 text-xs rounded-xl bg-background border-border/80 font-medium"
                                    />
                                </div>

                                <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                                    <SelectTrigger className="h-9 w-[150px] text-xs font-bold rounded-xl border-border/80 bg-background">
                                        <SelectValue placeholder="Etapa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LECTIVA">Etapa Lectiva</SelectItem>
                                        <SelectItem value="PRODUCTIVA">Etapa Productiva</SelectItem>
                                        <SelectItem value="EGRESADOS">Egresados</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Select desplegable móvil / fallback */}
                                <div className="w-full sm:w-auto">
                                    <Select value={selectedGroupId} onValueChange={handleGroupChange}>
                                        <SelectTrigger className="h-9 w-full sm:w-[220px] text-xs font-black rounded-xl border-primary/30 bg-primary/5 text-primary">
                                            <SelectValue placeholder="Seleccionar grupo..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {groups.map((g) => (
                                                <SelectItem key={g.id} value={g.id} className="text-xs font-medium">
                                                    {g.name} ({g.studentCount || 0} aprendices)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Pastillas horizontales para selección rápida con un clic */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin pt-1">
                            {filteredGroups.map((g) => {
                                const isActive = g.id === selectedGroupId;
                                return (
                                    <Button
                                        key={g.id}
                                        type="button"
                                        variant={isActive ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleGroupChange(g.id)}
                                        className={cn(
                                            "h-9 px-3.5 text-xs font-black rounded-xl transition-all shrink-0 flex items-center gap-2",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/25"
                                                : "hover:bg-primary/10 hover:text-primary text-foreground border-border/80 bg-background"
                                        )}
                                    >
                                        <span>{g.name}</span>
                                        {g.studentCount !== undefined && (
                                            <Badge 
                                                variant="secondary" 
                                                className={cn(
                                                    "text-[10px] px-1.5 py-0 font-mono font-bold",
                                                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                                                )}
                                            >
                                                {g.studentCount}
                                            </Badge>
                                        )}
                                        {g.categoria && g.categoria !== "LECTIVA" && (
                                            <span className={cn(
                                                "text-[9px] uppercase px-1 rounded font-bold",
                                                isActive ? "bg-primary-foreground/30 text-primary-foreground" : "bg-muted text-muted-foreground"
                                            )}>
                                                {g.categoria === "PRODUCTIVA" ? "Prod." : "Egr."}
                                            </span>
                                        )}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* Estado vacío cuando no hay fichas */
                    <Card className="rounded-3xl border-border/80 p-8 text-center space-y-4">
                        <CardContent className="flex flex-col items-center justify-center p-0 gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                                <Layers className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-foreground">
                                    No hay fichas registradas en este programa
                                </h3>
                                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                    No se encontraron fichas o grupos de aprendices para supervisar asistencia en esta área de formación.
                                </p>
                            </div>
                            <Button asChild size="sm" className="rounded-xl text-xs font-bold mt-2">
                                <Link href={programId ? `/dashboard/gestor/courses?programId=${programId}` : "/dashboard/gestor/courses"}>
                                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                                    Gestionar Fichas en Estructura Curricular
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* ── COMPONENTE DE SÁBANA SEMANAL & MENSUAL ── */}
                {selectedGroupId && (
                    <GroupScheduleAttendanceView
                        key={selectedGroupId}
                        selectedGroupId={selectedGroupId}
                        groups={formattedGroupsList}
                        onSelectGroup={handleGroupChange}
                        isActiveTab={true}
                    />
                )}

            </div>
        </TooltipProvider>
    );
}
