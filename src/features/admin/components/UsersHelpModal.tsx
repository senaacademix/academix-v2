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
  Users,
  GraduationCap,
  School,
  ClipboardList,
  ShieldCheck,
  UserPlus,
  Mail,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Upload,
  Download,
  Calendar,
  Clock,
  BookOpen,
  Lock,
  BarChart3,
  FileSpreadsheet,
} from "lucide-react";

export type UsersTabKey = "students" | "teachers" | "plans" | "admins";

interface UsersTabHelpConfig {
  key: UsersTabKey;
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

const USERS_TABS_HELP_CONFIG: Record<UsersTabKey, UsersTabHelpConfig> = {
  students: {
    key: "students",
    tabLabel: "Aprendices y Matrícula",
    title: "Directorio de Aprendices, Fichas y Matrícula",
    badge: "Módulo: Aprendices",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: <GraduationCap className="w-5 h-5 text-blue-500" />,
    bgIcon: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    subtitle: "Registro institucional de aprendices, control de fichas de formación, novedades y vinculación académica.",
    features: [
      {
        title: "Creación Individual de Aprendices",
        description: "Registra aprendices con sus nombres, apellidos, documento de identidad, correo institucional, teléfono y ficha de formación.",
        icon: <UserPlus className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Filtros por Ficha y Etapa",
        description: "Segmenta y busca aprendices por nombre, correo, código de ficha o etapa formativa (Lectiva, Productiva, Egresados).",
        icon: <Search className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Control de Novedades Académicas",
        description: "Gestiona estados formativos (Activo, Retiro Voluntario, Aplazamiento, Traslado, Deserción) con insignias visuales.",
        icon: <AlertTriangle className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Analítica y Métricas de Grupo",
        description: "Accede al panel analítico de la ficha para consultar indicadores de rendimiento, asistencia y estado del grupo.",
        icon: <BarChart3 className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Envío Masivo de Comunicaciones",
        description: "Selecciona aprendices para redactar y enviarles correos electrónicos informativos directos en bloque.",
        icon: <Mail className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Gestión de Voceros y Líderes",
        description: "Asigna al aprendiz vocero y suplente de la ficha para representación formal ante comités y coordinación.",
        icon: <ShieldCheck className="w-4 h-4 text-blue-500" />,
      },
    ],
    workflowTip: "Verifica que el correo electrónico institucional y el número de ficha estén correctamente asignados a cada aprendiz para que reciban automáticamente sus horarios semanales y notificaciones de clase.",
  },

  teachers: {
    key: "teachers",
    tabLabel: "Instructores",
    title: "Gestión de Instructores, Disponibilidad y Cualificación",
    badge: "Módulo: Instructores",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: <School className="w-5 h-5 text-indigo-500" />,
    bgIcon: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    subtitle: "Directorio de instructores, disponibilidades horarias semanales y cualificación de materias curriculares.",
    features: [
      {
        title: "Registro y Directorio de Instructores",
        description: "Registra nuevos instructores con su identificación, teléfono y correo electrónico para habilitar su acceso a la plataforma.",
        icon: <UserPlus className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Matriz de Disponibilidad Horaria",
        description: "Configura las jornadas (mañana, tarde, noche) y días de la semana en que cada instructor está disponible para impartir clases.",
        icon: <Clock className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Cualificación de Competencias y Materias",
        description: "Habilita las asignaturas del diseño curricular que el perfil técnico y pedagógico del instructor le faculta orientar.",
        icon: <BookOpen className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Aprobación y Bloqueo de Horarios",
        description: "Bloquea la disponibilidad y asignaturas cualificadas una vez acordadas para evitar cambios accidentales en la planeación.",
        icon: <Lock className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Restablecimiento Seguro de Claves",
        description: "Restaura contraseñas de acceso al sistema para instructores que hayan olvidado sus credenciales.",
        icon: <ShieldCheck className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Vinculación a Fichas de Formación",
        description: "Asocia a los instructores con los grupos y fichas a su cargo para permitirles registrar asistencia y calificaciones.",
        icon: <Layers className="w-4 h-4 text-indigo-500" />,
      },
    ],
    workflowTip: "Configura y bloquea la disponibilidad de tus instructores antes de usar el constructor de horarios. El sistema cruza automáticamente estos datos para impedir la sobreasignación o traslape de franjas.",
  },

  plans: {
    key: "plans",
    tabLabel: "Planes de Mejoramiento",
    title: "Seguimiento Académico y Planes de Recuperación",
    badge: "Módulo: Mejoramiento",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: <ClipboardList className="w-5 h-5 text-rose-500" />,
    bgIcon: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
    subtitle: "Instrumentos pedagógicos de compromiso y nivelación para aprendices con juicios evaluativos pendientes.",
    features: [
      {
        title: "Formulación de Planes de Mejoramiento",
        description: "Crea actas de mejoramiento con descripción detallada de evidencias requeridas, resultados de aprendizaje y fechas límite.",
        icon: <ClipboardList className="w-4 h-4 text-rose-500" />,
      },
      {
        title: "Asignación de Instructor Tutor",
        description: "Vincula al instructor responsable de concertar, revisar y calificar las actividades de nivelación acordadas.",
        icon: <School className="w-4 h-4 text-rose-500" />,
      },
      {
        title: "Monitoreo de Estados en Tiempo Real",
        description: "Supervisa el avance de los planes en sus distintas fases: Pendiente, En Ejecución, Superado o No Superado.",
        icon: <CheckCircle2 className="w-4 h-4 text-rose-500" />,
      },
      {
        title: "Soportes y Trazabilidad",
        description: "Adjunta observaciones pedagógicas y registra el cumplimiento formal ante los comités de evaluación.",
        icon: <BookOpen className="w-4 h-4 text-rose-500" />,
      },
    ],
    workflowTip: "Revisa periódicamente los planes con fechas límite próximas para asegurar que los aprendices entreguen sus evidencias antes del cierre del periodo evaluativo.",
  },

  admins: {
    key: "admins",
    tabLabel: "Administradores y Gestores",
    title: "Gestión de Roles, Coordinación y Permisos",
    badge: "Módulo: Administración",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
    bgIcon: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    subtitle: "Control de cuentas privilegiadas, asignación de programas formativos y niveles de autorización.",
    features: [
      {
        title: "Asignación de Roles Institucionales",
        description: "Configura usuarios con roles de Administrador General, Gestor Académico, Coordinador u Observador.",
        icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Asignación de Programas Formativos",
        description: "Define a qué programas de formación tiene acceso y gobernanza cada gestor académico.",
        icon: <Layers className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Auditoría y Seguridad",
        description: "Supervisa estados de cuenta, activación/desactivación de accesos y restablecimiento de credenciales.",
        icon: <Lock className="w-4 h-4 text-emerald-500" />,
      },
    ],
    workflowTip: "Asigna únicamente los programas pertinentes a cada gestor académico para mantener la información organizada y evitar ediciones cruzadas no autorizadas.",
  },
};

interface UsersHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab?: UsersTabKey;
  programName?: string;
  showAdminsTab?: boolean;
}

export function UsersHelpModal({
  open,
  onOpenChange,
  activeTab = "students",
  programName,
  showAdminsTab = false,
}: UsersHelpModalProps) {
  const [selectedTab, setSelectedTab] = useState<UsersTabKey>(activeTab);

  useEffect(() => {
    if (open) {
      setSelectedTab(activeTab);
    }
  }, [open, activeTab]);

  const currentConfig = USERS_TABS_HELP_CONFIG[selectedTab] || USERS_TABS_HELP_CONFIG.students;

  const availableTabKeys = (Object.keys(USERS_TABS_HELP_CONFIG) as UsersTabKey[]).filter(
    (key) => key !== "admins" || showAdminsTab
  );

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
                  Guía de herramientas para la administración de usuarios en {programName ? <strong>{programName}</strong> : "la institución"}.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Interactive Tab Selector Inside Modal */}
          <Tabs
            value={selectedTab}
            onValueChange={(val) => setSelectedTab(val as UsersTabKey)}
            className="w-full mt-3"
          >
            <TabsList className="w-full flex overflow-x-auto bg-muted/50 p-1 rounded-2xl scrollbar-none justify-start sm:justify-center gap-1 h-auto">
              {availableTabKeys.map((tabKey) => {
                const cfg = USERS_TABS_HELP_CONFIG[tabKey];
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
            AcademiX • Control Institucional de Usuarios
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
