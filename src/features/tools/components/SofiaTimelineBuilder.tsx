"use client";

import React, { useState, useEffect } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Plus,
    Download,
    Trash2,
    GripVertical,
    Upload,
    Pencil,
    Tag,
    ChevronDown,
    ChevronRight,
    Search,
    Clock,
    FileJson,
    Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TimelineConfig, TimelineOutcomeItem, TimelinePeriod } from "../types/sofiaReportTypes";

// --- Sortable Item Component ---
function SortableItem({
    id,
    item,
    isOverlay,
    onLabelChange,
}: {
    id: string;
    item?: TimelineOutcomeItem;
    isOverlay?: boolean;
    onLabelChange?: (id: string, label: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const label = item?.label;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                p-2.5 mb-2 bg-card border rounded-xl flex flex-col gap-1.5 text-xs cursor-grab active:cursor-grabbing hover:bg-muted/40 transition-all
                ${isDragging ? "opacity-40" : "opacity-100"}
                ${isOverlay ? "shadow-xl border-primary bg-background" : ""}
            `}
            {...attributes}
            {...listeners}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5 overflow-hidden">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="font-medium line-clamp-2 select-none text-[11px] leading-snug">{id}</span>
                </div>
            </div>

            {label && (
                <div className="flex items-center gap-1 text-[10px] text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-md w-fit ml-5">
                    <Tag className="h-3 w-3" />
                    <span className="truncate max-w-[140px]">{label}</span>
                </div>
            )}

            {/* Label Popover Edit */}
            {onLabelChange && (
                <div className="self-end" onClick={(e) => e.stopPropagation()}>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted rounded-md">
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="end">
                            <div className="space-y-2">
                                <h5 className="font-semibold text-xs">Etiqueta de Asignatura / Materia</h5>
                                <p className="text-[10px] text-muted-foreground">
                                    Texto corto visible en el encabezado del reporte para este RA.
                                </p>
                                <Input
                                    defaultValue={label || ""}
                                    placeholder="Ej: Programación Web, BD..."
                                    className="h-7 text-xs"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            onLabelChange(id, e.currentTarget.value);
                                        }
                                    }}
                                    onBlur={(e) => onLabelChange(id, e.target.value)}
                                />
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            )}
        </div>
    );
}

// --- Main Builder Component ---
interface SofiaTimelineBuilderProps {
    initialOutcomes: string[];
    onConfigChange?: (config: TimelineConfig) => void;
    importedConfig?: TimelineConfig;
}

export function SofiaTimelineBuilder({
    initialOutcomes,
    onConfigChange,
    importedConfig,
}: SofiaTimelineBuilderProps) {
    const [unassigned, setUnassigned] = useState<TimelineOutcomeItem[]>([]);
    const [periods, setPeriods] = useState<TimelinePeriod[]>([
        { id: "period-1", name: "Trimestre 1", items: [] },
        { id: "period-2", name: "Trimestre 2", items: [] },
    ]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [newPeriodName, setNewPeriodName] = useState("");
    const [collapsedPeriods, setCollapsedPeriods] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState("");

    // Initialize from outcomes or imported config
    useEffect(() => {
        if (importedConfig && importedConfig.periods) {
            const mappedPeriods: TimelinePeriod[] = importedConfig.periods.map((p, idx) => ({
                id: `imported-period-${idx}`,
                name: p.name,
                items: p.outcomes.map((o) => ({
                    id: typeof o === "string" ? o : o.id,
                    label: typeof o === "string" ? undefined : o.label,
                })),
            }));

            const assignedIds = new Set(
                mappedPeriods.flatMap((p) => p.items.map((i) => i.id))
            );

            const remaining = initialOutcomes
                .filter((o) => !assignedIds.has(o))
                .map((o) => ({ id: o }));

            setPeriods(mappedPeriods);
            setUnassigned(remaining);
        } else {
            setUnassigned(initialOutcomes.map((o) => ({ id: o })));
        }
    }, [initialOutcomes, importedConfig]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const togglePeriodCollapse = (periodId: string) => {
        setCollapsedPeriods((prev) => ({ ...prev, [periodId]: !prev[periodId] }));
    };

    const addPeriod = () => {
        if (!newPeriodName.trim()) {
            toast.error("Ingresa un nombre para el periodo");
            return;
        }
        const newPeriod: TimelinePeriod = {
            id: `period-${Date.now()}`,
            name: newPeriodName.trim(),
            items: [],
        };
        setPeriods([...periods, newPeriod]);
        setNewPeriodName("");
        toast.success(`Periodo '${newPeriod.name}' creado`);
    };

    const deletePeriod = (periodId: string) => {
        const periodToDelete = periods.find((p) => p.id === periodId);
        if (!periodToDelete) return;

        // Return items to unassigned
        setUnassigned((prev) => [...prev, ...periodToDelete.items]);
        setPeriods((prev) => prev.filter((p) => p.id !== periodId));
        toast.info(`Periodo eliminado. ${periodToDelete.items.length} RA regresaron a la lista de pendientes.`);
    };

    const handleLabelChange = (outcomeId: string, newLabel: string) => {
        setPeriods((prev) =>
            prev.map((period) => ({
                ...period,
                items: period.items.map((item) =>
                    item.id === outcomeId ? { ...item, label: newLabel.trim() || undefined } : item
                ),
            }))
        );
        toast.success("Etiqueta actualizada");
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeIdStr = active.id as string;
        const overIdStr = over.id as string;

        // Find containers
        const activeContainer = findContainer(activeIdStr);
        const overContainer = findContainer(overIdStr) || overIdStr;

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        // Moving between containers
        if (activeContainer === "unassigned") {
            const item = unassigned.find((i) => i.id === activeIdStr);
            if (!item) return;

            setUnassigned((prev) => prev.filter((i) => i.id !== activeIdStr));
            setPeriods((prev) =>
                prev.map((p) => {
                    if (p.id === overContainer) {
                        return { ...p, items: [...p.items, item] };
                    }
                    return p;
                })
            );
        } else if (overContainer === "unassigned") {
            let itemToMove: TimelineOutcomeItem | undefined;
            setPeriods((prev) =>
                prev.map((p) => {
                    if (p.id === activeContainer) {
                        itemToMove = p.items.find((i) => i.id === activeIdStr);
                        return { ...p, items: p.items.filter((i) => i.id !== activeIdStr) };
                    }
                    return p;
                })
            );
            if (itemToMove) {
                setUnassigned((prev) => [...prev, itemToMove!]);
            }
        } else {
            // Between two periods
            let itemToMove: TimelineOutcomeItem | undefined;
            setPeriods((prev) =>
                prev.map((p) => {
                    if (p.id === activeContainer) {
                        itemToMove = p.items.find((i) => i.id === activeIdStr);
                        return { ...p, items: p.items.filter((i) => i.id !== activeIdStr) };
                    }
                    return p;
                })
            );
            if (itemToMove) {
                setPeriods((prev) =>
                    prev.map((p) => {
                        if (p.id === overContainer) {
                            return { ...p, items: [...p.items, itemToMove!] };
                        }
                        return p;
                    })
                );
            }
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const activeIdStr = active.id as string;
        const overIdStr = over.id as string;

        const activeContainer = findContainer(activeIdStr);
        const overContainer = findContainer(overIdStr) || overIdStr;

        if (!activeContainer || !overContainer) return;

        if (activeContainer === overContainer) {
            if (activeContainer === "unassigned") {
                const oldIndex = unassigned.findIndex((i) => i.id === activeIdStr);
                const newIndex = unassigned.findIndex((i) => i.id === overIdStr);
                if (oldIndex !== -1 && newIndex !== -1) {
                    setUnassigned(arrayMove(unassigned, oldIndex, newIndex));
                }
            } else {
                setPeriods((prev) =>
                    prev.map((p) => {
                        if (p.id === activeContainer) {
                            const oldIndex = p.items.findIndex((i) => i.id === activeIdStr);
                            const newIndex = p.items.findIndex((i) => i.id === overIdStr);
                            if (oldIndex !== -1 && newIndex !== -1) {
                                return { ...p, items: arrayMove(p.items, oldIndex, newIndex) };
                            }
                        }
                        return p;
                    })
                );
            }
        }
    };

    const findContainer = (id: string) => {
        if (unassigned.some((i) => i.id === id)) return "unassigned";
        for (const p of periods) {
            if (p.items.some((i) => i.id === id)) return p.id;
        }
        if (periods.some((p) => p.id === id)) return id;
        return null;
    };

    // Export Config
    const handleExportConfig = () => {
        const config: TimelineConfig = {
            type: "sofia-timeline",
            periods: periods.map((p) => ({
                name: p.name,
                outcomes: p.items.map((i) => ({
                    id: i.id,
                    label: i.label,
                })),
            })),
        };

        const jsonStr = JSON.stringify(config, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sofia_timeline_config_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Configuración JSON descargada");
    };

    const filteredUnassigned = unassigned.filter((item) =>
        item.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-xl border border-border/70">
                <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                        <h4 className="font-bold text-sm">Organizador de Línea de Tiempo</h4>
                        <p className="text-xs text-muted-foreground">
                            Distribuye los RA en periodos y exporta la plantilla para reutilizarla.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportConfig}
                        className="h-8 gap-1.5 text-xs font-semibold rounded-xl"
                    >
                        <Download className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Exportar Configuración JSON</span>
                    </Button>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Panel: Unassigned Outcomes */}
                    <Card className="lg:col-span-4 flex flex-col h-[650px] border border-border/70 shadow-xs">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                    <span>Resultados sin Asignar</span>
                                    <Badge variant="secondary" className="text-[10px] font-bold">
                                        {unassigned.length}
                                    </Badge>
                                </CardTitle>
                            </div>
                            <div className="relative mt-2">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar resultado de aprendizaje..."
                                    className="h-8 text-xs pl-8 rounded-lg"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-3">
                            <SortableContext
                                id="unassigned"
                                items={unassigned.map((i) => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {filteredUnassigned.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-center p-6 text-xs text-muted-foreground">
                                        {searchTerm
                                            ? "No hay resultados que coincidan con la búsqueda."
                                            : "¡Excelente! Todos los RA han sido asignados a un periodo."}
                                    </div>
                                ) : (
                                    filteredUnassigned.map((item) => (
                                        <SortableItem key={item.id} id={item.id} item={item} />
                                    ))
                                )}
                            </SortableContext>
                        </CardContent>
                    </Card>

                    {/* Right Panel: Periods */}
                    <div className="lg:col-span-8 space-y-4">
                        {/* Add Period Input */}
                        <div className="flex items-center gap-2 bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
                            <Input
                                value={newPeriodName}
                                onChange={(e) => setNewPeriodName(e.target.value)}
                                placeholder="Nombre del nuevo periodo (Ej: Trimestre 3, Fase Ejecución...)"
                                className="h-8 text-xs flex-1 rounded-lg"
                                onKeyDown={(e) => e.key === "Enter" && addPeriod()}
                            />
                            <Button size="sm" onClick={addPeriod} className="h-8 text-xs gap-1.5 rounded-lg">
                                <Plus className="h-3.5 w-3.5" />
                                <span>Agregar Periodo</span>
                            </Button>
                        </div>

                        {/* Periods Container */}
                        <div className="space-y-3.5 h-[580px] overflow-y-auto pr-1">
                            {periods.map((period) => {
                                const isCollapsed = Boolean(collapsedPeriods[period.id]);
                                return (
                                    <Card
                                        key={period.id}
                                        className="border border-border/70 shadow-xs overflow-hidden"
                                    >
                                        <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border/50 flex flex-row items-center justify-between">
                                            <div
                                                className="flex items-center gap-2 cursor-pointer select-none"
                                                onClick={() => togglePeriodCollapse(period.id)}
                                            >
                                                {isCollapsed ? (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                <CardTitle className="text-xs font-bold text-foreground">
                                                    {period.name}
                                                </CardTitle>
                                                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                                    {period.items.length} RA
                                                </Badge>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deletePeriod(period.id)}
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                                                title="Eliminar periodo"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </CardHeader>

                                        {!isCollapsed && (
                                            <CardContent className="p-3 min-h-[90px] bg-background/50">
                                                <SortableContext
                                                    id={period.id}
                                                    items={period.items.map((i) => i.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {period.items.length === 0 ? (
                                                        <div className="h-20 border-2 border-dashed border-border/70 rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                                                            Arrastra aquí los RA correspondientes a este periodo
                                                        </div>
                                                    ) : (
                                                        period.items.map((item) => (
                                                            <SortableItem
                                                                key={item.id}
                                                                id={item.id}
                                                                item={item}
                                                                onLabelChange={handleLabelChange}
                                                            />
                                                        ))
                                                    )}
                                                </SortableContext>
                                            </CardContent>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <DragOverlay>
                    {activeId ? <SortableItem id={activeId} isOverlay /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
