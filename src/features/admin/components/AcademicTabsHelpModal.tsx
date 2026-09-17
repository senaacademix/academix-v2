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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  HelpCircle,
  Activity,
  BookOpen,
  Users,
  GraduationCap,
  Building2,
  Clock,
  CheckCircle2,
  Sparkles,
  Layers,
  Upload,
  Download,
  Calendar,
  Lock,
  Search,
  ShieldCheck,
  AlertTriangle,
  FolderKanban,
  FileSpreadsheet,
  Cpu,
} from "lucide-react";

export type AcademicTabKey = "overview" | "periods" | "groups" | "teachers" | "environments";

interface TabHelpConfig {
  key: AcademicTabKey;
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

const TABS_HELP_CONFIG: Record<AcademicTabKey, TabHelpConfig> = {
  overview: {
    key: "overview",
    tabLabel: "Vista General",
    title: "Vista General y Diagnóstico del Programa",
    badge: "Pestaña: Vista General",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: <Activity className="w-5 h-5 text-blue-500" />,
    bgIcon: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    subtitle: "Panel analítico y resumen ejecutivo del programa formativo, sus etapas y métricas de vigencia.",
    features: [
      {
        title: "Progreso Temporal y Vigencia",
        description: "Monitorea el porcentaje de tiempo transcurrido del programa según sus fechas oficiales de inicio y finalización.",
        icon: <Clock className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Estructura de Periodos",
        description: "Visualiza el conteo global de periodos formativos (trimestres/semestres) y líneas de tiempo curriculares.",
        icon: <Calendar className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Distribución de Fichas y Aprendices",
        description: "Revisa la población de aprendices por etapas formativas (Lectiva, Productiva y Egresados) e identifica el grupo más numeroso.",
        icon: <Users className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Intensidad Horaria Máxima",
        description: "Conoce la materia con mayor carga horaria semanal del programa y la sumatoria de horas planificadas.",
        icon: <BookOpen className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Ambientes Vinculados",
        description: "Consulta el número de ambientes y aulas asignadas para el desarrollo de la formación de este programa.",
        icon: <Building2 className="w-4 h-4 text-blue-500" />,
      },
    ],
    workflowTip: "Revisa la Vista General como punto de control inicial para verificar que las fechas, carga horaria y ambientes coincidan con el diseño curricular antes de planificar los horarios oficiales.",
  },

  periods: {
    key: "periods",
    tabLabel: "Malla Curricular",
    title: "Malla Curricular, Periodos y Asignaturas",
    badge: "Pestaña: Malla Curricular",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: <BookOpen className="w-5 h-5 text-indigo-500" />,
    bgIcon: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    subtitle: "Estructuración de la malla curricular, periodos lectivos y catálogo de materias con intensidades horarias por semana.",
    features: [
      {
        title: "Periodos Normales y Especiales",
        description: "Crea y organiza periodos regulares (1°, 2°, 3° trimestre) o módulos especiales (inducción, refuerzos, transversales).",
        icon: <Calendar className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Catálogo de Materias y Competencias",
        description: "Registra asignaturas con su nombre, código, créditos y número de horas semanales y totales requeridas.",
        icon: <BookOpen className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Reordenamiento Drag & Drop",
        description: "Arrastra y suelta periodos y asignaturas para ordenar secuencialmente la ruta de aprendizaje de forma intuitiva.",
        icon: <Layers className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Importación y Exportación JSON",
        description: "Exporta la malla curricular en un archivo JSON para respaldo o importa estructuras completas en segundos.",
        icon: <Upload className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Cálculo Automático de Horas",
        description: "El sistema totaliza automáticamente las horas asignadas por cada periodo y valida que cuadren con el plan curricular.",
        icon: <Clock className="w-4 h-4 text-indigo-500" />,
      },
    ],
    workflowTip: "Define con precisión las horas semanales de cada materia en esta pestaña. Esas horas se utilizarán en el constructor de horarios como límite para evitar sobreasignaciones.",
  },

  groups: {
    key: "groups",
    tabLabel: "Grupos y Aprendices",
    title: "Fichas de Caracterización y Aprendices",
    badge: "Pestaña: Grupos y Aprendices",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: <Users className="w-5 h-5 text-emerald-500" />,
    bgIcon: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    subtitle: "Administración de grupos/fichas de formación, matrícula de aprendices y novedades académicas.",
    features: [
      {
        title: "Fichas y Jornadas Formativas",
        description: "Crea grupos indicando su código de ficha, jornada (Diurna, Nocturna, Mixta, etc.) y etapa (Lectiva, Productiva, Egresados).",
        icon: <Users className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Matrícula Individual y Masiva",
        description: "Registra aprendices uno a uno o efectúa cargas masivas desde archivos Excel o JSON con validación de documentos y correos.",
        icon: <Upload className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Control de Novedades de Aprendices",
        description: "Registra cancelaciones, deserciones, aplazamientos o traslados con insignias visuales de estado y fechas de registro.",
        icon: <AlertTriangle className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Designación de Voceros",
        description: "Identifica al aprendiz vocero y líder del grupo para facilitar la comunicación oficial.",
        icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Descarga de Listas Oficiales",
        description: "Exporta la lista de aprendices por grupo en formatos estructurados para llamados a lista y seguimiento formativo.",
        icon: <Download className="w-4 h-4 text-emerald-500" />,
      },
    ],
    workflowTip: "Mantén clasificada la etapa de cada ficha (Lectiva vs. Productiva) para que en el módulo de horarios solo se configuren franjas de clase a los grupos que asisten a aulas.",
  },

  teachers: {
    key: "teachers",
    tabLabel: "Instructores",
    title: "Equipo de Instructores, Disponibilidad y Materias",
    badge: "Pestaña: Instructores",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: <GraduationCap className="w-5 h-5 text-amber-500" />,
    bgIcon: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    subtitle: "Vinculación de instructores al programa, disponibilidad horaria semanal y habilitación de materias.",
    features: [
      {
        title: "Vinculación de Instructores al Programa",
        description: "Asocia instructores del centro al programa de formación o registra nuevos instructores de forma individual o por archivo.",
        icon: <Users className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Disponibilidad Horaria Semanal",
        description: "Establece las franjas (mañana, tarde, noche) y días en los que cada instructor puede orientar clases presenciales o virtuales.",
        icon: <Clock className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Cualificación de Asignaturas",
        description: "Habilita las materias o competencias curriculares que el perfil profesional del instructor le permite impartir.",
        icon: <BookOpen className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Aprobación y Bloqueo Seguro",
        description: "Bloquea la disponibilidad y materias aprobadas para salvaguardar la planeación y prevenir modificaciones no autorizadas.",
        icon: <Lock className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Acciones Masivas en Lote",
        description: "Selecciona múltiples instructores para aprobar su disponibilidad, desbloquear materias o desvincularlos en un solo clic.",
        icon: <CheckCircle2 className="w-4 h-4 text-amber-500" />,
      },
    ],
    workflowTip: "Cualifica las materias de cada instructor antes de generar el horario general; así el sistema filtrará únicamente a los instructores que cumplen tanto con la disponibilidad como con el perfil de la materia.",
  },

  environments: {
    key: "environments",
    tabLabel: "Ambientes",
    title: "Espacios de Formación, Aulas y Laboratorios",
    badge: "Pestaña: Ambientes",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: <Building2 className="w-5 h-5 text-purple-500" />,
    bgIcon: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
    subtitle: "Catálogo de ambientes de aprendizaje, aforos, dotación técnica y estado operativo.",
    features: [
      {
        title: "Catálogo de Ambientes",
        description: "Registra aulas polivalentes, laboratorios de cómputo, talleres especializados o salas virtuales con su ubicación física.",
        icon: <Building2 className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Aforo y Capacidad Máxima",
        description: "Configura el número máximo de aprendices por sala para prevenir sobrecupos y garantizar condiciones pedagógicas óptimas.",
        icon: <Users className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Dotación y Recursos Técnicos",
        description: "Asocia los recursos disponibles (computadores, proyectores, tableros interactivos, software específico, Wi-Fi).",
        icon: <Cpu className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Estado Operativo (Activo / Inactivo)",
        description: "Inactiva temporalmente ambientes en remodelación o mantenimiento técnico para que no puedan ser ocupados en los horarios.",
        icon: <ShieldCheck className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Importación y Exportación JSON",
        description: "Exporta la infraestructura física en formato JSON o importa catálogos existentes rápidamente.",
        icon: <Download className="w-4 h-4 text-purple-500" />,
      },
    ],
    workflowTip: "Verifica que la capacidad de los ambientes sea mayor o igual al número de alumnos del grupo asignado; el constructor de horarios alerta si intentas ubicar un grupo en un ambiente con capacidad insuficiente.",
  },
};

interface AcademicTabsHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab?: AcademicTabKey;
  programName?: string;
}

export function AcademicTabsHelpModal({
  open,
  onOpenChange,
  activeTab = "overview",
  programName,
}: AcademicTabsHelpModalProps) {
  const [selectedTab, setSelectedTab] = useState<AcademicTabKey>(activeTab);

  // Sync with prop when opened
  useEffect(() => {
    if (open) {
      setSelectedTab(activeTab);
    }
  }, [open, activeTab]);

  const currentConfig = TABS_HELP_CONFIG[selectedTab] || TABS_HELP_CONFIG.overview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-6xl xl:max-w-7xl max-h-[84vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-card">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
                <HelpCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
                    ¿Qué puedo hacer acá?
                  </DialogTitle>
                  <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${currentConfig.badgeColor}`}>
                    {currentConfig.badge}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Guía de herramientas y procesos disponibles en {programName ? <strong>{programName}</strong> : "este programa"}.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Interactive Tab Selector Inside Modal */}
          <Tabs
            value={selectedTab}
            onValueChange={(val) => setSelectedTab(val as AcademicTabKey)}
            className="w-full mt-3"
          >
            <TabsList className="w-full flex overflow-x-auto bg-muted/50 p-1 rounded-2xl scrollbar-none justify-start sm:justify-center gap-1 h-auto">
              {(Object.keys(TABS_HELP_CONFIG) as AcademicTabKey[]).map((tabKey) => {
                const cfg = TABS_HELP_CONFIG[tabKey];
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

          {/* Features Grid */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
              Funcionalidades y Capacidades Principales:
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
                💡 Consejo de Trabajo Recomendado:
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
            AcademiX • Guía de Gestión Académica
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
