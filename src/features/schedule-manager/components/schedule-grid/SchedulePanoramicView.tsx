"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  BookOpen,
  Clock,
  Building,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Check,
  AlertCircle,
  Calendar,
  Lock,
} from "lucide-react";
import { ScheduleBuilderData } from "../../actions/scheduleBuilderActions";
import { DayOfWeek } from "@/generated/prisma/client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  getCompactTeacherName,
  getCleanTeacherName,
} from "../../utils/teacherNameFormatter";

const toFormat12h = (time24: string) => {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

interface SchedulePanoramicViewProps {
  data: ScheduleBuilderData;
  onSelectGroupAndEdit: (groupId: string) => void;
  onOpenScheduleModal: (groupId: string, courseTitle?: string) => void;
}

const DAYS: Array<{ key: DayOfWeek; label: string; short: string }> = [
  { key: "MONDAY", label: "Lunes", short: "Lun" },
  { key: "TUESDAY", label: "Martes", short: "Mar" },
  { key: "WEDNESDAY", label: "Miércoles", short: "Mié" },
  { key: "THURSDAY", label: "Jueves", short: "Jue" },
  { key: "FRIDAY", label: "Viernes", short: "Vie" },
  { key: "SATURDAY", label: "Sábado", short: "Sáb" },
  { key: "SUNDAY", label: "Domingo", short: "Dom" },
];

export function SchedulePanoramicView({
  data,
  onSelectGroupAndEdit,
  onOpenScheduleModal,
}: SchedulePanoramicViewProps) {
  const [search, setSearch] = useState("");

  const filteredGroups = data.groups.filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.program.name.toLowerCase().includes(q) ||
      (g.period?.name && g.period.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-2xl bg-card border border-border/80 p-3 space-y-3 shadow-xs overflow-hidden">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-2 border-b border-border/70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-foreground">
              Vista Panorámica del Horario
            </h2>
            <p className="text-[11px] text-muted-foreground font-medium">
              Matriz completa de ocupación de {data.groups.length} fichas/grupos
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ficha, programa o periodo..."
            className="pl-8 text-xs h-8 rounded-xl bg-background border-border/80 font-medium"
          />
        </div>
      </div>

      {/* Main Matrix Table Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin border border-border/70 rounded-xl bg-background">
        <div className="min-w-[1100px]">
          {/* Table Header */}
          <div className="grid grid-cols-12 divide-x divide-border/70 border-b border-border/70 bg-muted/90 sticky top-0 z-20 text-[11px] font-bold text-muted-foreground shadow-2xs">
            <div className="col-span-3 p-2.5 flex items-center justify-between">
              <span>Ficha / Grupo</span>
              <span className="text-[10px] font-normal text-muted-foreground">Progreso</span>
            </div>
            {DAYS.map((day) => (
              <div key={day.key} className="col-span-1 p-2 text-center flex flex-col items-center justify-center">
                <span className="font-bold text-foreground text-xs">{day.label}</span>
              </div>
            ))}
          </div>

          {/* Table Body (Group Rows) */}
          <div className="divide-y divide-border/60">
            {filteredGroups.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                No se encontraron fichas con los filtros aplicados.
              </div>
            ) : (
              filteredGroups.map((g) => {
                // Calculate required vs scheduled hours
                const scheduledHoursByCourseTitle = new Map<string, number>();
                g.scheduledClasses.forEach((c) => {
                  let hours = 0;
                  c.schedules.forEach((s) => {
                    const [sh, sm] = s.startTime.split(":").map(Number);
                    const [eh, em] = s.endTime.split(":").map(Number);
                    hours += (eh * 60 + em - (sh * 60 + sm)) / 60;
                  });
                  scheduledHoursByCourseTitle.set(c.title.toLowerCase(), hours);
                });

                const totalRequiredHours = g.trimesterCourses.reduce((acc, c) => acc + c.weeklyHours, 0);
                const totalScheduledHours = Array.from(scheduledHoursByCourseTitle.values()).reduce(
                  (acc, h) => acc + h,
                  0
                );
                const progressPercent =
                  totalRequiredHours > 0
                    ? Math.round((totalScheduledHours / totalRequiredHours) * 100)
                    : 0;

                // Group classes by dayOfWeek
                const classesByDay: Record<DayOfWeek, Array<any>> = {
                  MONDAY: [],
                  TUESDAY: [],
                  WEDNESDAY: [],
                  THURSDAY: [],
                  FRIDAY: [],
                  SATURDAY: [],
                  SUNDAY: [],
                };

                g.scheduledClasses.forEach((c) => {
                  c.schedules.forEach((s) => {
                    if (classesByDay[s.dayOfWeek]) {
                      classesByDay[s.dayOfWeek].push({
                        courseTitle: c.title,
                        teacherName: s.teacher?.name || c.teacher?.name || "Sin instructor",
                        startTime: s.startTime,
                        endTime: s.endTime,
                      });
                    }
                  });
                });

                return (
                  <div
                    key={g.id}
                    className="grid grid-cols-12 divide-x divide-border/60 hover:bg-muted/20 transition-colors group"
                  >
                    {/* Column 1: Group Metadata & Jump Button */}
                    <div className="col-span-3 p-2.5 flex flex-col justify-between gap-2 bg-card/60">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-extrabold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                            Ficha {g.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectGroupAndEdit(g.id)}
                            className="h-5 px-1.5 rounded-md text-[10px] gap-1 font-bold text-primary hover:bg-primary/10"
                            title="Abrir malla de esta ficha"
                          >
                            <span>Editar</span>
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium truncate">
                          {g.program.name}
                        </div>
                        {g.period && (
                          <div className="text-[10px] font-semibold text-primary/90 truncate">
                            {g.period.name}
                          </div>
                        )}
                      </div>

                      {/* Hours & Progress Bar */}
                      {totalRequiredHours > 0 && (
                        <div className="space-y-1 pt-1 border-t border-border/40">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-muted-foreground font-medium">Horas:</span>
                            <span className="font-bold text-foreground">
                              {totalScheduledHours}/{totalRequiredHours}h ({progressPercent}%)
                            </span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                progressPercent >= 100
                                  ? "bg-emerald-500"
                                  : progressPercent > 0
                                  ? "bg-amber-500"
                                  : "bg-primary"
                              }`}
                              style={{ width: `${Math.min(100, progressPercent)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Columns 2-8: Day Slots */}
                    {DAYS.map((day) => {
                      const dayClasses = classesByDay[day.key] || [];
                      const isDayDisabled =
                        g.daySlotsConfig && g.daySlotsConfig.length > 0
                          ? !g.daySlotsConfig.some((s) => s.dayOfWeek === day.key)
                          : false;

                      if (isDayDisabled) {
                        return (
                          <div
                            key={day.key}
                            className="col-span-1 p-1.5 min-h-[90px] flex flex-col items-center justify-center bg-muted/40 opacity-70 text-center select-none border border-dashed border-border/40"
                            title={`Día no lectivo (Bloqueado) para Ficha ${g.name}`}
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mb-0.5" />
                            <span className="text-[9px] font-bold text-muted-foreground">No Lectivo</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={day.key}
                          className="col-span-1 p-1.5 space-y-1.5 min-h-[90px] flex flex-col justify-start bg-background/50 hover:bg-background transition-colors"
                        >
                          {dayClasses.length > 0 ? (
                            dayClasses.map((cls, idx) => (
                              <Tooltip key={idx}>
                                <TooltipTrigger asChild>
                                  <div
                                    onClick={() => onSelectGroupAndEdit(g.id)}
                                    className="p-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-all text-[10px] space-y-0.5 shadow-2xs group/card"
                                  >
                                    <div className="font-bold text-foreground line-clamp-1 leading-tight group-hover/card:text-primary transition-colors">
                                      {cls.courseTitle}
                                    </div>
                                    <div className="text-[9px] text-muted-foreground truncate font-medium flex items-center gap-1">
                                      <GraduationCap className="w-2.5 h-2.5 text-primary shrink-0" />
                                      <span className="truncate">{getCompactTeacherName(cls.teacherName)}</span>
                                    </div>
                                    <div className="text-[9px] font-mono text-primary font-semibold flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5 shrink-0" />
                                      <span>{toFormat12h(cls.startTime)} - {toFormat12h(cls.endTime)}</span>
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="rounded-2xl p-3 max-w-xs space-y-1.5 shadow-xl border border-border/80 bg-card text-card-foreground z-50">
                                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                                    <Badge variant="outline" className="text-[10px] font-bold">
                                      Ficha {g.name}
                                    </Badge>
                                    <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                                      {day.label}
                                    </span>
                                  </div>
                                  
                                  <p className="font-extrabold text-xs text-foreground leading-tight">{cls.courseTitle}</p>
                                  
                                  <div className="space-y-1 text-[11px] text-muted-foreground font-medium pt-1">
                                    <p className="flex items-center gap-1.5 text-primary font-semibold">
                                      <Clock className="w-3 h-3 text-primary shrink-0" />
                                      <span>{toFormat12h(cls.startTime)} a {toFormat12h(cls.endTime)}</span>
                                    </p>
                                    
                                    {cls.teacherName && (
                                      <p className="flex items-center gap-1.5 text-foreground">
                                        <GraduationCap className="w-3 h-3 text-primary shrink-0" />
                                        <span>Instructor: {getCleanTeacherName(cls.teacherName)}</span>
                                      </p>
                                    )}

                                    {g.environment && (
                                      <p className="flex items-center gap-1.5">
                                        <Building className="w-3 h-3 text-indigo-500 shrink-0" />
                                        <span>Ambiente: {g.environment.name}</span>
                                      </p>
                                    )}

                                    {g.period && (
                                      <p className="flex items-center gap-1.5 text-[10px]">
                                        <BookOpen className="w-3 h-3 text-muted-foreground shrink-0" />
                                        <span>Periodo: {g.period.name}</span>
                                      </p>
                                    )}
                                  </div>

                                  <p className="text-[10px] text-primary font-bold pt-1.5 border-t border-border/40 flex items-center justify-between">
                                    <span>Editar en la malla de la ficha</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ))
                          ) : (
                            <div
                              onClick={() => onSelectGroupAndEdit(g.id)}
                              className="h-full flex items-center justify-center text-[10px] text-muted-foreground/40 italic cursor-pointer hover:bg-muted/30 rounded-lg transition-colors p-1"
                            >
                              -
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
