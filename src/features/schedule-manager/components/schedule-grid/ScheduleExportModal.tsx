"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckSquare,
  Square,
  Users,
  GraduationCap,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { ScheduleBuilderData } from "../../actions/scheduleBuilderActions";
import { generateAndDownloadSchedulePdf } from "../../utils/schedulePdfExport";
import { generateAndDownloadScheduleExcel } from "../../utils/scheduleExcelExport";
import {
  extractTeachersExportData,
  generateAndDownloadTeacherSchedulePdf,
} from "../../utils/teacherSchedulePdfExport";
import { generateAndDownloadTeacherScheduleExcel } from "../../utils/teacherScheduleExcelExport";
import {
  extractEnvironmentsExportData,
  exportEnvironmentsToPdf,
} from "../../utils/environmentSchedulePdfExport";
import { exportEnvironmentsToExcel } from "../../utils/environmentScheduleExcelExport";

interface ScheduleExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduleBuilderData["schedule"];
  groups: ScheduleBuilderData["groups"];
  teachers: ScheduleBuilderData["teachers"];
  environments: ScheduleBuilderData["environments"];
  defaultFormat?: "pdf" | "excel";
}

export function ScheduleExportModal({
  open,
  onOpenChange,
  schedule,
  groups,
  teachers,
  environments,
  defaultFormat = "pdf",
}: ScheduleExportModalProps) {
  const [formatType, setFormatType] = useState<"pdf" | "excel">(defaultFormat);
  const [exportTarget, setExportTarget] = useState<"groups" | "teachers" | "environments">("groups");

  // Selection states
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [selectedEnvIds, setSelectedEnvIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Extract teacher data with active hours
  const teachersWithClasses = React.useMemo(
    () => extractTeachersExportData(teachers, groups),
    [teachers, groups]
  );

  // Extract environment data with active hours
  const environmentsWithClasses = React.useMemo(
    () => extractEnvironmentsExportData(environments, groups, schedule.startDate, schedule.endDate),
    [environments, groups, schedule.startDate, schedule.endDate]
  );

  // Sync state on open
  React.useEffect(() => {
    if (open) {
      setFormatType(defaultFormat);
      setSelectedGroupIds(groups.map((g) => g.id));
      setSelectedTeacherIds(teachersWithClasses.map((t) => t.id));
      setSelectedEnvIds(environmentsWithClasses.map((e) => e.environment.id));
    }
  }, [open, defaultFormat, groups, teachersWithClasses, environmentsWithClasses]);

  // Group selection helpers
  const allGroupsSelected = selectedGroupIds.length === groups.length;
  const toggleSelectAllGroups = () => {
    if (allGroupsSelected) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(groups.map((g) => g.id));
    }
  };
  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Teacher selection helpers
  const allTeachersSelected = selectedTeacherIds.length === teachersWithClasses.length;
  const toggleSelectAllTeachers = () => {
    if (allTeachersSelected) {
      setSelectedTeacherIds([]);
    } else {
      setSelectedTeacherIds(teachersWithClasses.map((t) => t.id));
    }
  };
  const toggleTeacher = (id: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Environment selection helpers
  const allEnvsSelected = selectedEnvIds.length === environmentsWithClasses.length;
  const toggleSelectAllEnvs = () => {
    if (allEnvsSelected) {
      setSelectedEnvIds([]);
    } else {
      setSelectedEnvIds(environmentsWithClasses.map((e) => e.environment.id));
    }
  };
  const toggleEnv = (id: string) => {
    setSelectedEnvIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    if (exportTarget === "groups") {
      if (selectedGroupIds.length === 0) {
        toast.error("Selecciona al menos una ficha para exportar");
        return;
      }
      const groupsToExport = groups.filter((g) => selectedGroupIds.includes(g.id));
      setIsExporting(true);

      try {
        if (formatType === "pdf") {
          toast.info("Generando PDF de fichas con @react-pdf/renderer...");
          await generateAndDownloadSchedulePdf(schedule, groupsToExport);
          toast.success("PDF de fichas descargado exitosamente");
        } else {
          toast.info("Generando Excel de fichas con ExcelJS...");
          await generateAndDownloadScheduleExcel(schedule, groupsToExport);
          toast.success("Excel de fichas descargado exitosamente");
        }
        onOpenChange(false);
      } catch (err: any) {
        console.error("Error exportando horario:", err);
        toast.error(err.message || "Error al generar el archivo");
      } finally {
        setIsExporting(false);
      }
    } else if (exportTarget === "teachers") {
      if (selectedTeacherIds.length === 0) {
        toast.error("Selecciona al menos un instructor para exportar");
        return;
      }
      const teachersToExport = teachersWithClasses.filter((t) =>
        selectedTeacherIds.includes(t.id)
      );
      setIsExporting(true);

      try {
        if (formatType === "pdf") {
          toast.info("Generando PDF por instructor con @react-pdf/renderer...");
          await generateAndDownloadTeacherSchedulePdf(schedule, teachersToExport);
          toast.success("PDF por instructor descargado exitosamente");
        } else {
          toast.info("Generando Excel por instructor con ExcelJS...");
          await generateAndDownloadTeacherScheduleExcel(schedule, teachersToExport);
          toast.success("Excel por instructor descargado exitosamente");
        }
        onOpenChange(false);
      } catch (err: any) {
        console.error("Error exportando horario docente:", err);
        toast.error(err.message || "Error al generar el archivo");
      } finally {
        setIsExporting(false);
      }
    } else {
      // Export by environments
      if (selectedEnvIds.length === 0) {
        toast.error("Selecciona al menos un ambiente para exportar");
        return;
      }
      const envsToExport = environmentsWithClasses.filter((e) =>
        selectedEnvIds.includes(e.environment.id)
      );
      setIsExporting(true);

      try {
        if (formatType === "pdf") {
          toast.info("Generando PDF de ambientes con @react-pdf/renderer...");
          await exportEnvironmentsToPdf(schedule, envsToExport);
          toast.success("PDF de ambientes descargado exitosamente");
        } else {
          toast.info("Generando Excel de ambientes con ExcelJS...");
          await exportEnvironmentsToExcel(schedule, envsToExport);
          toast.success("Excel de ambientes descargado exitosamente");
        }
        onOpenChange(false);
      } catch (err: any) {
        console.error("Error exportando horario de ambientes:", err);
        toast.error(err.message || "Error al generar el archivo");
      } finally {
        setIsExporting(false);
      }
    }
  };

  const activeCount =
    exportTarget === "groups"
      ? selectedGroupIds.length
      : exportTarget === "teachers"
      ? selectedTeacherIds.length
      : selectedEnvIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-3xl border-border bg-background shadow-2xl">
        <div className="flex flex-col">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                {formatType === "pdf" ? (
                  <FileText className="w-5 h-5 text-red-600" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-foreground">
                  Exportar Horario Académico
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {schedule.name} • Exporta por Fichas, Instructores o Ambientes en PDF o Excel.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="p-6 space-y-4">
            {/* Target Mode Tabs (Por Ficha vs Por Instructor vs Por Ambiente) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                1. Tipo de Vista a Exportar
              </Label>
              <Tabs
                value={exportTarget}
                onValueChange={(v) => setExportTarget(v as "groups" | "teachers" | "environments")}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 w-full h-9 rounded-xl bg-muted/50 p-1">
                  <TabsTrigger
                    value="groups"
                    className="rounded-lg text-xs font-bold gap-1 data-[state=active]:bg-background data-[state=active]:text-primary"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Fichas ({groups.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="teachers"
                    className="rounded-lg text-xs font-bold gap-1 data-[state=active]:bg-background data-[state=active]:text-indigo-600"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    Instructores ({teachersWithClasses.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="environments"
                    className="rounded-lg text-xs font-bold gap-1 data-[state=active]:bg-background data-[state=active]:text-emerald-600"
                  >
                    <Building className="w-3.5 h-3.5" />
                    Ambientes ({environmentsWithClasses.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Format Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                2. Formato de Exportación
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormatType("pdf")}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all text-left ${
                    formatType === "pdf"
                      ? "bg-red-500/10 border-red-500/50 shadow-xs ring-2 ring-red-500/20"
                      : "bg-card border-border/70 hover:bg-muted/40"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center text-red-600 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-foreground block">
                      Documento PDF
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      @react-pdf/renderer (A4)
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormatType("excel")}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all text-left ${
                    formatType === "excel"
                      ? "bg-emerald-500/10 border-emerald-500/50 shadow-xs ring-2 ring-emerald-500/20"
                      : "bg-card border-border/70 hover:bg-muted/40"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-foreground block">
                      Libro Excel (.xlsx)
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Formato estilizado con matriz
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Selection List */}
            {exportTarget === "groups" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    3. Fichas a Incluir ({selectedGroupIds.length}/{groups.length})
                  </Label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAllGroups}
                    className="h-6 text-[11px] font-bold text-primary hover:text-primary gap-1 px-2"
                  >
                    {allGroupsSelected ? (
                      <>
                        <Square className="w-3 h-3" /> Desmarcar Todos
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3 h-3" /> Seleccionar Todos
                      </>
                    )}
                  </Button>
                </div>

                <div className="border border-border/70 rounded-2xl p-2 max-h-44 overflow-y-auto space-y-1 bg-muted/20 scrollbar-thin">
                  {groups.map((g) => {
                    const isChecked = selectedGroupIds.includes(g.id);
                    const totalClasses = g.scheduledClasses.reduce(
                      (acc, c) => acc + c.schedules.length,
                      0
                    );

                    return (
                      <div
                        key={g.id}
                        onClick={() => toggleGroup(g.id)}
                        className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleGroup(g.id)}
                            className="rounded-md"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-foreground block truncate">
                              {g.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground block truncate">
                              {g.program.name} • {g.period?.name || "Sin trimestre"}
                            </span>
                          </div>
                        </div>

                        <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                          {totalClasses} clases
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : exportTarget === "teachers" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    3. Instructores a Incluir ({selectedTeacherIds.length}/{teachersWithClasses.length})
                  </Label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAllTeachers}
                    className="h-6 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 gap-1 px-2"
                  >
                    {allTeachersSelected ? (
                      <>
                        <Square className="w-3 h-3" /> Desmarcar Todos
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3 h-3" /> Seleccionar Todos
                      </>
                    )}
                  </Button>
                </div>

                <div className="border border-border/70 rounded-2xl p-2 max-h-44 overflow-y-auto space-y-1 bg-muted/20 scrollbar-thin">
                  {teachersWithClasses.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No hay instructores con clases programadas en este horario.
                    </div>
                  ) : (
                    teachersWithClasses.map((t) => {
                      const isChecked = selectedTeacherIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleTeacher(t.id)}
                          className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer select-none ${
                            isChecked
                              ? "bg-indigo-500/10 border border-indigo-500/20"
                              : "hover:bg-muted/50 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleTeacher(t.id)}
                              className="rounded-md data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-foreground block truncate">
                                {t.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                {t.email || "Sin correo"} • {new Set(t.classes.map((c) => c.groupName)).size} ficha(s)
                              </span>
                            </div>
                          </div>

                          <Badge className="bg-indigo-600 text-white font-mono font-bold text-[10px] shrink-0">
                            {t.totalWeeklyHours}h / semana
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-emerald-600" />
                    3. Ambientes a Incluir ({selectedEnvIds.length}/{environmentsWithClasses.length})
                  </Label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAllEnvs}
                    className="h-6 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 gap-1 px-2"
                  >
                    {allEnvsSelected ? (
                      <>
                        <Square className="w-3 h-3" /> Desmarcar Todos
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3 h-3" /> Seleccionar Todos
                      </>
                    )}
                  </Button>
                </div>

                <div className="border border-border/70 rounded-2xl p-2 max-h-44 overflow-y-auto space-y-1 bg-muted/20 scrollbar-thin">
                  {environmentsWithClasses.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No hay ambientes registrados.
                    </div>
                  ) : (
                    environmentsWithClasses.map((env) => {
                      const isChecked = selectedEnvIds.includes(env.environment.id);
                      return (
                        <div
                          key={env.environment.id}
                          onClick={() => toggleEnv(env.environment.id)}
                          className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer select-none ${
                            isChecked
                              ? "bg-emerald-500/10 border border-emerald-500/20"
                              : "hover:bg-muted/50 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleEnv(env.environment.id)}
                              className="rounded-md data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-foreground block truncate">
                                🏫 {env.environment.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                {env.environment.location || "Sede Principal"} • {env.distinctGroups.length} ficha(s)
                              </span>
                            </div>
                          </div>

                          <Badge className="bg-emerald-600 text-white font-mono font-bold text-[10px] shrink-0">
                            {env.totalWeeklyHours}h / sem
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 border-t border-border/80 bg-muted/20 flex flex-row items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleExport}
              disabled={isExporting || activeCount === 0}
              className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Exportando ({activeCount})...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    Descargar {formatType.toUpperCase()} ({activeCount})
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
