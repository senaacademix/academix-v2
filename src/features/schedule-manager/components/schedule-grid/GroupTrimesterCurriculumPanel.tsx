"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Check, AlertCircle } from "lucide-react";
import { ScheduleBuilderData } from "../../actions/scheduleBuilderActions";

interface GroupTrimesterCurriculumPanelProps {
  group: ScheduleBuilderData["groups"][0];
  teachers: ScheduleBuilderData["teachers"];
  onSelectCourseToSchedule: (courseTitle: string) => void;
}

export function GroupTrimesterCurriculumPanel({
  group,
  teachers,
  onSelectCourseToSchedule,
}: GroupTrimesterCurriculumPanelProps) {
  // Calculate scheduled hours per course
  const scheduledHoursByCourseTitle = new Map<string, number>();

  group.scheduledClasses.forEach((c) => {
    let hours = 0;
    c.schedules.forEach((s) => {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      hours += (eh * 60 + em - (sh * 60 + sm)) / 60;
    });
    scheduledHoursByCourseTitle.set(c.title.toLowerCase(), hours);
  });

  const totalRequiredHours = group.trimesterCourses.reduce((acc, c) => acc + c.weeklyHours, 0);
  const totalScheduledHours = Array.from(scheduledHoursByCourseTitle.values()).reduce(
    (acc, h) => acc + h,
    0
  );
  const progressPercent =
    totalRequiredHours > 0
      ? Math.round((totalScheduledHours / totalRequiredHours) * 100)
      : 0;

  // Global progress styling
  let totalProgressBadgeClass = "bg-muted/40 text-muted-foreground border-border/70";
  if (totalRequiredHours > 0) {
    if (totalScheduledHours === totalRequiredHours) {
      totalProgressBadgeClass = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-bold";
    } else if (totalScheduledHours > totalRequiredHours) {
      totalProgressBadgeClass = "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40 font-bold";
    } else if (totalScheduledHours > 0) {
      totalProgressBadgeClass = "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold";
    }
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card px-3.5 py-2 flex items-center justify-between gap-3 shadow-2xs shrink-0 overflow-hidden">
      {/* Title & Trimestre info */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <BookOpen className="w-3.5 h-3.5" />
        </div>
        <span className="font-extrabold text-xs text-foreground hidden sm:inline whitespace-nowrap">
          {group.period?.name || "Materias Trimestre"}
        </span>
      </div>

      {/* Horizontal scrolling chips of courses with 3 distinct color states */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 min-w-0 flex-1">
        {group.trimesterCourses.length === 0 ? (
          <span className="text-[11px] text-muted-foreground italic truncate">
            Sin materias registradas en este trimestre.
          </span>
        ) : (
          group.trimesterCourses.map((course) => {
            const scheduledHours = scheduledHoursByCourseTitle.get(course.title.toLowerCase()) || 0;
            const reqHours = course.weeklyHours || 0;

            // 3 distinct color states:
            // 1. 🟢 Completo exacto (scheduledHours === reqHours)
            // 2. 🔴 Se pasa de horas (scheduledHours > reqHours)
            // 3. 🟡 Faltan horas / Parcial (scheduledHours < reqHours)
            let chipStyle = "bg-muted/40 border-border/70 text-muted-foreground hover:border-primary/50 hover:bg-primary/5";
            let iconElement = <Plus className="w-3 h-3 text-muted-foreground shrink-0" />;
            let tooltipText = `Sin programar (${scheduledHours}h / ${reqHours}h)`;

            if (reqHours > 0) {
              if (scheduledHours === reqHours) {
                chipStyle = "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25";
                iconElement = <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />;
                tooltipText = `Completas (${scheduledHours}h / ${reqHours}h)`;
              } else if (scheduledHours > reqHours) {
                chipStyle = "bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300 hover:bg-red-500/25";
                iconElement = <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />;
                tooltipText = `Se pasa de horas (${scheduledHours}h / ${reqHours}h)`;
              } else if (scheduledHours > 0 && scheduledHours < reqHours) {
                chipStyle = "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25";
                iconElement = <Plus className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />;
                tooltipText = `Faltan horas (${scheduledHours}h / ${reqHours}h)`;
              }
            }

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => onSelectCourseToSchedule(course.title)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98] ${chipStyle}`}
                title={`Programar "${course.title}" - ${tooltipText}`}
              >
                {iconElement}
                <span className="truncate max-w-[170px]">{course.title}</span>
                <span className="text-[10px] font-mono font-bold ml-0.5">
                  {scheduledHours}/{reqHours}h
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Progress pill with dynamic state styling */}
      {totalRequiredHours > 0 && (
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-border/50 text-[11px] font-mono">
          <span className="font-bold text-foreground whitespace-nowrap">
            {totalScheduledHours}h/{totalRequiredHours}h
          </span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${totalProgressBadgeClass}`}>
            {progressPercent}%
          </Badge>
        </div>
      )}
    </div>
  );
}
