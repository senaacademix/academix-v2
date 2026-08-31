"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Plus,
  Trash2,
  BookOpen,
  Loader2,
  Search,
  CheckCircle2,
  FileText,
  UserX,
  RefreshCw,
  Info,
  Wrench,
  Building,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ScheduleNoveltyType } from "@/generated/prisma/client";
import {
  createScheduleNoveltyAction,
  getScheduleNoveltiesAction,
  deleteScheduleNoveltyAction,
} from "../actions/scheduleNoveltyActions";

interface ScheduleNoveltiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupsList: Array<{ id: string; name: string }>;
  environmentsList?: Array<{ id: string; name: string }>;
  initialGroupId?: string;
}

const NOVELTY_TYPES: Array<{
  type: ScheduleNoveltyType;
  label: string;
  badgeClass: string;
  icon: React.ReactNode;
}> = [
  {
    type: "SCHEDULE_SUSPENSION",
    label: "Suspensión de Jornada / Festivo",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  {
    type: "ROOM_CHANGE",
    label: "Cambio de Aula / Ambiente",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
  {
    type: "CLASS_RESCHEDULE",
    label: "Reprogramación / Recuperación",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
  {
    type: "TECHNICAL_OUTAGE",
    label: "Falla Técnica / Mantenimiento",
    badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
  {
    type: "INSTITUTIONAL_EVENT",
    label: "Evento Institucional / Gira",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    icon: <Building className="w-3.5 h-3.5" />,
  },
  {
    type: "VIRTUAL_SESSION",
    label: "Clase Virtual / Asincrónica",
    badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
    icon: <Laptop className="w-3.5 h-3.5" />,
  },
  {
    type: "OTHER",
    label: "Otra Novedad de Horario",
    badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800",
    icon: <Info className="w-3.5 h-3.5" />,
  },
];

export function ScheduleNoveltiesModal({
  open,
  onOpenChange,
  groupsList,
  environmentsList = [],
  initialGroupId,
}: ScheduleNoveltiesModalProps) {
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [novelties, setNovelties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [filterGroupId, setFilterGroupId] = useState<string>(initialGroupId || "ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Delete state
  const [noveltyToDelete, setNoveltyToDelete] = useState<string | null>(null);

  // Form State
  const [formGroupId, setFormGroupId] = useState<string>(initialGroupId || groupsList[0]?.id || "");
  const [formType, setFormType] = useState<ScheduleNoveltyType>("SCHEDULE_SUSPENSION");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [formEndDate, setFormEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNewEnvId, setFormNewEnvId] = useState<string>("none");

  const loadNovelties = async () => {
    setIsLoading(true);
    try {
      const res = await getScheduleNoveltiesAction(filterGroupId);
      if (res.success && res.data) {
        setNovelties(res.data);
      } else {
        toast.error(res.error || "No se pudieron cargar las novedades");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadNovelties();
    }
  }, [open, filterGroupId]);

  const resetForm = () => {
    setFormGroupId(initialGroupId || groupsList[0]?.id || "");
    setFormType("SCHEDULE_SUSPENSION");
    setFormTitle("");
    setFormDescription("");
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setFormEndDate(new Date().toISOString().split("T")[0]);
    setFormNewEnvId("none");
  };

  const handleCreateNovelty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGroupId) return toast.error("Selecciona una ficha / grupo");
    if (!formTitle.trim()) return toast.error("Ingresa un título para la novedad");
    if (!formStartDate || !formEndDate) return toast.error("Selecciona las fechas");

    startTransition(async () => {
      const res = await createScheduleNoveltyAction({
        groupId: formGroupId,
        type: formType,
        title: formTitle,
        description: formDescription,
        startDate: formStartDate,
        endDate: formEndDate,
        newEnvironmentId: formNewEnvId !== "none" ? formNewEnvId : null,
      });

      if (res.success) {
        toast.success("Novedad registrada exitosamente");
        resetForm();
        setActiveTab("list");
        loadNovelties();
      } else {
        toast.error(res.error || "Error al registrar novedad");
      }
    });
  };

  const handleDeleteNovelty = async () => {
    if (!noveltyToDelete) return;
    startTransition(async () => {
      const res = await deleteScheduleNoveltyAction(noveltyToDelete);
      if (res.success) {
        toast.success("Novedad eliminada correctamente");
        setNoveltyToDelete(null);
        loadNovelties();
      } else {
        toast.error(res.error || "Error al eliminar la novedad");
      }
    });
  };

  const filteredNovelties = novelties.filter((n) => {
    const titleMatch = n.title.toLowerCase().includes(searchQuery.toLowerCase());
    const groupMatch = n.group?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = (n.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || groupMatch || descMatch;
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-card">
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Novedades de Horario y Fichas
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registro directo y consulta de contingencias, traslados de aula y cambios de horario.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(val: any) => setActiveTab(val)}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-6 pt-3 bg-card border-b flex justify-between items-center">
              <TabsList className="grid grid-cols-2 w-full max-w-[340px] h-9">
                <TabsTrigger value="list" className="text-xs font-bold gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Novedades ({filteredNovelties.length})
                </TabsTrigger>
                <TabsTrigger value="create" className="text-xs font-bold gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Registrar Novedad
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: LISTADO DE NOVEDADES */}
            <TabsContent value="list" className="flex-1 flex flex-col min-h-0 m-0 p-6 space-y-4">
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar novedad..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="w-full sm:w-56">
                  <Select value={filterGroupId} onValueChange={setFilterGroupId}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Todas las Fichas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs font-bold">
                        🌐 Todas las Fichas
                      </SelectItem>
                      {groupsList.map((g) => (
                        <SelectItem key={g.id} value={g.id} className="text-xs">
                          Ficha {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contenido Listado */}
              <div className="flex-1 min-h-[300px] overflow-y-auto space-y-3 pr-1">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Cargando novedades...</p>
                  </div>
                ) : filteredNovelties.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center border border-dashed rounded-2xl p-6 bg-muted/20">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
                    <p className="text-sm font-bold text-foreground">Sin Novedades Registradas</p>
                    <p className="text-xs text-muted-foreground max-w-xs mt-1">
                      No hay novedades pendientes ni contingencias registradas para esta selección.
                    </p>
                  </div>
                ) : (
                  filteredNovelties.map((n) => {
                    const typeConfig = NOVELTY_TYPES.find((t) => t.type === n.type) || NOVELTY_TYPES[5];
                    const startFmt = format(new Date(n.startDate), "dd MMM yyyy", { locale: es });
                    const endFmt = format(new Date(n.endDate), "dd MMM yyyy", { locale: es });

                    return (
                      <Card
                        key={n.id}
                        className="rounded-xl border border-border/80 bg-card shadow-2xs hover:border-primary/40 transition-all overflow-hidden"
                      >
                        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start gap-3">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border ${typeConfig.badgeClass}`}
                              >
                                {typeConfig.icon}
                                {typeConfig.label}
                              </Badge>
                              <Badge className="bg-primary/10 text-primary font-bold text-[10px] px-2 py-0.5 rounded-md border-0">
                                Ficha {n.group?.name || "Desconocida"}
                              </Badge>
                            </div>

                            <h4 className="font-bold text-sm text-foreground">{n.title}</h4>

                            {n.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed">{n.description}</p>
                            )}

                            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-primary" />
                                {startFmt === endFmt ? startFmt : `${startFmt} - ${endFmt}`}
                              </span>
                              {n.newEnvironment && (
                                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                                  <BookOpen className="w-3 h-3" />
                                  Aula Destino: {n.newEnvironment.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNoveltyToDelete(n.id)}
                            className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* TAB 2: FORMULARIO DE REGISTRO DIRECTO */}
            <TabsContent value="create" className="flex-1 overflow-y-auto m-0 p-6">
              <form onSubmit={handleCreateNovelty} className="space-y-4 max-w-lg mx-auto">
                <div className="space-y-1.5">
                  <Label htmlFor="formGroupId" className="text-xs font-bold">
                    Ficha / Grupo *
                  </Label>
                  <Select value={formGroupId} onValueChange={setFormGroupId}>
                    <SelectTrigger id="formGroupId" className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Seleccionar Ficha" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupsList.map((g) => (
                        <SelectItem key={g.id} value={g.id} className="text-xs">
                          Ficha {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="formType" className="text-xs font-bold">
                    Tipo de Novedad *
                  </Label>
                  <Select value={formType} onValueChange={(val: any) => setFormType(val)}>
                    <SelectTrigger id="formType" className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Seleccionar Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOVELTY_TYPES.map((t) => (
                        <SelectItem key={t.type} value={t.type} className="text-xs font-semibold">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="formTitle" className="text-xs font-bold">
                    Título de la Novedad *
                  </Label>
                  <Input
                    id="formTitle"
                    placeholder="Ej: Suspensión por festivo / Mantenimiento de laboratorio / Cambio de ambiente"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="formStartDate" className="text-xs font-bold">
                      Fecha Inicio *
                    </Label>
                    <Input
                      id="formStartDate"
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="formEndDate" className="text-xs font-bold">
                      Fecha Fin *
                    </Label>
                    <Input
                      id="formEndDate"
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                      required
                    />
                  </div>
                </div>

                {formType === "ROOM_CHANGE" && environmentsList.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="formNewEnvId" className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      Nueva Aula / Ambiente Destino (Opcional)
                    </Label>
                    <Select value={formNewEnvId} onValueChange={setFormNewEnvId}>
                      <SelectTrigger id="formNewEnvId" className="h-9 text-xs rounded-xl border-blue-200">
                        <SelectValue placeholder="Seleccionar nueva aula" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs text-muted-foreground">
                          🚫 Ninguna específica
                        </SelectItem>
                        {environmentsList.map((e) => (
                          <SelectItem key={e.id} value={e.id} className="text-xs">
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="formDescription" className="text-xs font-bold">
                    Descripción / Justificación (Opcional)
                  </Label>
                  <Textarea
                    id="formDescription"
                    placeholder="Detalles adicionales sobre la novedad..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="text-xs rounded-xl min-h-[80px]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={isPending}
                    className="rounded-xl text-xs font-bold h-9"
                  >
                    Limpiar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl text-xs font-bold h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registrando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Registrar Novedad Directamente
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          <DialogFooter className="p-4 border-t bg-card shrink-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold h-9"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirm Delete */}
      <AlertDialog open={!!noveltyToDelete} onOpenChange={() => setNoveltyToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-base">¿Eliminar Novedad?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta acción eliminará el registro de la novedad de horario de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNovelty}
              disabled={isPending}
              className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? "Eliminando..." : "Sí, Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
