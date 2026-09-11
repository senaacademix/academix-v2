"use client";

import React, { useState, useEffect } from "react";
import { DayOfWeek } from "@/generated/prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  Users,
  Search,
  Check,
  Copy,
  Sparkles,
  Layers,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { SchedulePanelHelpModal } from "./SchedulePanelHelpModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  AcademicScheduleItem,
  AvailableGroupOption,
  DaySlotConfig,
  SaveGroupSlotsPayload,
} from "../types";
import { saveScheduleGroupSlotsAction, getAvailableGroupsAction } from "../actions/scheduleManagerActions";
import Link from "next/link";

const DAYS_OF_WEEK: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "MONDAY", label: "Lunes", short: "Lun" },
  { key: "TUESDAY", label: "Martes", short: "Mar" },
  { key: "WEDNESDAY", label: "Miércoles", short: "Mié" },
  { key: "THURSDAY", label: "Jueves", short: "Jue" },
  { key: "FRIDAY", label: "Viernes", short: "Vie" },
  { key: "SATURDAY", label: "Sábado", short: "Sáb" },
  { key: "SUNDAY", label: "Domingo", short: "Dom" },
];

function createDefaultDaySlots(): DaySlotConfig[] {
  return DAYS_OF_WEEK.map((d) => ({
    dayOfWeek: d.key,
    enabled: d.key !== "SATURDAY" && d.key !== "SUNDAY",
    startTime: "06:00",
    endTime: "12:00",
  }));
}

// 24-hour format options in 1-hour intervals (00:00 to 23:00)
const TIME_OPTIONS_24H_1H: string[] = (() => {
  const list: string[] = [];
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, "0");
    list.push(`${hh}:00`);
  }
  return list;
})();

function getTimeOptions(currentVal?: string, isEndTime?: boolean): string[] {
  const base = [...TIME_OPTIONS_24H_1H];
  if (isEndTime && !base.includes("23:59")) {
    base.push("23:59");
  }
  if (currentVal && !base.includes(currentVal)) {
    base.push(currentVal);
    base.sort();
  }
  return base;
}

function formatDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "";
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const diffMins = endMins - startMins;
  if (diffMins <= 0) return "Inválido";
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

interface ScheduleGroupSlotsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: AcademicScheduleItem | null;
  availableGroups: AvailableGroupOption[];
  onSuccess: () => void;
  programId?: string;
}

export function ScheduleGroupSlotsModal({
  open,
  onOpenChange,
  schedule,
  availableGroups,
  onSuccess,
  programId,
}: ScheduleGroupSlotsModalProps) {
  const isScopedToProgram = Boolean(programId && programId !== "all" && programId !== "ALL");
  const [activeTab, setActiveTab] = useState<string>("groups");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [groupsList, setGroupsList] = useState<AvailableGroupOption[]>(() => {
    return isScopedToProgram
      ? availableGroups.filter((g) => g.programId === programId)
      : availableGroups;
  });
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(false);

  // Selected Group IDs
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>("");
  const [programFilter, setProgramFilter] = useState<string>("ALL");

  // Group Configurations (Day slots for each group: groupId -> DaySlotConfig[])
  const [groupSlotsMap, setGroupSlotsMap] = useState<Record<string, DaySlotConfig[]>>({});
  const [groupPeriodsMap, setGroupPeriodsMap] = useState<Record<string, string>>({});
  const [activeGroupSlotTab, setActiveGroupSlotTab] = useState<string>("");
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !schedule) return;

    // Refresh groups list dynamically
    const fetchLatestGroups = async () => {
      setIsLoadingGroups(true);
      try {
        const latest = await getAvailableGroupsAction(isScopedToProgram ? programId : undefined);
        let groups = latest && latest.length > 0 ? latest : availableGroups;
        if (isScopedToProgram) {
          groups = groups.filter((g) => g.programId === programId);
        }
        setGroupsList(groups);
      } catch (err) {
        console.error("Error fetching latest groups:", err);
        const fallback = isScopedToProgram
          ? availableGroups.filter((g) => g.programId === programId)
          : availableGroups;
        setGroupsList(fallback);
      } finally {
        setIsLoadingGroups(false);
      }
    };
    fetchLatestGroups();

    // Populate from existing schedule group slots (strictly scoped if active program)
    const groupMap: Record<string, DaySlotConfig[]> = {};
    const periodsMap: Record<string, string> = {};
    const grpIds: string[] = [];

    schedule.groupSlots.forEach((slot) => {
      if (isScopedToProgram && slot.group.program?.id !== programId) {
        return;
      }

      if (!grpIds.includes(slot.groupId)) {
        grpIds.push(slot.groupId);
        if (slot.periodId) {
          periodsMap[slot.groupId] = slot.periodId;
        }
        groupMap[slot.groupId] = createDefaultDaySlots().map((d) => ({
          ...d,
          enabled: false,
        }));
      }

      const dayConfig = groupMap[slot.groupId]?.find((d) => d.dayOfWeek === slot.dayOfWeek);
      if (dayConfig) {
        dayConfig.enabled = true;
        dayConfig.startTime = slot.startTime;
        dayConfig.endTime = slot.endTime;
      }
    });

    setSelectedGroupIds(grpIds);
    setGroupSlotsMap(groupMap);
    setGroupPeriodsMap(periodsMap);
    if (grpIds.length > 0) {
      setActiveGroupSlotTab(grpIds[0]);
      setActiveTab("slots"); // Go directly to slots if it already has groups
    } else {
      setActiveGroupSlotTab("");
      setActiveTab("groups");
    }
  }, [open, schedule, availableGroups, programId, isScopedToProgram]);

  if (!schedule) return null;

  // Unique programs for filtering
  const uniquePrograms = Array.from(
    new Set(groupsList.map((g) => g.programName))
  );

  // Filtered available groups (strictly scoped if active program)
  const filteredAvailableGroups = groupsList.filter((g) => {
    if (isScopedToProgram && g.programId !== programId) return false;
    const matchesSearch =
      g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
      g.programName.toLowerCase().includes(groupSearchQuery.toLowerCase());
    const matchesProgram =
      isScopedToProgram || programFilter === "ALL" || g.programName === programFilter;
    return matchesSearch && matchesProgram;
  });

  // Toggle group selection
  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      let updated: string[];
      if (prev.includes(groupId)) {
        updated = prev.filter((id) => id !== groupId);
        const newMap = { ...groupSlotsMap };
        delete newMap[groupId];
        setGroupSlotsMap(newMap);
        if (activeGroupSlotTab === groupId) {
          setActiveGroupSlotTab(updated[0] || "");
        }
      } else {
        updated = [...prev, groupId];
        setGroupSlotsMap((m) => ({
          ...m,
          [groupId]: createDefaultDaySlots(),
        }));
        if (!activeGroupSlotTab) {
          setActiveGroupSlotTab(groupId);
        }
      }
      return updated;
    });
  };

  // Update day slot
  const handleUpdateDaySlot = (
    groupId: string,
    dayKey: DayOfWeek,
    field: "enabled" | "startTime" | "endTime",
    value: any
  ) => {
    setGroupSlotsMap((prev) => {
      const currentSlots = prev[groupId] || createDefaultDaySlots();
      const updatedSlots = currentSlots.map((slot) => {
        if (slot.dayOfWeek === dayKey) {
          const updated = { ...slot, [field]: value };
          // If startTime is updated and is >= current endTime, suggest a valid endTime (e.g., +4 hours, max 23:45)
          if (field === "startTime" && updated.enabled && updated.endTime) {
            const [sh, sm] = value.split(":").map(Number);
            const [eh, em] = updated.endTime.split(":").map(Number);
            if (sh * 60 + sm >= eh * 60 + em) {
              const newEndMin = Math.min(sh * 60 + sm + 240, 23 * 60 + 45);
              const ehNew = Math.floor(newEndMin / 60);
              const emNew = newEndMin % 60;
              updated.endTime = `${String(ehNew).padStart(2, "0")}:${String(emNew).padStart(2, "0")}`;
            }
          }
          return updated;
        }
        return slot;
      });
      return { ...prev, [groupId]: updatedSlots };
    });
  };

  // Quick Preset: Apply Preset to Monday-Friday for a group
  const handleApplyPresetToGroup = (
    groupId: string,
    preset: "MORNING" | "AFTERNOON" | "NIGHT" | "COPY_MON"
  ) => {
    setGroupSlotsMap((prev) => {
      const currentSlots = prev[groupId] || createDefaultDaySlots();
      let startTime = "06:00";
      let endTime = "12:00";

      if (preset === "MORNING") {
        startTime = "06:00";
        endTime = "12:00";
      } else if (preset === "AFTERNOON") {
        startTime = "12:00";
        endTime = "18:00";
      } else if (preset === "NIGHT") {
        startTime = "18:00";
        endTime = "22:00";
      } else if (preset === "COPY_MON") {
        const mon = currentSlots.find((d) => d.dayOfWeek === "MONDAY");
        if (mon) {
          startTime = mon.startTime;
          endTime = mon.endTime;
        }
      }

      const updatedSlots = currentSlots.map((slot) => {
        if (slot.dayOfWeek !== "SATURDAY" && slot.dayOfWeek !== "SUNDAY") {
          return {
            ...slot,
            enabled: true,
            startTime,
            endTime,
          };
        }
        return slot;
      });

      return { ...prev, [groupId]: updatedSlots };
    });

    toast.success("Franjas aplicadas a Lunes-Viernes");
  };

  // Quick Action: Copy current group's slots to all other selected groups
  const handleCopySlotsToAllGroups = (sourceGroupId: string) => {
    const sourceSlots = groupSlotsMap[sourceGroupId];
    if (!sourceSlots) return;

    setGroupSlotsMap((prev) => {
      const updated = { ...prev };
      selectedGroupIds.forEach((gid) => {
        updated[gid] = JSON.parse(JSON.stringify(sourceSlots));
      });
      return updated;
    });

    toast.success("Franjas replicadas a todos los grupos asignados");
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schedule) return;

    const groupsConfig: SaveGroupSlotsPayload["groupsConfig"] = [];

    selectedGroupIds.forEach((gid) => {
      const slots = groupSlotsMap[gid] || [];
      const activeSlots = slots
        .filter((s) => s.enabled && s.startTime && s.endTime)
        .map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        }));

      if (activeSlots.length > 0) {
        groupsConfig.push({
          groupId: gid,
          periodId: groupPeriodsMap[gid] || null,
          slots: activeSlots,
        });
      }
    });

    setIsSubmitting(true);
    try {
      await saveScheduleGroupSlotsAction({
        scheduleId: schedule.id,
        programId: isScopedToProgram ? programId : undefined,
        groupsConfig,
      });
      toast.success("Grupos y franjas horarias actualizados correctamente");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al guardar las franjas horarias");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none sm:max-w-none !max-w-none !w-screen min-w-full min-h-full rounded-none m-0 border-0 flex flex-col p-0 overflow-hidden bg-background shadow-none z-50">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold text-foreground">
                    {schedule.name}
                  </DialogTitle>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Asigna los grupos a este horario y define sus horas de inicio y fin de Lunes a Domingo.
                </DialogDescription>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsHelpOpen(true)}
                  className="w-9 h-9 rounded-xl border-border/80 hover:bg-muted text-foreground shadow-2xs shrink-0 mr-8"
                >
                  <HelpCircle className="w-4.5 h-4.5 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">¿Qué puedo hacer acá? Guía de Grupos</TooltipContent>
            </Tooltip>
          </div>
        </DialogHeader>

        {/* Tabs Navigator */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-3 border-b border-border/60 bg-muted/10">
            <TabsList className="bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="groups" className="rounded-lg text-xs gap-1.5 px-4 py-2">
                <Users className="w-3.5 h-3.5" />
                1. Asignar Grupos
                {selectedGroupIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] h-4">
                    {selectedGroupIds.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="slots"
                disabled={selectedGroupIds.length === 0}
                className="rounded-lg text-xs gap-1.5 px-4 py-2"
              >
                <Clock className="w-3.5 h-3.5" />
                2. Franjas Horarias (Lun-Dom)
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: Assign Groups */}
            <TabsContent value="groups" className="mt-0 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar grupo o programa..."
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    className="pl-9 rounded-xl text-xs"
                  />
                </div>

                {!isScopedToProgram && uniquePrograms.length > 1 && (
                  <select
                    value={programFilter}
                    onChange={(e) => setProgramFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">Todos los programas</option>
                    {uniquePrograms.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Group Checkboxes List */}
              <div className="border border-border/80 rounded-2xl p-3 bg-muted/10 max-h-[380px] overflow-y-auto">
                {groupsList.length === 0 ? (
                  <div className="text-center py-10 px-4 space-y-3">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/40" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-foreground">
                        No hay grupos en Etapa Lectiva
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Los grupos deben estar registrados en categoría <strong>Etapa Lectiva</strong> dentro de la Estructura Académica para poder configurarles horarios.
                      </p>
                    </div>
                    <Link
                      href="/dashboard/admin/courses"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                      onClick={() => onOpenChange(false)}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Ir a Estructura Académica
                    </Link>
                  </div>
                ) : filteredAvailableGroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No se encontraron grupos en etapa lectiva que coincidan con la búsqueda.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {filteredAvailableGroups.map((grp) => {
                      const isSelected = selectedGroupIds.includes(grp.id);
                      return (
                        <div
                          key={grp.id}
                          onClick={() => handleToggleGroup(grp.id)}
                          className={`flex flex-col p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary/10 border-primary/40 shadow-xs"
                              : "bg-card hover:bg-muted/40 border-border/60"
                          }`}
                        >
                          <div className="flex items-center justify-between min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-5 h-5 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted-foreground/30 bg-background"
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-xs text-foreground block truncate">
                                  {grp.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground block truncate">
                                  {grp.programName}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] font-semibold">
                                Etapa Lectiva
                              </Badge>
                            </div>
                          </div>

                          {isSelected && (grp.availablePeriods || []).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">Periodo:</span>
                              <select
                                value={groupPeriodsMap[grp.id] || "none"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGroupPeriodsMap((prev) => ({
                                    ...prev,
                                    [grp.id]: val === "none" ? "" : val,
                                  }));
                                }}
                                className="px-2 py-1 rounded-lg border border-input bg-background text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary truncate max-w-[220px]"
                              >
                                {(() => {
                                  const normal = (grp.availablePeriods || []).filter((p) => !p.esEspecial);
                                  const special = (grp.availablePeriods || []).filter((p) => p.esEspecial);
                                  return (
                                    <>
                                      <option value="none">Sin periodo asignado</option>
                                      {normal.length > 0 && (
                                        <optgroup label="Periodos Normales">
                                          {normal.map((p) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name}
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                      {special.length > 0 && (
                                        <optgroup label="Periodos Especiales">
                                          {special.map((p) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name} (Especial)
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                    </>
                                  );
                                })()}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>
                  {selectedGroupIds.length} de {groupsList.length} grupos seleccionados
                </span>
                {selectedGroupIds.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedGroupIds([])}
                    className="text-xs h-7 text-destructive hover:text-destructive"
                  >
                    Limpiar selección
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: Day Slots Config */}
            <TabsContent value="slots" className="mt-0 space-y-4">
              {selectedGroupIds.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  <p>Selecciona al menos un grupo en la pestaña anterior para configurar sus franjas.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Group Pills Selector */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {selectedGroupIds.map((gid) => {
                      const grp = groupsList.find((g) => g.id === gid);
                      const isTabActive = activeGroupSlotTab === gid;
                      return (
                        <button
                          key={gid}
                          type="button"
                          onClick={() => setActiveGroupSlotTab(gid)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
                            isTabActive
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/80"
                          }`}
                        >
                          {grp?.name || "Grupo"}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Group Slots Editor */}
                  {activeGroupSlotTab && (
                    <div className="space-y-4 border border-border/80 rounded-2xl p-5 bg-muted/10">
                      {/* Group Header & Presets */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div>
                            <h4 className="font-bold text-sm text-foreground">
                              {groupsList.find((g) => g.id === activeGroupSlotTab)?.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {groupsList.find((g) => g.id === activeGroupSlotTab)?.programName}
                            </p>
                          </div>

                          {/* Period Selector for Active Group */}
                          {((groupsList.find((g) => g.id === activeGroupSlotTab)?.availablePeriods) || []).length > 0 && (
                            <div className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-xl border border-border/80 shadow-2xs">
                              <span className="text-[11px] font-bold text-muted-foreground shrink-0">Periodo:</span>
                              <select
                                value={groupPeriodsMap[activeGroupSlotTab] || "none"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGroupPeriodsMap((prev) => ({
                                    ...prev,
                                    [activeGroupSlotTab]: val === "none" ? "" : val,
                                  }));
                                }}
                                className="px-2 py-0.5 rounded-lg border border-input bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                {(() => {
                                  const activePeriods = (groupsList.find((g) => g.id === activeGroupSlotTab)?.availablePeriods) || [];
                                  const normal = activePeriods.filter((p) => !p.esEspecial);
                                  const special = activePeriods.filter((p) => p.esEspecial);
                                  return (
                                    <>
                                      <option value="none">Sin periodo asignado</option>
                                      {normal.length > 0 && (
                                        <optgroup label="Periodos Normales">
                                          {normal.map((p) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name}
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                      {special.length > 0 && (
                                        <optgroup label="Periodos Especiales">
                                          {special.map((p) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name} (Especial)
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                    </>
                                  );
                                })()}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Fast Presets Toolbar */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-[11px] text-muted-foreground font-medium mr-1">
                            Plantillas:
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleApplyPresetToGroup(activeGroupSlotTab, "MORNING")}
                            className="h-7 text-[11px] rounded-lg px-2.5"
                          >
                            Mañana (6-12)
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleApplyPresetToGroup(activeGroupSlotTab, "AFTERNOON")}
                            className="h-7 text-[11px] rounded-lg px-2.5"
                          >
                            Tarde (12-18)
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleApplyPresetToGroup(activeGroupSlotTab, "NIGHT")}
                            className="h-7 text-[11px] rounded-lg px-2.5"
                          >
                            Noche (18-22)
                          </Button>
                          {selectedGroupIds.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopySlotsToAllGroups(activeGroupSlotTab)}
                              className="h-7 text-[11px] rounded-lg px-2.5 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            >
                              <Copy className="w-3 h-3" />
                              Copiar a todos los grupos
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 7 Days List: Lunes to Domingo */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(groupSlotsMap[activeGroupSlotTab] || createDefaultDaySlots()).map(
                          (dayConfig) => {
                            const dayMeta = DAYS_OF_WEEK.find((d) => d.key === dayConfig.dayOfWeek);
                            return (
                              <div
                                key={dayConfig.dayOfWeek}
                                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                                  dayConfig.enabled
                                    ? "bg-card border-border shadow-xs hover:border-primary/40"
                                    : "bg-muted/30 border-dashed border-border/60 opacity-60"
                                }`}
                              >
                                <div className="flex items-center gap-3 shrink-0">
                                  <Switch
                                    checked={dayConfig.enabled}
                                    onCheckedChange={(checked) =>
                                      handleUpdateDaySlot(
                                        activeGroupSlotTab,
                                        dayConfig.dayOfWeek,
                                        "enabled",
                                        checked
                                      )
                                    }
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-bold text-xs text-foreground">
                                      {dayMeta?.label}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {dayConfig.enabled ? "Lectivo" : "No lectivo"}
                                    </span>
                                  </div>
                                </div>

                                {dayConfig.enabled ? (
                                  <div className="flex items-center gap-2 text-xs font-mono shrink-0 flex-wrap sm:flex-nowrap justify-end">
                                    {/* Hora Inicio (24 Horas, intervalos de 15 min) */}
                                    <div className="flex items-center gap-1.5 bg-background dark:bg-muted/30 px-2 py-1 rounded-xl border border-input shadow-2xs hover:border-primary/50 transition-colors">
                                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                      <select
                                        value={dayConfig.startTime}
                                        onChange={(e) =>
                                          handleUpdateDaySlot(
                                            activeGroupSlotTab,
                                            dayConfig.dayOfWeek,
                                            "startTime",
                                            e.target.value
                                          )
                                        }
                                        className="bg-transparent font-mono text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                                      >
                                        {getTimeOptions(dayConfig.startTime, false).map((t) => (
                                          <option key={t} value={t} className="bg-background text-foreground font-mono">
                                            {t}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <span className="text-muted-foreground font-sans font-medium text-xs">a</span>

                                    {/* Hora Fin (24 Horas, intervalos de 15 min) */}
                                    <div className="flex items-center gap-1.5 bg-background dark:bg-muted/30 px-2 py-1 rounded-xl border border-input shadow-2xs hover:border-primary/50 transition-colors">
                                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                      <select
                                        value={dayConfig.endTime}
                                        onChange={(e) =>
                                          handleUpdateDaySlot(
                                            activeGroupSlotTab,
                                            dayConfig.dayOfWeek,
                                            "endTime",
                                            e.target.value
                                          )
                                        }
                                        className="bg-transparent font-mono text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                                      >
                                        {getTimeOptions(dayConfig.endTime, true).map((t) => (
                                          <option key={t} value={t} className="bg-background text-foreground font-mono">
                                            {t}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Chip de Duración en Horas y Minutos */}
                                    {(() => {
                                      const dur = formatDuration(dayConfig.startTime, dayConfig.endTime);
                                      const isInvalid = dur === "Inválido";
                                      return (
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg font-sans transition-colors ${
                                            isInvalid
                                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                                              : "bg-muted/70 text-muted-foreground border border-border/60"
                                          }`}
                                          title={isInvalid ? "La hora de fin debe ser posterior a la de inicio" : `Duración calculada: ${dur}`}
                                        >
                                          {dur}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-[11px] text-muted-foreground bg-background font-normal border-dashed">
                                    Día no lectivo
                                  </Badge>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 border-t border-border/80 bg-muted/20 flex flex-row items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>

            <div className="flex items-center gap-2">
              {activeTab === "groups" && (
                <Button
                  type="button"
                  onClick={() => setActiveTab("slots")}
                  disabled={selectedGroupIds.length === 0}
                  className="rounded-xl text-xs gap-1"
                >
                  Siguiente: Franjas Horarias &rarr;
                </Button>
              )}

              {activeTab === "slots" && (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-md"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Grupos y Franjas"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </Tabs>

        <SchedulePanelHelpModal
          panel="groups"
          open={isHelpOpen}
          onOpenChange={setIsHelpOpen}
          scheduleName={schedule.name}
        />
      </DialogContent>
    </Dialog>
  );
}
