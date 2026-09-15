"use client";

import React from "react";
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
import {
  HelpCircle,
  Calendar,
  Users,
  UserCheck,
  CalendarClock,
  Sparkles,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Globe,
  FileEdit,
  Eye,
  CheckCircle2,
  Lock,
} from "lucide-react";

interface ScheduleHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleHelpModal({ open, onOpenChange }: ScheduleHelpModalProps) {
  const sections = [
    {
      icon: <Calendar className="w-5 h-5 text-blue-500" />,
      bgIcon: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
      title: "1. Períodos Académicos y Vigencia",
      badge: "Períodos y Fechas",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      description:
        "Crea y administra tus calendarios académicos con fechas de inicio y fin. El sistema previene automáticamente traslapes de fechas.",
      items: [
        "Definición de rango de fechas sin conflicto ni solapamiento entre horarios.",
        "Detección automática del horario Vigente según la fecha actual.",
        "Control de publicación: alterna entre Borrador (en planeación) y Público (visible a aprendices e instructores).",
      ],
    },
    {
      icon: <Users className="w-5 h-5 text-indigo-500" />,
      bgIcon: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
      title: "2. Fichas y Franjas Horarias (Botón «Grupos»)",
      badge: "Distribución por Grupo",
      badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      description:
        "Configura qué grupos de formación participan en cada horario y sus respectivas jornadas.",
      items: [
        "Vinculación de fichas/grupos del programa formativo seleccionado.",
        "Asignación de días lectivos (Lunes a Domingo) y rangos de horas para cada grupo.",
        "Base obligatoria para poder ubicar las clases en el constructor interactivo.",
      ],
    },
    {
      icon: <UserCheck className="w-5 h-5 text-emerald-500" />,
      bgIcon: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      title: "3. Disponibilidad e Instructores (Botón «Instructores»)",
      badge: "Gestión de Instructores",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      description:
        "Gestiona las franjas horarias disponibles de los instructores y las materias que impartirán.",
      items: [
        "Registro de disponibilidad horaria semanal por cada instructor.",
        "Habilitación de competencias y materias curriculares asignables.",
        "Trazabilidad granular: marca cada franja o materia con el rol que la guardó (Instructor o Gestor).",
        "Bloqueo y desbloqueo de edición para proteger la planeación académica.",
      ],
    },
    {
      icon: <CalendarClock className="w-5 h-5 text-amber-500" />,
      bgIcon: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
      title: "4. Constructor y Matriz de Horarios (Botón «Horario»)",
      badge: "Matriz Oficial",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      description:
        "Matriz gráfica de clases para asignar materias, instructores y ambientes de aprendizaje.",
      items: [
        "Distribución de clases por grupo, jornada y ambiente de formación.",
        "Validación en tiempo real para evitar colisiones de instructores y aulas.",
        "Exportación oficial a PDF de alta fidelidad y hojas de cálculo Excel.",
      ],
    },
    {
      icon: <Sparkles className="w-5 h-5 text-purple-500" />,
      bgIcon: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
      title: "5. Cronograma de Eventos (Botón «Eventos»)",
      badge: "Agenda Institucional",
      badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      description:
        "Organiza y publica actividades especiales que ocurrirán durante el período académico.",
      items: [
        "Programación de conferencias, inducciones, talleres y reuniones institucionales.",
        "Segmentación por audiencia: Público General, Solo Instructores, Solo Aprendices o Fichas.",
        "Vista en calendario interactivo mensual y lista detallada con enlaces y ubicaciones.",
      ],
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
      bgIcon: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
      title: "6. Contingencias y Novedades (Botón «Novedades»)",
      badge: "Gestión de Cambios",
      badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      description:
        "Registra incidencias que modifiquen la rutina habitual de las clases.",
      items: [
        "Reporte de suspensiones de jornada, días festivos y cierres de sede.",
        "Cambios temporales de ambiente/aula o asignación de instructores suplentes.",
        "Visualización en vistas mensual y semanal con descarga de reportes en PDF y Excel.",
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-6xl xl:max-w-7xl max-h-[84vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-card">
        {/* Modal Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/70 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-black text-foreground tracking-tight">
                  ¿Qué puedo hacer en este módulo?
                </DialogTitle>
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold">
                  Guía Rápida
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Guía completa de las herramientas y procesos que puedes gestionar en la programación horaria.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto max-h-[50vh] sm:max-h-[52vh] pr-4 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sections.map((sec, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-border/70 bg-card/60 hover:bg-muted/30 hover:border-primary/30 transition-all space-y-2 shadow-2xs flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${sec.bgIcon}`}
                      >
                        {sec.icon}
                      </div>
                      <h4 className="font-extrabold text-xs text-foreground tracking-tight leading-tight">
                        {sec.title}
                      </h4>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {sec.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/50 space-y-1">
                  {sec.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-start gap-1.5 text-[11px] text-foreground/90">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tips / Info Box */}
          <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3 text-xs text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-foreground block text-xs">
                💡 Consejo para un flujo de trabajo óptimo:
              </span>
              <p className="leading-relaxed text-[11px]">
                Empieza creando el período en <strong>Nuevo Horario</strong> → asigna las fichas y franjas en <strong>Grupos</strong> → define las materias en <strong>Instructores</strong> → y finalmente ubica las clases en la matriz del <strong>Horario</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 px-5 border-t border-border/70 bg-muted/20 flex flex-row items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
            AcademiX • Sistema de Programación Académica
          </span>
          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-5 font-bold shadow-xs ml-auto text-xs h-8 cursor-pointer"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
