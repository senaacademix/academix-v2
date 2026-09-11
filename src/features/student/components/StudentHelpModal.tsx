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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HelpCircle,
  Calendar,
  Clock,
  GraduationCap,
  ShieldAlert,
  FileText,
  BookOpen,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  History,
  FileSpreadsheet,
  AlertTriangle,
  Upload,
  UserCheck,
} from "lucide-react";

export type StudentTabKey =
  | "overview"
  | "schedule"
  | "attendance"
  | "evaluations"
  | "remarks"
  | "improvement"
  | "documentation";

interface TabHelpConfig {
  key: StudentTabKey;
  tabLabel: string;
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  bgIcon: string;
  subtitle: string;
  features: Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
  }>;
  workflowTip: string;
}

const STUDENT_TABS_HELP_CONFIG: Record<StudentTabKey, TabHelpConfig> = {
  overview: {
    key: "overview",
    tabLabel: "Vista General",
    title: "Panel Principal del Estudiante",
    badge: "Módulo: Resumen Académico",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: <Sparkles className="w-5 h-5 text-purple-500" />,
    bgIcon: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
    subtitle: "Visión panorámica de tus materias en curso, fichas vinculadas y estado académico general en AcademiX.",
    features: [
      {
        title: "Materias y Asignaturas Activas",
        description: "Accede al listado de materias que estás cursando en tu ficha actual con sus docentes encargados.",
        icon: <BookOpen className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Histórico de Fichas",
        description: "Consulta el historial de todas las fichas o programas a los que has pertenecido en la institución.",
        icon: <History className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Seguimiento de Inscripciones",
        description: "Revisa si tienes solicitudes de matrícula pendientes de aprobación por parte del instructor.",
        icon: <UserCheck className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Alertas de Novedad y Seguridad",
        description: "Recibe avisos sobre cambios de contraseña sugeridos y novedades administrativas de tu perfil.",
        icon: <ShieldAlert className="w-4 h-4 text-purple-500" />,
      },
    ],
    workflowTip: "Usa el botón 'Mi Histórico de Fichas' en el encabezado si has cambiado de grupo o estás cursando ciclos especiales.",
  },

  schedule: {
    key: "schedule",
    tabLabel: "Mi Horario",
    title: "Horario Semanal de Clases y Ambientes",
    badge: "Módulo: Mi Horario",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: <Calendar className="w-5 h-5 text-blue-500" />,
    bgIcon: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    subtitle: "Calendario detallado de tus jornadas académicas, salones asignados y eventos institucionales.",
    features: [
      {
        title: "Distribución Semanal de Bloques",
        description: "Observa tus franjas horarias de lunes a sábado organizadas de forma visual y con código de color por asignatura.",
        icon: <Clock className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Ubicación del Ambiente / Aula",
        description: "Identifica con precisión el salón, taller o laboratorio donde se imparte cada una de tus clases.",
        icon: <CheckCircle2 className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Docente Titular por Franja",
        description: "Conoce qué profesor orienta cada franja horaria para coordinar consultas o entregas presenciales.",
        icon: <UserCheck className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Eventos y Jornadas Especiales",
        description: "Consulta eventos institucionales programados por la coordinación que afecten la jornada regular.",
        icon: <Calendar className="w-4 h-4 text-blue-500" />,
      },
    ],
    workflowTip: "Revisa tu horario cada semana para verificar cambios de aula o eventos extraordinarios programados por la coordinación.",
  },

  attendance: {
    key: "attendance",
    tabLabel: "Asistencia",
    title: "Historial de Asistencia y Justificación de Faltas",
    badge: "Módulo: Asistencia y Excusas",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: <Clock className="w-5 h-5 text-emerald-500" />,
    bgIcon: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    subtitle: "Control de tus presencias, retardos y radicación de incapacidades médicas o permisos justificados.",
    features: [
      {
        title: "Porcentaje de Presencialidad",
        description: "Monitorea tu porcentaje acumulado de asistencia por cada asignatura para no superar el límite de faltas.",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Detalle de Inasistencias y Retardos",
        description: "Revisa fecha exacta, materia y tipo de novedad registrada por tu docente.",
        icon: <AlertTriangle className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Radicación de Justificaciones",
        description: "Envía el enlace público a tu soporte médico (Google Drive, OneDrive) y un mensaje explicativo al docente.",
        icon: <ExternalLink className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Seguimiento al Estado de la Excusa",
        description: "Verifica si el profesor ha validado tu justificación y cambiado la falta injustificada a justificada.",
        icon: <UserCheck className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Descarga de Registro en PDF",
        description: "Exporta tu certificado e historial de asistencia para presentar en trámites académicos o de patrocinio.",
        icon: <FileSpreadsheet className="w-4 h-4 text-emerald-500" />,
      },
    ],
    workflowTip: "Radica tus justificaciones médicas dentro de los 3 días hábiles siguientes a la falta para que el docente pueda validar tu soporte a tiempo.",
  },

  evaluations: {
    key: "evaluations",
    tabLabel: "Calificaciones",
    title: "Notas, Actividades y Seguimiento Académico",
    badge: "Módulo: Mis Calificaciones",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: <GraduationCap className="w-5 h-5 text-indigo-500" />,
    bgIcon: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    subtitle: "Consulta de notas cuantitativas, actividades evaluativas programadas y retroalimentación de docentes.",
    features: [
      {
        title: "Notas por Materia y Corte",
        description: "Visualiza tus calificaciones organizadas por trimestres o cortes evaluativos con su porcentaje ponderado.",
        icon: <GraduationCap className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Envío de Entregas Digitales",
        description: "Carga enlaces a repositorios de GitHub, carpetas de Drive o documentos de proyectos evaluativos.",
        icon: <Upload className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Retroalimentación Docente",
        description: "Lee los comentarios y sugerencias que tus instructores registraron en cada una de tus evaluaciones.",
        icon: <FileText className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Cálculo Automático de Promedio",
        description: "El sistema calcula tu promedio ponderado en tiempo real según el peso de cada actividad evaluada.",
        icon: <CheckCircle2 className="w-4 h-4 text-indigo-500" />,
      },
    ],
    workflowTip: "Verifica que el enlace de tus entregas compartidas en Drive tenga los permisos en modo 'Público / Cualquier persona con el enlace' para que el profesor pueda calificarlo.",
  },

  remarks: {
    key: "remarks",
    tabLabel: "Observaciones",
    title: "Observaciones Formativas y Disciplinarias",
    badge: "Módulo: Observaciones",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: <ShieldAlert className="w-5 h-5 text-amber-500" />,
    bgIcon: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    subtitle: "Registro de felicitaciones, llamados de atención formativos y compromisos con acuse de recibo.",
    features: [
      {
        title: "Revisión de Anotaciones",
        description: "Lee las observaciones registradas por los docentes con fecha, materia y descripción del hecho.",
        icon: <FileText className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Acuse de Lectura",
        description: "Marca las observaciones como leídas para confirmar a la coordinación que estás enterado de la novedad.",
        icon: <CheckCircle2 className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Felicitaciones y Reconocimientos",
        description: "Consulta también tus reconocimientos por rendimiento destacado, liderazgo o trabajo colaborativo.",
        icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      },
    ],
    workflowTip: "Si tienes alguna duda sobre una observación, acércate respetuosamente con tu docente para dialogar y fijar compromisos de mejora.",
  },

  improvement: {
    key: "improvement",
    tabLabel: "Planes de Mejoramiento",
    title: "Planes de Nivelación y Recuperación Académica",
    badge: "Módulo: Planes de Mejoramiento",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: <FileText className="w-5 h-5 text-rose-500" />,
    bgIcon: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
    subtitle: "Flujo digital para firmar compromisos, entregar evidencias de recuperación y superar asignaturas pendientes.",
    features: [
      {
        title: "Firma Digital del Compromiso",
        description: "Revisa las actividades asignadas por el docente y firma digitalmente el acta para iniciar tu plan.",
        icon: <CheckCircle2 className="w-4 h-4 text-rose-500" />,
      },
      {
        title: "Carga de Evidencias de Entrega",
        description: "Ingresa el enlace a tus talleres, proyectos o documentación antes de la fecha límite fijada.",
        icon: <ExternalLink className="w-4 h-4 text-rose-500" />,
      },
      {
        title: "Seguimiento por Pasos",
        description: "Conoce el estado del plan en tiempo real: Asignado, Firmado, En Revisión, Aprobado o Por Corregir.",
        icon: <Clock className="w-4 h-4 text-rose-500" />,
      },
      {
        title: "Nota y Acta de Cierre",
        description: "Una vez evaluado, consulta tu concepto final y descarga el acta con las firmas del aprendiz e instructor.",
        icon: <FileSpreadsheet className="w-4 h-4 text-rose-500" />,
      },
    ],
    workflowTip: "No esperes al último día de la fecha límite para subir tus evidencias. Comprueba que tus enlaces abran correctamente en una pestaña de incógnito.",
  },

  documentation: {
    key: "documentation",
    tabLabel: "Documentación",
    title: "Materiales de Apoyo, Guías y Enlaces",
    badge: "Módulo: Guías y Enlaces",
    badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    icon: <BookOpen className="w-5 h-5 text-cyan-500" />,
    bgIcon: "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400",
    subtitle: "Acceso centralizado a carpetas de Drive, repositorios de GitHub y material didáctico provisto por tus profesores.",
    features: [
      {
        title: "Guías Curriculares y Talleres",
        description: "Accede directamente a los documentos de trabajo estructurados por tus profesores para cada materia.",
        icon: <FileText className="w-4 h-4 text-cyan-500" />,
      },
      {
        title: "Carpetas Compartidas y Nube",
        description: "Enlaces a Google Drive, OneDrive y diapositivas de clase disponibles 24/7 para tu estudio.",
        icon: <ExternalLink className="w-4 h-4 text-cyan-500" />,
      },
      {
        title: "Repositorios de Código",
        description: "Vínculos a plantillas de código fuente y proyectos de referencia compartidos por los instructores técnicos.",
        icon: <BookOpen className="w-4 h-4 text-cyan-500" />,
      },
    ],
    workflowTip: "Guarda los enlaces clave en tus marcadores de navegador para acceder rápidamente incluso cuando no estés en clase.",
  },
};

interface StudentHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: StudentTabKey;
}

export function StudentHelpModal({
  open,
  onOpenChange,
  initialTab = "overview",
}: StudentHelpModalProps) {
  const [selectedTab, setSelectedTab] = useState<StudentTabKey>(initialTab);

  useEffect(() => {
    if (open) {
      setSelectedTab(initialTab);
    }
  }, [open, initialTab]);

  const currentConfig = STUDENT_TABS_HELP_CONFIG[selectedTab] || STUDENT_TABS_HELP_CONFIG.overview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-6xl xl:max-w-7xl max-h-[84vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-card">
        {/* Modal Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 bg-muted/30 border-b border-border/70 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-base sm:text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                  <span>¿Qué puedo hacer en este panel?</span>
                  <Badge variant="outline" className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg ${currentConfig.badgeColor}`}>
                    {currentConfig.badge}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Guía interactiva para el aprendiz: horarios, asistencias, notas, justificaciones y planes.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Interactive Tab Selector Inside Modal */}
          <Tabs
            value={selectedTab}
            onValueChange={(val) => setSelectedTab(val as StudentTabKey)}
            className="w-full mt-3"
          >
            <TabsList className="w-full flex overflow-x-auto bg-muted/50 p-1 rounded-2xl scrollbar-none justify-start sm:justify-center gap-1 h-auto">
              {(Object.keys(STUDENT_TABS_HELP_CONFIG) as StudentTabKey[]).map((tabKey) => {
                const cfg = STUDENT_TABS_HELP_CONFIG[tabKey];
                return (
                  <TabsTrigger
                    key={tabKey}
                    value={tabKey}
                    className="rounded-xl text-xs font-bold flex-1 shrink-0 gap-1.5 py-1.5 px-3 data-[state=active]:shadow-sm"
                  >
                    {cfg.tabLabel}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </DialogHeader>

        {/* Modal Body - Wide & not so tall with balanced scrolling */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[50vh] sm:max-h-[52vh] scrollbar-thin">
          {/* Active Tab Banner */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-muted/30 border border-border/70 flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${currentConfig.bgIcon}`}>
              {currentConfig.icon}
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {currentConfig.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {currentConfig.subtitle}
              </p>
            </div>
          </div>

          {/* Features Grid (3 Columns on large screens) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
              Capacidades Disponibles para el Aprendiz:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {currentConfig.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-card border border-border/70 hover:border-primary/40 transition-colors flex items-start gap-2.5 shadow-2xs"
                >
                  <div className="w-7 h-7 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center shrink-0 mt-0.5">
                    {feat.icon}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-bold text-foreground">
                      {feat.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Recommendation Box */}
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-foreground block text-xs">
                💡 Consejo Útil para el Aprendiz:
              </span>
              <p className="leading-relaxed text-[11px]">
                {currentConfig.workflowTip}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 px-5 border-t border-border/70 bg-muted/20 flex flex-row items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
            AcademiX • Portal del Estudiante
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
