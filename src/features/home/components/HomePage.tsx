"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getSettingsAction } from "@/features/admin/actions/settingsActions";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";
import { formatName } from "@/lib/utils";
import { motion } from "framer-motion";
import { getFormattedTodayDate } from "@/lib/dateUtils";
import { useGestorProgram } from "@/features/gestor/context/GestorProgramContext";
import {
  Sparkles,
  GraduationCap,
  Award,
  ShieldCheck,
  Layers,
  Eye,
  BookOpen,
  School,
  CheckCircle2,
  Users,
  CalendarClock,
  CalendarDays,
  Wrench,
  ClipboardList,
  BarChart3,
  Megaphone,
  Settings2,
  ArrowRight
} from "lucide-react";

import { PageTransition } from "@/components/ui/animated-container";

interface HomePageProps {
  initialUserName?: string;
  initialUserRole?: string;
  initialDate?: string;
  initialMetrics?: any;
  initialAnnouncements?: any[];
}

export default function HomePage({
  initialUserName,
  initialUserRole,
  initialDate,
  initialMetrics: _initialMetrics,
  initialAnnouncements: _initialAnnouncements
}: HomePageProps) {
  const [settings, setSettings] = useState<{ institutionName?: string | null }>({});
  const [mounted, setMounted] = useState(false);
  const [clientDate, setClientDate] = useState<string>("");
  const { data: session } = authClient.useSession();
  const { selectedProgramId, managedPrograms } = useGestorProgram();

  const role = initialUserRole || getRoleFromUser(session?.user);
  const userName = initialUserName || session?.user?.name;
  const effectiveGestorProgramId = selectedProgramId || (managedPrograms?.length > 0 ? managedPrograms[0].id : null);

  useEffect(() => {
    setMounted(true);
    setClientDate(getFormattedTodayDate());
  }, []);

  const displayDate = mounted && clientDate ? clientDate : (initialDate || "");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsData = await getSettingsAction();
        setSettings(settingsData || {});
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // Saludo dinámico según la hora del día
  const timeGreeting = useMemo(() => {
    if (!mounted) return "¡Hola";
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "¡Buenos días";
    if (hour >= 12 && hour < 18) return "¡Buenas tardes";
    return "¡Buenas noches";
  }, [mounted]);

  // Metadatos de rol adaptativos
  const roleInfo = useMemo(() => {
    switch (role) {
      case "admin":
        return {
          label: "Administrador Central",
          icon: ShieldCheck,
          message:
            "Bienvenido al panel central de AcademiX. Lideras el gobierno del sistema, la administración de usuarios y el aseguramiento continuo de la calidad formativa.",
        };
      case "gestor":
        return {
          label: "Gestor Curricular",
          icon: Layers,
          message:
            "Bienvenido a tu panel de gestión curricular. Coordinas la articulación de fichas, competencias y asignación de ambientes de formación en tu área.",
        };
      case "observer":
        return {
          label: "Observador Institucional",
          icon: Eye,
          message:
            "Bienvenido a la plataforma de auditoría formativa. Supervisas la trazabilidad de procesos, mallas horarias y métricas del centro.",
        };
      case "student":
        return {
          label: "Aprendiz en Formación",
          icon: BookOpen,
          message:
            "¡Te damos la más cordial bienvenida a tu centro formativo! Construye tus competencias con dedicación, aprovecha cada ambiente y avanza con éxito hacia tu certificación.",
        };
      case "teacher":
      default:
        return {
          label: "Instructor / Docente",
          icon: GraduationCap,
          message:
            "Te damos la bienvenida al portal docente. Tu compromiso y vocación pedagógica guían el talento de nuestros aprendices hacia la excelencia técnica y humana.",
        };
    }
  }, [role]);

  // Opciones de navegación correspondientes a la barra lateral izquierda de cada rol
  const navigationOptions = useMemo(() => {
    switch (role) {
      case "admin":
        return [
          {
            title: "Panel de Control",
            url: "/dashboard/admin",
            icon: BarChart3,
          },
          {
            title: "Gestión de Usuarios",
            url: "/dashboard/admin/users",
            icon: Users,
          },
          {
            title: "Áreas de Formación",
            url: "/dashboard/admin/courses",
            icon: BookOpen,
          },
          {
            title: "Blog de Anuncios",
            url: "/dashboard/admin/announcements",
            icon: Megaphone,
          },
          {
            title: "Configuración",
            url: "/dashboard/admin/settings",
            icon: Settings2,
          },
        ];
      case "gestor":
        return [
          {
            title: "Panel del Área",
            url: effectiveGestorProgramId ? `/dashboard/gestor?programId=${effectiveGestorProgramId}` : "/dashboard/gestor",
            icon: BarChart3,
          },
          {
            title: "Gestión de Aprendices",
            url: effectiveGestorProgramId ? `/dashboard/gestor/users?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/users",
            icon: GraduationCap,
          },
          {
            title: "Estructura Curricular",
            url: effectiveGestorProgramId ? `/dashboard/gestor/courses?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/courses",
            icon: BookOpen,
          },
          {
            title: "Programación Horaria",
            url: effectiveGestorProgramId ? `/dashboard/gestor/schedules?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/schedules",
            icon: CalendarClock,
          },
          {
            title: "Asistencia Semanal",
            url: effectiveGestorProgramId ? `/dashboard/gestor/attendance?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/attendance",
            icon: CalendarDays,
          },
          {
            title: "Herramientas",
            url: effectiveGestorProgramId ? `/dashboard/gestor/tools?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/tools",
            icon: Wrench,
          },
        ];
      case "observer":
        return [
          {
            title: "Panel de Supervisión",
            url: effectiveGestorProgramId ? `/dashboard/admin?programId=${effectiveGestorProgramId}` : "/dashboard/admin",
            icon: BarChart3,
          },
          {
            title: "Programas y Fichas",
            url: effectiveGestorProgramId ? `/dashboard/admin/courses?programId=${effectiveGestorProgramId}` : "/dashboard/admin/courses",
            icon: BookOpen,
          },
          {
            title: "Programación Horaria",
            url: effectiveGestorProgramId ? `/dashboard/admin/schedules?programId=${effectiveGestorProgramId}` : "/dashboard/admin/schedules",
            icon: CalendarClock,
          },
          {
            title: "Asistencia Semanal",
            url: effectiveGestorProgramId ? `/dashboard/gestor/attendance?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/attendance",
            icon: CalendarDays,
          },
        ];
      case "student":
        return [
          {
            title: "Mis Materias",
            url: "/dashboard/student",
            icon: BookOpen,
          },
          {
            title: "Registro Académico",
            url: "/dashboard/student/records",
            icon: ClipboardList,
          },
          {
            title: "Programación Horaria",
            url: "/dashboard/student/schedule",
            icon: CalendarClock,
          },
          {
            title: "Elección de Vocero",
            url: "/dashboard/student/elections",
            icon: Award,
          },
        ];
      case "teacher":
      default:
        return [
          {
            title: "Mis Grupos y Fichas",
            url: "/dashboard/teacher",
            icon: Users,
          },
          {
            title: "Programación Horaria",
            url: "/dashboard/teacher/schedule",
            icon: CalendarClock,
          },
          {
            title: "Herramientas",
            url: "/dashboard/teacher/tools",
            icon: Wrench,
          },
        ];
    }
  }, [role, effectiveGestorProgramId]);

  const RoleIcon = roleInfo.icon;
  const institutionName = settings.institutionName || "SERVICIO NACIONAL DE APRENDIZAJE — SENA";

  return (
    <PageTransition className="w-full flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] my-auto overflow-hidden">
      <div className="relative w-full max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center my-auto">
        {/* Luz ambiental difusa usando el color primario del tema actual */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[540px] h-[340px] sm:h-[420px] bg-primary/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        {/* Insignia de contexto y fecha */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-bold backdrop-blur-md shadow-2xs"
        >
          <RoleIcon className="w-3.5 h-3.5" />
          <span>Panel de {roleInfo.label}</span>
          <span className="w-1 h-1 rounded-full bg-primary/40 mx-0.5" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-medium text-foreground/80" suppressHydrationWarning>
            {displayDate}
          </span>
        </motion.div>

        {/* Nombre Institucional */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="mt-6 text-xs sm:text-sm font-black tracking-widest text-primary uppercase"
        >
          {institutionName}
        </motion.p>

        {/* Gran Título de Bienvenida */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-3 text-4xl sm:text-6xl font-black text-foreground tracking-tight leading-[1.1] text-balance"
        >
          {timeGreeting},{" "}
          <span className="bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
            {userName ? formatName(userName) : roleInfo.label}
          </span>
        </motion.h1>

        {/* Mensaje Editorial de Bienvenida */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="mt-5 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed text-pretty font-normal"
        >
          {roleInfo.message}
        </motion.p>

        {/* Botones de navegación a las opciones de la barra lateral de cada rol */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs font-semibold"
        >
          {navigationOptions.map((opt, idx) => {
            const Icon = opt.icon;
            return (
              <Link
                key={idx}
                href={opt.url}
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/80 bg-card/70 hover:bg-primary hover:text-primary-foreground hover:border-primary/80 backdrop-blur-sm text-foreground shadow-2xs hover:shadow-md hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-primary group-hover:text-primary-foreground transition-colors shrink-0" />
                <span className="font-semibold">{opt.title}</span>
                <ArrowRight className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            );
          })}
        </motion.div>
      </div>
    </PageTransition>
  );
}
