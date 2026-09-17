"use client";

import React, { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  History,
  GraduationCap,
  Calendar,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Loader2,
  BookOpen,
  Award,
  AlertTriangle,
  Sparkles,
  GitBranch,
} from "lucide-react";
import {
  getStudentGroupHistoryAction,
  transferStudentGroupAction,
  addHistoricalGroupAction,
  StudentGroupHistoryItem,
} from "../actions/studentGroupHistoryActions";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface StudentGroupHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  studentName?: string;
  isStaffManager?: boolean;
  groupsList?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export function StudentGroupHistoryModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  isStaffManager = false,
  groupsList = [],
  onSuccess,
}: StudentGroupHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    student: {
      id: string;
      name: string;
      email: string;
      identificacion: string;
      currentGroup: string;
    };
    history: StudentGroupHistoryItem[];
    allGroups?: Array<{ id: string; name: string }>;
  } | null>(null);

  // Transfer Form State
  const [isTransferring, setIsTransferring] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string>("none");
  const [transferReason, setTransferReason] = useState<string>("");

  useEffect(() => {
    if (open && studentId) {
      loadHistory();
    } else {
      setData(null);
      setShowTransferForm(false);
      setTargetGroupId("none");
      setTransferReason("");
    }
  }, [open, studentId]);

  const loadHistory = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await getStudentGroupHistoryAction(studentId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        toast.error(res.error || "No se pudo cargar el historial de fichas.");
      }
    } catch (err: any) {
      toast.error("Error al cargar historial del aprendiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!studentId) return;
    if (targetGroupId === "none") {
      toast.error("Por favor selecciona una ficha de destino válida.");
      return;
    }

    setIsTransferring(true);
    try {
      const res = await transferStudentGroupAction({
        studentId,
        newGroupId: targetGroupId,
        reason: transferReason.trim() || undefined,
      });

      if (res.success) {
        toast.success("Traslado de ficha registrado exitosamente.");
        setShowTransferForm(false);
        setTransferReason("");
        await loadHistory();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || "Error al realizar el traslado.");
      }
    } catch (err: any) {
      toast.error("Error inesperado al transferir al aprendiz.");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleExecuteAddHistorical = async () => {
    if (!studentId) return;
    if (targetGroupId === "none") {
      toast.error("Por favor selecciona la ficha previa del aprendiz.");
      return;
    }

    setIsTransferring(true);
    try {
      const res = await addHistoricalGroupAction({
        studentId,
        groupId: targetGroupId,
        notes: transferReason.trim() || "Ficha histórica de origen vinculada manualmente",
      });

      if (res.success) {
        toast.success("Ficha histórica vinculada exitosamente al expediente del aprendiz.");
        setShowTransferForm(false);
        setTransferReason("");
        await loadHistory();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || "Error al vincular la ficha histórica.");
      }
    } catch (err: any) {
      toast.error("Error inesperado al vincular la ficha.");
    } finally {
      setIsTransferring(false);
    }
  };

  const formatDateStr = (dStr?: string | null) => {
    if (!dStr) return "Presente";
    try {
      return format(new Date(dStr), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dStr;
    }
  };

  // Combine prop groupsList with fetched allGroups from data
  const availableGroupMap = new Map<string, { id: string; name: string }>();
  groupsList.forEach((g) => availableGroupMap.set(g.id, g));
  if (data?.allGroups) {
    data.allGroups.forEach((g) => availableGroupMap.set(g.id, g));
  }
  const availableGroupsList = Array.from(availableGroupMap.values());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[840px] max-h-[88vh] flex flex-col p-6 rounded-2xl overflow-hidden">
        <DialogHeader className="space-y-1 shrink-0 pb-3 border-b border-border/70">
          <DialogTitle className="flex items-center gap-2 text-base font-black text-foreground">
            <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Línea de Tiempo y Histórico de Fichas
          </DialogTitle>
          <DialogDescription className="text-xs">
            Registro de la trayectoria del aprendiz a través de las diferentes fichas y grupos de formación.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-medium">Cargando historial del aprendiz...</p>
          </div>
        ) : !data ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No se pudo obtener información para este aprendiz.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-3 px-3 scrollbar-thin">
            {/* Student Header Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-background border border-indigo-500/20 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-black text-foreground truncate">{data.student.name}</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Documento: {data.student.identificacion} | {data.student.email}
                </p>
              </div>
              <Badge className="bg-indigo-600 text-white font-bold text-[10px] shrink-0">
                {data.student.currentGroup}
              </Badge>
            </div>

            {/* Admin / Manager Transfer Action Banner */}
            {isStaffManager && (
              <div className="bg-muted/40 border border-border/80 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                    <span>Gestión de Traslado de Ficha</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTransferForm((prev) => !prev)}
                    className="h-7 text-xs font-bold rounded-lg border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                  >
                    {showTransferForm ? "Ocultar Formulario" : "Trasladar a Nueva Ficha"}
                  </Button>
                </div>

                {showTransferForm && (
                  <div className="pt-2 border-t border-border/60 space-y-3 animate-in fade-in-50 duration-200">
                    <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-900 dark:text-purple-300 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <span>
                        El traslado actualizará la ficha activa del aprendiz y marcará la actual como histórico (`status = TRANSFERRED`). <strong>Todo el historial pasado permanece 100% conservado e independiente.</strong>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="targetGroupId" className="text-xs font-bold">
                        Nueva Ficha Activa de Destino *
                      </Label>
                      <Select value={targetGroupId} onValueChange={setTargetGroupId} disabled={isTransferring}>
                        <SelectTrigger id="targetGroupId" className="h-9 rounded-xl text-xs font-medium">
                          <SelectValue placeholder="Seleccionar ficha de destino" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          <SelectItem value="none" className="text-xs text-muted-foreground font-semibold">
                            🚫 Seleccionar ficha...
                          </SelectItem>
                          {availableGroupsList.map((g) => (
                            <SelectItem key={g.id} value={g.id} className="text-xs font-bold">
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="transferReason" className="text-xs font-bold">
                        Motivo u Observación del Traslado
                      </Label>
                      <Input
                        id="transferReason"
                        placeholder="Ej. Solicitud de cambio de jornada / reingreso..."
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                        disabled={isTransferring}
                        className="h-9 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowTransferForm(false)}
                        disabled={isTransferring}
                        className="h-7 text-xs rounded-lg"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleExecuteTransfer}
                        disabled={isTransferring || targetGroupId === "none"}
                        className="h-7 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg gap-1.5"
                      >
                        {isTransferring ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando...
                          </>
                        ) : (
                          "Confirmar Traslado"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Timeline Items List */}
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Historial de Fichas Registradas ({data.history.length})
              </h4>

              {data.history.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-card">
                  No hay registros históricos de fichas para este aprendiz.
                </div>
              ) : (
                <div className="relative ml-4 pl-6 border-l-2 border-indigo-500/30 space-y-4">
                  {data.history.map((item, idx) => {
                    const isCurrent = item.isCurrent || item.status === "ACTIVE";

                    return (
                      <div key={item.id || idx} className="relative group">
                        {/* Timeline Node Icon */}
                        <div
                          className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center ${
                            isCurrent
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-600"
                              : "border-indigo-400 bg-indigo-100 text-indigo-600 dark:bg-indigo-950"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCurrent ? "bg-emerald-600 animate-pulse" : "bg-indigo-500"
                            }`}
                          />
                        </div>

                        {/* Timeline Item Card */}
                        <div
                          className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                            isCurrent
                              ? "bg-emerald-500/5 border-emerald-500/30 shadow-2xs"
                              : "bg-card border-border/80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-foreground">
                                  Ficha {item.groupName}
                                </span>
                                {item.periodName && (
                                  <Badge variant="outline" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20">
                                    {item.periodName}
                                  </Badge>
                                )}
                                {item.timelineName && (
                                  <Badge variant="outline" className="text-[9px] font-semibold bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                                    <GitBranch className="w-2.5 h-2.5 text-primary" />
                                    {item.timelineName}
                                  </Badge>
                                )}
                                <Badge
                                  className={`text-[9px] font-bold ${
                                    isCurrent
                                      ? "bg-emerald-600 text-white"
                                      : item.status === "TRANSFERRED"
                                      ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {isCurrent ? "🟢 FICHA ACTIVA ACTUAL" : `TRASLADADO / HISTÓRICO`}
                                </Badge>
                              </div>
                            </div>

                            <div className="text-right text-[10px] font-mono text-muted-foreground space-y-0.5">
                              <p className="flex items-center justify-end gap-1">
                                <Clock className="w-2.5 h-2.5 text-indigo-500" />
                                <span>Ingreso: {formatDateStr(item.joinedAt)}</span>
                              </p>
                              {item.leftAt && (
                                <p className="text-muted-foreground/80">Salida: {formatDateStr(item.leftAt)}</p>
                              )}
                            </div>
                          </div>

                          {/* Stats Metrics Grid for this Group */}
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-center">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                                Promedio
                              </span>
                              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                {item.averageGrade && item.averageGrade > 0 ? item.averageGrade.toFixed(2) : "N/A"}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-center">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                                Asistencia
                              </span>
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                {Math.round(item.attendanceRate ?? 100)}%
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-center">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                                Novedades
                              </span>
                              <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                                {item.remarksCount || 0} obs.
                              </span>
                            </div>
                          </div>

                          {item.notes && (
                            <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-2 rounded-lg border border-border/40">
                              💬 Nota: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 border-t border-border/70">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold text-xs h-8"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
