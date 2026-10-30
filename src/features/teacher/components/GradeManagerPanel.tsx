"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Save, Trash2, Edit, Users, Search, UsersRound, Link2, ExternalLink, GraduationCap, X, AlertTriangle, Clock } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import { getCourseWorkGroups } from "../actions/workGroupActions";
import { WorkGroupManagerDialog } from "./WorkGroupManagerDialog";
import { getCourseActivities, createActivity, updateActivity, deleteActivity, saveStudentGrades, toggleCourseWeightMode, updateCourseAttendancePenalty } from "../actions/gradeActions";
import { formatName, getInitials } from "@/lib/utils";
import { calculateTotalScheduledHours, calculateStudentAttendanceLoss, calculatePenalizedGrade } from "@/lib/gradePenaltyUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StudentNovedadBadge } from "@/components/StudentNovedadBadge";
import { StudentVoceroBadge } from "@/components/StudentVoceroBadge";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useAppRefresh } from "@/lib/app-refresh";

interface GradeManagerPanelProps {
  courses: any[];
  students: any[];
  voceroPrincipalId?: string | null;
  voceroSuplenteId?: string | null;
  group?: any;
  attendanceHistory?: any[];
}

export function GradeManagerPanel({ courses, students, voceroPrincipalId, voceroSuplenteId, group, attendanceHistory }: GradeManagerPanelProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [activities, setActivities] = useState<any[]>([]);
  const [usePercentageWeights, setUsePercentageWeights] = useState(true);
  const [attendancePenaltyEnabled, setAttendancePenaltyEnabled] = useState(false);
  const [maxPenaltyPercentage, setMaxPenaltyPercentage] = useState<number>(0);
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>({}); // [activityId][studentId] = score as string
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({ id: "", title: "", description: "", weight: 0, allowSubmissionLink: false });

  const [isBulkGradeDialogOpen, setIsBulkGradeDialogOpen] = useState(false);
  const [bulkGradeActivity, setBulkGradeActivity] = useState<any | null>(null);
  const [bulkGradeValue, setBulkGradeValue] = useState("");
  const [bulkSelectedStudents, setBulkSelectedStudents] = useState<string[]>([]);
  const [bulkOverwrite, setBulkOverwrite] = useState(true);
  const [bulkSearchQuery, setBulkSearchQuery] = useState("");
  
  // Work Groups State
  const [workGroups, setWorkGroups] = useState<any[]>([]);
  const [isWorkGroupDialogOpen, setIsWorkGroupDialogOpen] = useState(false);
  const [bulkSelectedGroupId, setBulkSelectedGroupId] = useState<string>("all");

  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses]);

  useEffect(() => {
    if (selectedCourseId) {
      loadActivities();
    }
  }, [selectedCourseId]);

  useAppRefresh(async () => {
    if (selectedCourseId) {
      await loadActivities();
    }
  });

  const loadActivities = async () => {
    setLoading(true);
    const data = await getCourseActivities(selectedCourseId) as any;
    setActivities(data.activities);
    setUsePercentageWeights(data.usePercentageWeights);
    setAttendancePenaltyEnabled(data.attendancePenaltyEnabled ?? false);
    setMaxPenaltyPercentage(data.maxPenaltyPercentage ?? 0);
    
    // Initialize grades state (1 decimal digit)
    const newGrades: Record<string, Record<string, string>> = {};
    data.activities.forEach((act: any) => {
      newGrades[act.id] = {};
      act.grades.forEach((g: any) => {
        const parsed = Number(g.score);
        newGrades[act.id][g.userId] = !isNaN(parsed) ? (Math.round(parsed * 10) / 10).toFixed(1) : "";
      });
    });
    setGrades(newGrades);
    const wgData = await getCourseWorkGroups(selectedCourseId);
    if (wgData.success) setWorkGroups(wgData.groups || []);
    setLoading(false);
  };

  const handleSaveActivity = async () => {
    if (!activityForm.title || (usePercentageWeights && activityForm.weight <= 0)) {
      toast.error("El título y un peso válido (>0) son requeridos");
      return;
    }

    if (usePercentageWeights) {
      const currentTotal = activities.reduce((sum, act) => sum + act.weight, 0);
      const currentActivityWeight = activities.find(a => a.id === activityForm.id)?.weight || 0;
      const proposedTotalWeight = currentTotal - currentActivityWeight + activityForm.weight;
      if (proposedTotalWeight > 100) {
        toast.warning(`Atención: El peso total (${proposedTotalWeight}%) excede el 100%. Por favor ajusta las demás actividades.`);
      }
    }

    startTransition(async () => {
      let res;
      if (activityForm.id) {
        res = await updateActivity(activityForm.id, activityForm.title, activityForm.description, activityForm.weight, activityForm.allowSubmissionLink);
      } else {
        res = await createActivity(selectedCourseId, activityForm.title, activityForm.description, activityForm.weight, activityForm.allowSubmissionLink);
      }

      if (res.success) {
        toast.success(`Actividad ${activityForm.id ? "actualizada" : "creada"}`);
        setIsActivityDialogOpen(false);
        loadActivities();
      } else {
        toast.error("Error al guardar: " + res.error);
      }
    });
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm("¿Eliminar actividad y todas sus calificaciones?")) return;
    
    startTransition(async () => {
      const res = await deleteActivity(id);
      if (res.success) {
        toast.success("Actividad eliminada");
        loadActivities();
      } else {
        toast.error("Error al eliminar: " + res.error);
      }
    });
  };

  const handleGradeChange = (activityId: string, studentId: string, value: string) => {
    const normalized = value.replace(",", ".");
    if (normalized === "" || (/^\d*(\.\d{0,1})?$/.test(normalized) && parseFloat(normalized) <= 5)) {
      setGrades(prev => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          [studentId]: normalized
        }
      }));
    }
  };

  const handleGradeBlur = (activityId: string, studentId: string) => {
    const val = grades[activityId]?.[studentId];
    if (val && val !== "") {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        const formatted = Math.min(5, Math.max(0, Math.round(num * 10) / 10)).toFixed(1);
        setGrades(prev => ({
          ...prev,
          [activityId]: {
            ...prev[activityId],
            [studentId]: formatted
          }
        }));
      }
    }
  };

  const handleSaveAllActivities = () => {
    startTransition(async () => {
      let hasError = false;
      for (const act of activities) {
        const payload = Object.entries(grades[act.id] || {}).map(([userId, scoreStr]) => ({
          userId,
          score: Math.round(parseFloat(scoreStr as string) * 10) / 10
        })).filter(g => !isNaN(g.score));
        
        if (payload.length > 0) {
          const res = await saveStudentGrades(act.id, payload);
          if (!res.success) hasError = true;
        }
      }
      
      if (hasError) {
        toast.error("Error guardando algunas calificaciones");
      } else {
        toast.success("Todas las calificaciones guardadas con éxito");
      }
    });
  };

  const handleOpenBulkGrade = (activity: any) => {
    setBulkGradeActivity(activity);
    setBulkGradeValue("");
    setBulkSelectedStudents([]);
    setBulkOverwrite(true);
    setBulkSearchQuery("");
    setBulkSelectedGroupId("all");
    setIsBulkGradeDialogOpen(true);
  };

  const handleApplyBulkGrade = () => {
    if (!bulkGradeActivity || !bulkGradeValue) return;
    
    const num = parseFloat(bulkGradeValue);
    if (isNaN(num) || num < 0 || num > 5) {
      toast.error("La nota debe estar entre 0.0 y 5.0");
      return;
    }

    const formattedBulkValue = (Math.round(num * 10) / 10).toFixed(1);
    const activityId = bulkGradeActivity.id;
    const currentGrades = { ...(grades[activityId] || {}) };
    let assignedCount = 0;

    bulkSelectedStudents.forEach(studentId => {
      if (!bulkOverwrite && currentGrades[studentId] && currentGrades[studentId] !== "") {
        return;
      }
      currentGrades[studentId] = formattedBulkValue;
      assignedCount++;
    });

    if (assignedCount === 0) {
      toast.info("No se asignaron notas (posiblemente porque elegiste no sobrescribir).");
      return;
    }

    setGrades(prev => ({
      ...prev,
      [activityId]: currentGrades
    }));

    startTransition(async () => {
      const payload = Object.entries(currentGrades).map(([userId, scoreStr]) => ({
        userId,
        score: parseFloat(scoreStr as string)
      })).filter(g => !isNaN(g.score));

      if (payload.length > 0) {
        const res = await saveStudentGrades(activityId, payload);
        if (res.success) {
          toast.success(`Nota ${bulkGradeValue} asignada a ${assignedCount} aprendices`);
          setIsBulkGradeDialogOpen(false);
        } else {
          toast.error("Error guardando calificaciones en base de datos");
        }
      }
    });
  };

  const filteredBulkStudents = students.filter(s => {
    if (bulkSelectedGroupId !== "all") {
      const targetGroup = workGroups.find(wg => wg.id === bulkSelectedGroupId);
      if (targetGroup && !targetGroup.students.some((st: any) => st.id === s.id)) {
        return false;
      }
    }
    if (!bulkSearchQuery) return true;
    const q = bulkSearchQuery.toLowerCase();
    return formatName(s.name, s.profile).toLowerCase().includes(q) || (s.email && s.email.toLowerCase().includes(q));
  });

  const handleToggleBulkStudent = (studentId: string) => {
    setBulkSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleToggleAllBulkStudents = () => {
    if (bulkSelectedStudents.length === filteredBulkStudents.length && filteredBulkStudents.length > 0) {
      setBulkSelectedStudents([]);
    } else {
      setBulkSelectedStudents(filteredBulkStudents.map(s => s.id));
    }
  };

  const getColorForGrade = (val: string) => {
    if (!val || val === "-") return { 
      input: "bg-muted/30 text-foreground border-border/50", 
      badge: "bg-muted/60 text-muted-foreground border border-border/60 shadow-none font-bold" 
    };
    const num = parseFloat(val);
    if (isNaN(num)) return { 
      input: "bg-muted/30 text-foreground border-border/50", 
      badge: "bg-muted/60 text-muted-foreground border border-border/60 shadow-none font-bold" 
    };
    if (num < 3.0) return { 
      input: "bg-destructive/5 text-destructive dark:text-rose-400 border-destructive/25 font-extrabold", 
      badge: "bg-destructive/15 text-destructive dark:text-rose-400 border border-destructive/30 shadow-2xs font-black" 
    };
    if (num >= 4.0) return { 
      input: "bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 font-extrabold", 
      badge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs font-black" 
    };
    return { 
      input: "bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/25 font-extrabold", 
      badge: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-2xs font-black" 
    };
  };

  const currentCourse = courses.find((c: any) => c.id === selectedCourseId);

  const totalScheduledHours = useMemo(() => {
    return calculateTotalScheduledHours(currentCourse, group, null, attendanceHistory);
  }, [currentCourse, group, attendanceHistory]);

  const getStudentGradeResult = (studentId: string) => {
    let totalScore = 0;
    let totalWeight = 0;
    let count = 0;

    activities.forEach(act => {
      const scoreStr = grades[act.id]?.[studentId];
      if (scoreStr && scoreStr !== "") {
        if (usePercentageWeights) {
          totalScore += parseFloat(scoreStr) * (act.weight / 100);
          totalWeight += act.weight;
        } else {
          totalScore += parseFloat(scoreStr);
          count++;
        }
      }
    });

    let rawGrade: number | null = null;
    if (usePercentageWeights) {
      if (totalWeight > 0) {
        rawGrade = Number((totalScore / (totalWeight / 100)).toFixed(1));
      }
    } else {
      if (count > 0) {
        rawGrade = Number((totalScore / count).toFixed(1));
      }
    }

    const loss = calculateStudentAttendanceLoss(
      studentId, 
      selectedCourseId, 
      attendanceHistory || [], 
      currentCourse, 
      group
    );

    if (rawGrade === null) {
      return {
        rawGrade: null,
        finalGrade: null,
        display: "-",
        loss,
        penaltyResult: null,
      };
    }

    const penaltyResult = calculatePenalizedGrade({
      rawGrade,
      penaltyEnabled: attendancePenaltyEnabled,
      maxPenaltyPercentage,
      totalLostHours: loss.totalLostHours,
      totalScheduledHours,
      lossDetails: {
        absentHours: loss.absentHours,
        lateHours: loss.lateHours,
        leaveHours: loss.leaveHours,
        absentCount: loss.absentCount,
        lateCount: loss.lateCount,
        leaveCount: loss.leaveCount,
      },
    });

    return {
      rawGrade,
      finalGrade: penaltyResult.finalGrade,
      display: penaltyResult.finalGrade.toFixed(1),
      loss,
      penaltyResult,
    };
  };

  const handleTogglePenalty = (checked: boolean) => {
    setAttendancePenaltyEnabled(checked);
    const newPercentage = checked && (!maxPenaltyPercentage || maxPenaltyPercentage <= 0) ? 50 : maxPenaltyPercentage;
    if (checked && (!maxPenaltyPercentage || maxPenaltyPercentage <= 0)) {
      setMaxPenaltyPercentage(50);
    }
    startTransition(async () => {
      const res = await updateCourseAttendancePenalty(selectedCourseId, checked, newPercentage);
      if (res.success) {
        toast.success(checked ? "Penalización por inasistencia habilitada" : "Penalización por inasistencia deshabilitada");
      } else {
        toast.error("Error al actualizar penalización: " + res.error);
        setAttendancePenaltyEnabled(!checked);
      }
    });
  };

  const handlePenaltyPercentageChange = (val: string) => {
    const num = parseFloat(val);
    if (val === "" || (!isNaN(num) && num >= 0 && num <= 100)) {
      const safeNum = isNaN(num) ? 0 : num;
      setMaxPenaltyPercentage(safeNum);
    }
  };

  const handleBlurPenaltyPercentage = () => {
    const val = Math.max(1, Math.min(100, maxPenaltyPercentage || 1));
    setMaxPenaltyPercentage(val);
    startTransition(async () => {
      const res = await updateCourseAttendancePenalty(selectedCourseId, attendancePenaltyEnabled, val);
      if (res.success) {
        toast.success(`Tope de penalización guardado en ${val}%`);
      } else {
        toast.error("Error al guardar penalización: " + res.error);
      }
    });
  };

  const handleToggleWeightMode = (checked: boolean) => {
    setUsePercentageWeights(checked);
    startTransition(async () => {
      const res = await toggleCourseWeightMode(selectedCourseId, checked);
      if (res.success) {
        toast.success(checked ? "Pesos por porcentaje activados" : "Pesos por porcentaje desactivados");
      } else {
        toast.error("Error al cambiar la configuración: " + res.error);
        setUsePercentageWeights(!checked);
      }
    });
  };

  const totalWeight = activities.reduce((sum, act) => sum + act.weight, 0);

  const filteredStudents = students.filter(student => 
    formatName(student.name, student.profile).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.email && student.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openEditActivity = (act: any) => {
    setActivityForm({
      id: act.id,
      title: act.title,
      description: act.description || "",
      weight: act.weight,
      allowSubmissionLink: act.allowSubmissionLink ?? false,
    });
    setIsActivityDialogOpen(true);
  };

  const getSubmissionInfo = (act: any, studentId: string) => {
    const sg = act.grades?.find((g: any) => g.userId === studentId);
    const link = sg?.submissionLink?.trim();
    if (!link) return null;
    const url = link.startsWith("http://") || link.startsWith("https://") ? link : `https://${link}`;
    return { raw: link, url };
  };

  const activityUsesSubmissionSlot = (act: any) => {
    return Boolean(act.allowSubmissionLink || act.grades?.some((g: any) => g.submissionLink?.trim()));
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5 w-full min-w-0 max-w-full">
        {/* Header Hero Banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xs">
          <GraduationCap className="absolute right-0 top-0 w-56 h-56 text-primary/5 -translate-y-1/4 translate-x-1/4 pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Calificaciones y Actividades</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                Administración de actividades evaluativas, ponderación de notas y registro de calificaciones para los aprendices del grupo.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Button
                size="sm"
                onClick={handleSaveAllActivities}
                disabled={isPending}
                className="h-10 w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm px-5 rounded-xl font-bold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Guardar Todo
              </Button>
            </div>
          </div>
        </div>

        {/* Controls Bar — Responsive & Symmetrical */}
        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between p-3.5 bg-muted/30 border border-border/70 rounded-2xl shadow-2xs">
          {/* Course & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full xl:max-w-xl">
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="bg-background shadow-2xs h-10 w-full rounded-xl border-border/70 font-semibold text-xs sm:text-sm">
                <SelectValue placeholder="Seleccionar Materia" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl">
                {courses.map((c: any) => (
                  <SelectItem key={c.id} value={c.id} className="font-semibold cursor-pointer">{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aprendiz..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 w-full rounded-xl bg-background shadow-2xs border-border/70 text-xs sm:text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          {/* Toggles & Action Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-end gap-2 w-full xl:w-auto">
            {/* Attendance Penalty Switch & Parameter */}
            <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-start gap-2 bg-background px-3 h-10 rounded-xl border border-border/70 shadow-2xs">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={attendancePenaltyEnabled} 
                  onCheckedChange={handleTogglePenalty} 
                  id="penalty-mode" 
                  className="scale-75 data-[state=checked]:bg-primary cursor-pointer" 
                />
                <Label htmlFor="penalty-mode" className="text-xs font-bold cursor-pointer whitespace-nowrap">
                  Penalización por inasistencia
                </Label>
              </div>
              {attendancePenaltyEnabled && (
                <div className="flex items-center gap-1 pl-2 border-l border-border/70 animate-in fade-in zoom-in-95 duration-200">
                  <Input 
                    type="number" 
                    min="1" 
                    max="100" 
                    step="1"
                    value={maxPenaltyPercentage || ""}
                    onChange={(e) => handlePenaltyPercentageChange(e.target.value)}
                    onBlur={handleBlurPenaltyPercentage}
                    onKeyDown={(e) => { if (e.key === "Enter") handleBlurPenaltyPercentage(); }}
                    className="h-7 w-12 text-center text-xs font-extrabold px-1 rounded-lg bg-primary/10 border-primary/30 text-primary focus-visible:ring-1 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="50"
                    required
                  />
                  <span className="text-xs font-black text-primary">%</span>
                </div>
              )}
            </div>

            {/* Percentage Weights Switch */}
            <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-start gap-2 bg-background px-3 h-10 rounded-xl border border-border/70 shadow-2xs">
              <div className="flex items-center gap-2">
                <Switch checked={usePercentageWeights} onCheckedChange={handleToggleWeightMode} id="weight-mode" className="scale-75 data-[state=checked]:bg-primary cursor-pointer" />
                <Label htmlFor="weight-mode" className="text-xs font-bold cursor-pointer whitespace-nowrap">Porcentajes</Label>
              </div>
              {usePercentageWeights && (
                <Badge variant="outline" className={`text-[11px] font-extrabold ${totalWeight > 100 ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30' : 'bg-primary/10 text-primary border-primary/20'}`}>
                  {totalWeight}%
                </Badge>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              className="h-10 px-3.5 rounded-xl font-bold border-border/70 bg-background hover:bg-primary/10 hover:text-primary gap-1.5 shadow-2xs justify-center cursor-pointer"
              onClick={() => setIsWorkGroupDialogOpen(true)}
            >
              <UsersRound className="w-4 h-4 text-primary shrink-0" />
              <span>Equipos</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-10 px-3.5 rounded-xl font-bold border-border/70 bg-background hover:bg-primary/10 hover:text-primary gap-1.5 shadow-2xs justify-center cursor-pointer"
              onClick={() => {
                setActivityForm({ id: "", title: "", description: "", weight: 20, allowSubmissionLink: false });
                setIsActivityDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 text-primary shrink-0" />
              <span>Nueva Actividad</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground animate-pulse">Cargando actividades...</div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground border rounded-2xl border-dashed bg-muted/10">
            No hay actividades creadas en esta materia.
          </div>
        ) : (
          <>
            {/* MOBILE VIEW (< md): Activity Strip + Student Cards */}
            <div className="md:hidden space-y-4">
              {/* Mobile Activities Management Strip */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Actividades ({activities.length})
                  </span>
                  {usePercentageWeights && (
                    <span className="text-xs font-bold text-primary">Total: {totalWeight}%</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activities.map((act, index) => {
                    const deliveriesCount = act.grades?.filter((g: any) => g.submissionLink?.trim()).length || 0;
                    return (
                      <div
                        key={act.id}
                        className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border/70 bg-card shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-black px-1.5 py-0 h-5 bg-primary/10 text-primary border-primary/20">
                              Act. {index + 1}
                            </Badge>
                            {usePercentageWeights && (
                              <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-5">
                                {act.weight}%
                              </Badge>
                            )}
                            {act.allowSubmissionLink && (
                              <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0 h-5 gap-1 border-primary/30 text-primary">
                                <Link2 className="w-2.5 h-2.5" />
                                {deliveriesCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-bold text-foreground truncate mt-1" title={act.title}>
                            {act.title}
                          </p>
                        </div>

                        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/60 shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                                onClick={() => handleOpenBulkGrade(act)}
                              >
                                <Users className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs font-medium">
                              Calificar masivamente
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                                onClick={() => openEditActivity(act)}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs font-medium">
                              Editar actividad
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                onClick={() => handleDeleteActivity(act.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs font-medium">
                              Eliminar actividad
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Student Cards */}
              <div className="space-y-3">
                {filteredStudents.map(student => {
                  const res = getStudentGradeResult(student.id);
                  const hasLoss = res.loss && res.loss.totalLostHours > 0;
                  const badgeColor = getColorForGrade(res.display);

                  return (
                    <Card key={student.id} className="p-3.5 rounded-2xl border border-border/70 shadow-2xs space-y-3 bg-card">
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/50">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-9 w-9 border shadow-2xs shrink-0">
                            <AvatarImage src={student.image} />
                            <AvatarFallback className="text-[10px] font-bold bg-primary/5 text-primary">
                              {getInitials(formatName(student.name, student.profile))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground leading-tight flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{formatName(student.name, student.profile)}</span>
                              <StudentNovedadBadge novedad={student.profile?.novedad} color={student.profile?.novedadColor} />
                              <StudentVoceroBadge size="sm" role={student.id === voceroPrincipalId ? "PRINCIPAL" : student.id === voceroSuplenteId ? "SUPLENTE" : null} />
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{student.email}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                            Definitiva
                          </span>
                          <Badge variant="outline" className={`w-14 justify-center text-xs font-black ${badgeColor.badge}`}>
                            {res.display}
                          </Badge>
                          {attendancePenaltyEnabled && hasLoss && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                              {res.loss?.totalLostHours}h inasist.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Grid of activities for this student */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {activities.map((act, index) => {
                          const sub = getSubmissionInfo(act, student.id);
                          const hasSlot = activityUsesSubmissionSlot(act);
                          const currentVal = grades[act.id]?.[student.id] || "";

                          return (
                            <div
                              key={act.id}
                              className="flex flex-col justify-between gap-1.5 p-2 rounded-xl bg-muted/25 border border-border/50"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-bold text-foreground truncate" title={act.title}>
                                  Act. {index + 1}
                                </span>
                                {usePercentageWeights && (
                                  <span className="text-[10px] text-muted-foreground font-semibold">
                                    {act.weight}%
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-center gap-1.5">
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="5"
                                  placeholder="-"
                                  className={`text-center h-8 w-full rounded-lg border text-xs transition-all focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${getColorForGrade(currentVal).input}`}
                                  value={currentVal}
                                  onChange={(e) => handleGradeChange(act.id, student.id, e.target.value)}
                                  onBlur={() => handleGradeBlur(act.id, student.id)}
                                />
                                {hasSlot && (
                                  sub ? (
                                    <a
                                      href={sub.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Ver entrega del aprendiz"
                                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 transition-all shrink-0 shadow-2xs"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  ) : (
                                    <span
                                      title="Sin entrega registrada"
                                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-muted/40 text-muted-foreground/35 border border-dashed border-border/60 shrink-0"
                                    >
                                      <Link2 className="w-3.5 h-3.5" />
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* DESKTOP & TABLET VIEW (>= md): Symmetrical Table */}
            <Card className="hidden md:block w-full min-w-0 border border-border/70 shadow-2xs rounded-2xl overflow-hidden bg-card p-0 gap-0">
              <div className="w-full overflow-x-auto">
                <Table className="w-full">
                  <TableHeader className="bg-muted/50 backdrop-blur-md sticky top-0 z-30">
                    <TableRow className="border-b border-border/70">
                      <TableHead className="font-bold text-xs tracking-wider uppercase min-w-[260px] sticky left-0 bg-muted/90 backdrop-blur-md z-40 shadow-[1px_0_0_0_theme(colors.border)] pl-4 align-middle py-3">
                        Aprendiz
                      </TableHead>

                      {activities.map((act, index) => {
                        const deliveriesCount = act.grades?.filter((g: any) => g.submissionLink?.trim()).length || 0;
                        return (
                          <TableHead
                            key={act.id}
                            className="w-[140px] min-w-[140px] max-w-[150px] px-2 py-2.5 align-middle border-l border-border/60 text-center"
                          >
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              {/* Symmetrical Action Toolbar Pill — Always Visible */}
                              <div className="inline-flex items-center justify-center gap-0.5 p-0.5 rounded-lg bg-background/90 border border-border/70 shadow-2xs">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                                      onClick={() => handleOpenBulkGrade(act)}
                                    >
                                      <Users className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs font-semibold">
                                    Calificación masiva
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                                      onClick={() => openEditActivity(act)}
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs font-semibold">
                                    Editar actividad
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                      onClick={() => handleDeleteActivity(act.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs font-semibold">
                                    Eliminar actividad
                                  </TooltipContent>
                                </Tooltip>
                              </div>

                              {/* Activity Label & Metadata with Tooltip */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-pointer flex flex-col items-center justify-center gap-0.5 px-2 py-0.5 rounded-md hover:bg-muted/60 transition-colors">
                                    <span className="font-extrabold text-xs text-foreground leading-tight">
                                      Act. {index + 1}
                                    </span>
                                    <div className="inline-flex items-center justify-center gap-1">
                                      {usePercentageWeights && (
                                        <span className="text-[10px] text-muted-foreground font-semibold">
                                          {act.weight}%
                                        </span>
                                      )}
                                      {act.allowSubmissionLink && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-1 py-0 rounded">
                                          <Link2 className="w-2.5 h-2.5 shrink-0" />
                                          {deliveriesCount > 0 && <span>{deliveriesCount}</span>}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-center max-w-[240px] p-2.5 space-y-1 shadow-lg">
                                  <p className="font-bold text-xs">{act.title}</p>
                                  {act.description && (
                                    <p className="text-[11px] text-muted-foreground line-clamp-3">{act.description}</p>
                                  )}
                                  <div className="flex items-center justify-center gap-2 pt-1 border-t border-border/40 text-[11px]">
                                    <span className="font-semibold">Peso: {act.weight}%</span>
                                    {act.allowSubmissionLink && (
                                      <span className="text-primary font-semibold">
                                        • Entregas: {deliveriesCount}/{students.length}
                                      </span>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableHead>
                        );
                      })}

                      <TableHead className="w-[130px] min-w-[130px] max-w-[140px] font-bold text-xs tracking-wider uppercase text-center bg-muted/40 border-l border-border/60 align-middle py-3">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span>Definitiva</span>
                          {attendancePenaltyEnabled && maxPenaltyPercentage > 0 && (
                            <span className="text-[10px] text-primary font-bold lowercase tracking-normal">
                              ({maxPenaltyPercentage}% penaliz.)
                            </span>
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredStudents.map(student => {
                      const res = getStudentGradeResult(student.id);
                      const hasLoss = res.loss && res.loss.totalLostHours > 0;
                      const isPenalized = attendancePenaltyEnabled && res.penaltyResult?.isPenaltyApplied;
                      const badgeColor = getColorForGrade(res.display);

                      return (
                        <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-sm sticky left-0 bg-background/95 backdrop-blur-sm z-10 shadow-[1px_0_0_0_theme(colors.border)] transition-colors py-2.5">
                            <div className="flex items-center gap-3 pl-2">
                              <Avatar className="h-8 w-8 border shadow-2xs shrink-0">
                                <AvatarImage src={student.image} />
                                <AvatarFallback className="text-[10px] font-bold bg-primary/5 text-primary">
                                  {getInitials(formatName(student.name, student.profile))}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="leading-tight flex items-center gap-1.5 flex-wrap font-semibold">
                                  <span>{formatName(student.name, student.profile)}</span>
                                  <StudentNovedadBadge novedad={student.profile?.novedad} color={student.profile?.novedadColor} />
                                  <StudentVoceroBadge size="sm" role={student.id === voceroPrincipalId ? "PRINCIPAL" : student.id === voceroSuplenteId ? "SUPLENTE" : null} />
                                  {attendancePenaltyEnabled && hasLoss && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1 shadow-2xs">
                                      <Clock className="w-2.5 h-2.5 shrink-0" />
                                      {res.loss?.totalLostHours}h inasist.
                                    </span>
                                  )}
                                </span>
                                <span className="text-[11px] text-muted-foreground/80 font-normal truncate">{student.email}</span>
                              </div>
                            </div>
                          </TableCell>

                          {activities.map(act => {
                            const sub = getSubmissionInfo(act, student.id);
                            const hasSlot = activityUsesSubmissionSlot(act);
                            const currentVal = grades[act.id]?.[student.id] || "";

                            return (
                              <TableCell
                                key={act.id}
                                className="p-2 w-[140px] min-w-[140px] max-w-[150px] border-l border-border/40 text-center align-middle"
                              >
                                <div className="inline-flex items-center justify-center gap-1.5 mx-auto">
                                  <Input 
                                    type="number" 
                                    step="0.1" 
                                    min="0" 
                                    max="5"
                                    placeholder="-"
                                    className={`text-center h-8 w-14 rounded-lg border transition-all hover:bg-muted/60 focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${getColorForGrade(currentVal).input}`}
                                    value={currentVal}
                                    onChange={(e) => handleGradeChange(act.id, student.id, e.target.value)}
                                    onBlur={() => handleGradeBlur(act.id, student.id)}
                                  />

                                  {hasSlot && (
                                    sub ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={sub.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Ver entrega del aprendiz"
                                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 transition-all shrink-0 shadow-2xs cursor-pointer"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[260px] p-2.5 space-y-1 text-xs shadow-lg">
                                          <p className="font-bold flex items-center gap-1.5">
                                            <ExternalLink className="w-3 h-3 text-primary shrink-0" />
                                            <span>Ver entrega del aprendiz</span>
                                          </p>
                                          <p className="text-[11px] text-muted-foreground break-all line-clamp-2">{sub.raw}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-muted/35 text-muted-foreground/35 border border-dashed border-border/60 shrink-0 cursor-default">
                                            <Link2 className="w-3.5 h-3.5" />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                          Sin entrega registrada
                                        </TooltipContent>
                                      </Tooltip>
                                    )
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}

                          <TableCell className="text-center border-l border-border/60 bg-muted/10 w-[130px] min-w-[130px] max-w-[140px] p-2 align-middle">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex flex-col items-center justify-center gap-1 cursor-pointer">
                                  <Badge 
                                    variant="outline" 
                                    className={`w-14 h-7 justify-center text-xs font-black shadow-2xs transition-all ${badgeColor.badge}`}
                                  >
                                    {res.display}
                                  </Badge>

                                  {attendancePenaltyEnabled && (
                                    hasLoss ? (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 flex items-center gap-1 shadow-2xs">
                                          <Clock className="w-2.5 h-2.5 shrink-0" />
                                          <span>{res.loss?.totalLostHours}h inasist.</span>
                                        </span>
                                        {isPenalized && (
                                          <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 tracking-tight">
                                            -{res.penaltyResult?.discountPoints.toFixed(1)} pts
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground/60 font-medium">
                                        0h inasist.
                                      </span>
                                    )
                                  )}
                                </div>
                              </TooltipTrigger>

                              <TooltipContent side="left" className="text-xs p-3 max-w-[280px] space-y-1.5 shadow-xl border border-amber-500/20">
                                {attendancePenaltyEnabled ? (
                                  <>
                                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold border-b border-border/50 pb-1">
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                      <span>Penalización por Inasistencia</span>
                                    </div>
                                    <div className="text-[11px] space-y-1 text-muted-foreground">
                                      <div className="flex justify-between items-center">
                                        <span>Horas inasistencia (causa):</span>
                                        <span className="font-extrabold text-amber-600 dark:text-amber-400">{res.loss?.totalLostHours ?? 0} hrs</span>
                                      </div>
                                      {res.loss && (
                                        <div className="bg-muted/40 rounded p-1.5 space-y-0.5 text-[10px]">
                                          <div className="flex justify-between text-muted-foreground">
                                            <span>• Faltas ({res.loss.absentCount}):</span>
                                            <span className="font-semibold text-foreground">{res.loss.absentHours} hrs</span>
                                          </div>
                                          <div className="flex justify-between text-muted-foreground">
                                            <span>• Llegadas tarde ({res.loss.lateCount}):</span>
                                            <span className="font-semibold text-foreground">{res.loss.lateHours} hrs</span>
                                          </div>
                                          <div className="flex justify-between text-muted-foreground">
                                            <span>• Retiros anticipados ({res.loss.leaveCount}):</span>
                                            <span className="font-semibold text-foreground">{res.loss.leaveHours} hrs</span>
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex justify-between border-t border-border/40 pt-1">
                                        <span>Horas programadas materia:</span>
                                        <span className="font-semibold text-foreground">{totalScheduledHours} hrs</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Porcentaje inasistencia:</span>
                                        <span className="font-semibold text-foreground">
                                          {totalScheduledHours > 0 && res.loss ? Math.round((res.loss.totalLostHours / totalScheduledHours) * 100) : 0}%
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Tope regla docente:</span>
                                        <span className="font-semibold text-foreground">{maxPenaltyPercentage}%</span>
                                      </div>

                                      {res.rawGrade !== null ? (
                                        <>
                                          <div className="flex justify-between border-t border-border/40 pt-1">
                                            <span>Nota académica original:</span>
                                            <span className="font-bold text-foreground">{res.rawGrade.toFixed(1)}</span>
                                          </div>
                                          <div className="flex justify-between text-amber-700 dark:text-amber-400 font-semibold">
                                            <span>Descuento aplicado:</span>
                                            <span className="font-black">-{res.penaltyResult?.discountPoints?.toFixed(1) ?? "0.0"} pts</span>
                                          </div>
                                          <div className="flex justify-between text-foreground font-black text-xs border-t border-border/40 pt-1">
                                            <span>Nota definitiva:</span>
                                            <span className="text-primary">{res.finalGrade?.toFixed(1)}</span>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="text-[10px] italic text-muted-foreground border-t border-border/40 pt-1">
                                          Sin actividades calificadas aún. Al calificar, se aplicará el descuento correspondiente por las {res.loss?.totalLostHours ?? 0} hrs ausente.
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <div>
                                    <p className="font-bold">Nota Definitiva: {res.display}</p>
                                    {res.rawGrade !== null && (
                                      <p className="text-muted-foreground mt-0.5 text-[11px]">Promedio ponderado de actividades sin regla de penalización.</p>
                                    )}
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </>
        )}

        {/* Activity Dialog — Full Screen */}
        <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
          <DialogContent showCloseButton={false} className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none flex flex-col overflow-hidden bg-background !border-0" data-color-mode="auto">
            <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-black">{activityForm.id ? "Editar" : "Nueva"} Actividad</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-0.5">Define los detalles, descripción y configuración de la actividad.</DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsActivityDialogOpen(false)}
                className="h-8 px-3 rounded-lg border-border/80 hover:bg-muted text-foreground font-bold text-xs gap-1.5 shadow-2xs shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </Button>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto lg:overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
                <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r p-6 space-y-5 lg:overflow-y-auto">
                  <div className="space-y-2">
                    <Label className="font-semibold">Título de la Actividad *</Label>
                    <Input
                      value={activityForm.title}
                      onChange={e => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ej. Taller 1, Examen Final..."
                      className="bg-background"
                    />
                  </div>

                  {usePercentageWeights && (
                    <div className="space-y-2">
                      <Label className="font-semibold">Peso Porcentual (%)</Label>
                      <Input
                        type="number" min="1" max="100"
                        value={activityForm.weight}
                        onChange={e => setActivityForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                        className="bg-background"
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-4 rounded-xl border bg-muted/20">
                    <Switch
                      id="submission-link-toggle"
                      checked={activityForm.allowSubmissionLink}
                      onCheckedChange={val => setActivityForm(prev => ({ ...prev, allowSubmissionLink: val }))}
                      className="mt-0.5 shrink-0"
                    />
                    <div>
                      <Label htmlFor="submission-link-toggle" className="font-semibold cursor-pointer flex items-center gap-1.5">
                        <Link2 className="w-4 h-4 text-primary" />
                        Permitir Enlace de Entrega
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Los aprendices podrán enviar un enlace (URL) con su trabajo para esta actividad.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col min-h-[320px] lg:overflow-hidden p-6 gap-3">
                  <Label className="font-semibold shrink-0">Descripción / Instrucciones (Markdown)</Label>
                  <div className="flex-1 overflow-hidden" data-color-mode="auto">
                    <MDEditor
                      value={activityForm.description}
                      onChange={val => setActivityForm(prev => ({ ...prev, description: val || "" }))}
                      height="100%"
                      style={{ height: "100%", display: "flex", flexDirection: "column" }}
                      preview="edit"
                      visibleDragbar={false}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t shrink-0">
              <Button variant="outline" onClick={() => setIsActivityDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveActivity} disabled={isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {isPending ? "Guardando..." : "Guardar Actividad"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Grade Dialog */}
        <Dialog open={isBulkGradeDialogOpen} onOpenChange={setIsBulkGradeDialogOpen}>
          <DialogContent showCloseButton={false} className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none flex flex-col overflow-hidden bg-background !border-0">
            <DialogHeader className="p-6 pb-4 border-b shrink-0 flex flex-row items-center justify-between">
              <div>
                <DialogTitle>Asignación Masiva de Notas</DialogTitle>
                <DialogDescription>
                  Asigna una misma nota a varios aprendices para la actividad <strong>{bulkGradeActivity?.title}</strong>.
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkGradeDialogOpen(false)}
                className="h-8 px-3 rounded-lg border-border/80 hover:bg-muted text-foreground font-bold text-xs gap-1.5 shadow-2xs shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </Button>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-4 bg-muted/30 p-4 rounded-xl border">
                <div className="lg:w-[220px]">
                  <Label htmlFor="bulk-group" className="text-xs font-bold text-muted-foreground">Equipo</Label>
                  <Select value={bulkSelectedGroupId} onValueChange={setBulkSelectedGroupId}>
                    <SelectTrigger id="bulk-group" className="mt-1 w-full bg-background">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los aprendices</SelectItem>
                      {workGroups.map(wg => (
                        <SelectItem key={wg.id} value={wg.id}>{wg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="lg:w-[180px]">
                  <Label htmlFor="bulk-grade" className="text-xs font-bold">Nota a asignar</Label>
                  <Input 
                    id="bulk-grade" 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="5" 
                    placeholder="Ej. 5.0"
                    value={bulkGradeValue}
                    onChange={e => {
                      const val = e.target.value.replace(",", ".");
                      if (val === "" || (/^\d*(\.\d{0,1})?$/.test(val) && parseFloat(val) <= 5)) {
                        setBulkGradeValue(val);
                      }
                    }}
                    className="mt-1 w-full bg-background"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="bulk-search" className="text-xs font-bold text-muted-foreground">Buscar Aprendiz</Label>
                  <Input 
                    id="bulk-search" 
                    placeholder="Filtrar por nombre..."
                    value={bulkSearchQuery}
                    onChange={e => setBulkSearchQuery(e.target.value)}
                    className="mt-1 w-full bg-background"
                  />
                </div>
                <div className="flex items-center gap-2 lg:mt-5">
                  <Switch 
                    id="bulk-overwrite" 
                    checked={bulkOverwrite} 
                    onCheckedChange={setBulkOverwrite} 
                  />
                  <Label htmlFor="bulk-overwrite" className="cursor-pointer text-sm font-medium">Sobrescribir</Label>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[50px] text-center">
                        <Checkbox 
                          checked={filteredBulkStudents.length > 0 && bulkSelectedStudents.length === filteredBulkStudents.length}
                          onCheckedChange={handleToggleAllBulkStudents}
                          aria-label="Seleccionar todos"
                        />
                      </TableHead>
                      <TableHead>Aprendiz</TableHead>
                      <TableHead className="text-right pr-4">Entrega / Nota Actual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBulkStudents.map(student => {
                      const currentGrade = bulkGradeActivity ? (grades[bulkGradeActivity.id]?.[student.id] || "-") : "-";
                      const sub = bulkGradeActivity ? getSubmissionInfo(bulkGradeActivity, student.id) : null;

                      return (
                        <TableRow key={student.id} className="hover:bg-muted/30">
                          <TableCell className="text-center">
                            <Checkbox 
                              checked={bulkSelectedStudents.includes(student.id)}
                              onCheckedChange={() => handleToggleBulkStudent(student.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-7 w-7 border">
                                <AvatarImage src={student.image} />
                                <AvatarFallback className="text-[10px]">{getInitials(formatName(student.name, student.profile))}</AvatarFallback>
                              </Avatar>
                              <span className="flex items-center gap-1.5 flex-wrap">
                                <span>{formatName(student.name, student.profile)}</span>
                                <StudentNovedadBadge novedad={student.profile?.novedad} color={student.profile?.novedadColor} />
                                <StudentVoceroBadge size="sm" role={student.id === voceroPrincipalId ? "PRINCIPAL" : student.id === voceroSuplenteId ? "SUPLENTE" : null} />
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="inline-flex items-center justify-end gap-2">
                              {sub && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={sub.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 transition-all shrink-0"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs">
                                    Ver entrega del aprendiz
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <Badge variant="outline" className={`w-12 justify-center ${currentGrade === "-" ? "text-muted-foreground" : "font-bold"}`}>
                                {currentGrade}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredBulkStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          No se encontraron aprendices que coincidan con la búsqueda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter className="p-4 sm:p-6 border-t bg-muted/10 shrink-0">
              <Button variant="outline" onClick={() => setIsBulkGradeDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleApplyBulkGrade} disabled={isPending || !bulkGradeValue || bulkSelectedStudents.length === 0}>
                Aplicar a {bulkSelectedStudents.length} {bulkSelectedStudents.length === 1 ? 'aprendiz' : 'aprendices'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <WorkGroupManagerDialog 
          open={isWorkGroupDialogOpen} 
          onOpenChange={setIsWorkGroupDialogOpen}
          courseId={selectedCourseId}
          courseName={courses.find(c => c.id === selectedCourseId)?.name || ""}
          allStudents={students}
          initialWorkGroups={workGroups}
          onSaved={async () => {
            const wgData = await getCourseWorkGroups(selectedCourseId);
            if (wgData.success) setWorkGroups(wgData.groups || []);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
