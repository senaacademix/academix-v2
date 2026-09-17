"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Check, AlertCircle, Clock } from "lucide-react";
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
    <div className="w-full md:w-60 lg:w-72 shrink-0 h-full flex flex-col rounded-2xl border border-border/80 bg-card p-3 space-y-3 shadow-xs overflow-hidden min-h-0">
      {/* Header & Title */}
      <div className="space-y-2 pb-2.5 border-b border-border/70 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-xs text-foreground truncate">
                Materias del Periodo
              </h3>
              <p className="text-[10px] text-muted-foreground truncate font-medium">
                {group.period?.name || "Periodo sin definir"}
                {group.period?.timeline?.name && ` • ${group.period.timeline.name}`}
              </p>
            </div>
          </div>

          {totalRequiredHours > 0 && (
            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-mono ${totalProgressBadgeClass}`}>
              {progressPercent}%
            </Badge>
          )}
        </div>

        {/* Global Progress Bar */}
        {totalRequiredHours > 0 && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground font-semibold">
              <span>Progreso total:</span>
              <span className="text-foreground font-bold">{totalScheduledHours}h / {totalRequiredHours}h</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progressPercent >= 100 ? "bg-emerald-500" : progressPercent > 0 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Vertical List of Courses */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
        {group.trimesterCourses.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground italic border border-dashed rounded-xl">
            Sin materias registradas en este periodo.
          </div>
        ) : (
          group.trimesterCourses.map((course) => {
            const scheduledHours = scheduledHoursByCourseTitle.get(course.title.toLowerCase()) || 0;
            const reqHours = course.weeklyHours || 0;

            let cardStyle = "bg-background hover:bg-muted/30 border-border/70 text-foreground";
            let badgeStyle = "bg-muted/50 text-muted-foreground border-border/60";
            let statusText = "Sin programar";
            let iconElement = <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;

            if (reqHours > 0) {
              if (scheduledHours === reqHours) {
                cardStyle = "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/30 text-foreground";
                badgeStyle = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold";
                statusText = "Completo";
                iconElement = <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
              } else if (scheduledHours > reqHours) {
                cardStyle = "bg-red-500/5 hover:bg-red-500/10 border-red-500/30 text-foreground";
                badgeStyle = "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 font-bold";
                statusText = "Exceso de horas";
                iconElement = <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />;
              } else if (scheduledHours > 0) {
                cardStyle = "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30 text-foreground";
                badgeStyle = "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold";
                statusText = "Faltan horas";
                iconElement = <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
              }
            }

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => onSelectCourseToSchedule(course.title)}
                className={`w-full text-left p-2.5 rounded-xl border text-xs space-y-1.5 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-2xs group cursor-pointer touch-manipulation ${cardStyle}`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {course.title}
                  </span>
                  {iconElement}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-[10px] font-mono">
                  <span className="text-muted-foreground font-medium">{statusText}</span>
                  <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0.2 ${badgeStyle}`}>
                    {scheduledHours}/{reqHours}h
                  </Badge>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
