"use client";

import React, { useState } from "react";
import { DayOfWeek } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, Users, CalendarDays, ChevronRight, Sun, Cloud, Moon } from "lucide-react";
import { AcademicScheduleItem } from "../types";

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "MONDAY", label: "Lunes", short: "Lun" },
  { key: "TUESDAY", label: "Martes", short: "Mar" },
  { key: "WEDNESDAY", label: "Miércoles", short: "Mié" },
  { key: "THURSDAY", label: "Jueves", short: "Jue" },
  { key: "FRIDAY", label: "Viernes", short: "Vie" },
  { key: "SATURDAY", label: "Sábado", short: "Sáb" },
  { key: "SUNDAY", label: "Domingo", short: "Dom" },
];

// Helper to determine time of day info (Mañana = Nube celeste, Tarde = Sol naranja, Noche = Luna púrpura)
const getTimeOfDayInfo = (startTime?: string, endTime?: string) => {
  if (!startTime || !endTime) return null;
  const [sh] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const effectiveEndH = em > 0 ? eh + 1 : eh;

  if (sh < 12 && effectiveEndH <= 12) {
    return {
      label: "Mañana",
      icon: <Cloud className="w-3 h-3 text-sky-500 shrink-0" />,
      badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    };
  }
  if (sh >= 12 && effectiveEndH <= 18) {
    return {
      label: "Tarde",
      icon: <Sun className="w-3 h-3 text-orange-500 shrink-0" />,
      badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    };
  }
  if (sh >= 18) {
    return {
      label: "Noche",
      icon: <Moon className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />,
      badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    };
  }
  return {
    label: "Mixta",
    icon: (
      <span className="inline-flex items-center gap-0.5 shrink-0">
        <Cloud className="w-2.5 h-2.5 text-sky-500" />
        <Sun className="w-2.5 h-2.5 text-orange-500" />
      </span>
    ),
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  };
};

// Palette for different groups
const GROUP_COLORS = [
  "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
];

interface ScheduleWeekPreviewProps {
  schedule: AcademicScheduleItem;
}

export function ScheduleWeekPreview({ schedule }: ScheduleWeekPreviewProps) {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("ALL");

  // Get unique groups in this schedule
  const uniqueGroupsMap = new Map<string, { id: string; name: string; programName: string; periodName?: string }>();
  schedule.groupSlots.forEach((slot) => {
    if (!uniqueGroupsMap.has(slot.groupId)) {
      uniqueGroupsMap.set(slot.groupId, {
        id: slot.groupId,
        name: slot.group.name,
        programName: slot.group.program?.name || "Sin programa",
        periodName: slot.period?.name || undefined,
      });
    }
  });

  const uniqueGroups = Array.from(uniqueGroupsMap.values());

  // Assign consistent colors to group IDs
  const colorMap = new Map<string, string>();
  uniqueGroups.forEach((g, idx) => {
    colorMap.set(g.id, GROUP_COLORS[idx % GROUP_COLORS.length]);
  });

  // Filter slots
  const filteredSlots = selectedGroupFilter === "ALL"
    ? schedule.groupSlots
    : schedule.groupSlots.filter((s) => s.groupId === selectedGroupFilter);

  // Group slots by day
  const slotsByDay: Record<DayOfWeek, typeof filteredSlots> = {
    MONDAY: [],
    TUESDAY: [],
    WEDNESDAY: [],
    THURSDAY: [],
    FRIDAY: [],
    SATURDAY: [],
    SUNDAY: [],
  };

  filteredSlots.forEach((slot) => {
    if (slotsByDay[slot.dayOfWeek]) {
      slotsByDay[slot.dayOfWeek].push(slot);
    }
  });

  // Sort slots in each day by startTime
  Object.keys(slotsByDay).forEach((dayKey) => {
    slotsByDay[dayKey as DayOfWeek].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return (
    <div className="space-y-4">
      {/* Top Bar: Group Filter Pills & Time of Day Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        {uniqueGroups.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs flex-wrap">
            <span className="text-muted-foreground font-medium flex items-center gap-1 shrink-0">
              <Users className="w-3.5 h-3.5" /> Filtrar grupo:
            </span>
            <button
              type="button"
              onClick={() => setSelectedGroupFilter("ALL")}
              className={`px-2.5 py-1 rounded-full border transition-all ${
                selectedGroupFilter === "ALL"
                  ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                  : "bg-background hover:bg-muted text-muted-foreground border-border"
              }`}
            >
              Todos ({uniqueGroups.length})
            </button>
            {uniqueGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroupFilter(g.id)}
                className={`px-2.5 py-1 rounded-full border transition-all truncate max-w-[220px] ${
                  selectedGroupFilter === g.id
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-background hover:bg-muted text-muted-foreground border-border"
                }`}
              >
                {g.name} {g.periodName ? `• ${g.periodName}` : ""}
              </button>
            ))}
          </div>
        )}

        {/* Jornada Legend Bar */}
        <div className="flex items-center gap-3 bg-card px-3 py-1.5 rounded-xl border border-border/80 text-[11px] font-semibold text-muted-foreground shadow-2xs self-start sm:self-auto">
          <span className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-sky-500" />
            <span>Mañana</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-orange-500" />
            <span>Tarde</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Noche</span>
          </span>
        </div>
      </div>

      {/* 7-Day Grid: Monday to Sunday */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {DAYS.map((day) => {
          const slots = slotsByDay[day.key];
          const hasSlots = slots && slots.length > 0;

          return (
            <div
              key={day.key}
              className={`flex flex-col rounded-2xl border transition-colors ${
                hasSlots
                  ? "bg-card border-border/80 shadow-xs"
                  : "bg-muted/30 border-dashed border-border/50"
              }`}
            >
              {/* Day Header */}
              <div className="p-3 border-b border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-foreground block">{day.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {slots.length} {slots.length === 1 ? "franja" : "franjas"}
                  </span>
                </div>
                {hasSlots && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                )}
              </div>

              {/* Day Slots List */}
              <div className="p-2.5 space-y-2 flex-1 min-h-[110px]">
                {hasSlots ? (
                  slots.map((slot) => {
                    const colorClasses = colorMap.get(slot.groupId) || GROUP_COLORS[0];
                    const timeInfo = getTimeOfDayInfo(slot.startTime, slot.endTime);

                    return (
                      <div
                        key={slot.id}
                        className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-all hover:scale-[1.02] shadow-xs ${colorClasses}`}
                      >
                        {/* Group Name & Jornada Indicator */}
                        <div className="font-bold text-foreground leading-tight flex items-start justify-between gap-1.5">
                          <span className="truncate">{slot.group.name}</span>
                          {timeInfo && (
                            <span
                              title={`Jornada: ${timeInfo.label}`}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${timeInfo.badgeClass}`}
                            >
                              {timeInfo.icon}
                              <span>{timeInfo.label}</span>
                            </span>
                          )}
                        </div>

                        {/* Program Name & Period Badge */}
                        <div className="text-[10px] text-muted-foreground flex items-center justify-between gap-1 font-medium">
                          <span className="truncate">{slot.group.program?.name}</span>
                          {slot.period?.name && (
                            <span className="font-bold text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                              {slot.period.name}
                            </span>
                          )}
                        </div>

                        {/* Time Franja with Clock Icon */}
                        <div className="flex items-center gap-1 font-mono font-medium text-[11px] pt-1 border-t border-border/40 text-foreground/90">
                          <Clock className="w-3 h-3 shrink-0 text-muted-foreground" />
                          <span>
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-2 text-muted-foreground/60 text-xs italic">
                    Sin franja asignada
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
