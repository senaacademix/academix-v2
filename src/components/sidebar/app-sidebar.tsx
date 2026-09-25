"use client";

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { BookOpen, Calendar, Users, FileText, Activity, ScrollText, Home, Wrench, ClipboardList, Settings2, GraduationCap, Building2, CalendarDays, BarChart3, UserCog, CalendarClock, Sparkles, RotateCcw, School, Globe, Eye, Award, ShieldCheck, Megaphone } from "lucide-react"

import { NavMain, NavGroup } from "@/components/sidebar/nav-main"
import { NavUser } from "@/components/sidebar/nav-user"

import { authClient } from "@/lib/auth-client"
import { getRoleFromUser } from "@/features/auth/services/authService"
import { useGestorProgram } from "@/features/gestor/context/GestorProgramContext"
import { getProgramsAction } from "@/features/admin/actions/academicActions"
import { getGestorProgramsAction } from "@/features/gestor/actions/gestorActions"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { AppIdentity } from "./app-identity"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, isPending } = authClient.useSession()
  const { selectedProgramId, selectedProgram, managedPrograms, selectProgram, clearProgram, setManagedPrograms } = useGestorProgram()
  const [mounted, setMounted] = React.useState(false)
  const searchParams = useSearchParams()

  const role = getRoleFromUser(session?.user)
  const isSingleGestorProgram = managedPrograms?.length === 1
  const effectiveGestorProgramId = selectedProgramId || (managedPrograms?.length > 0 ? managedPrograms[0].id : null)
  const hasMultiplePrograms = (managedPrograms?.length || 0) > 1

  const displayPrograms = (managedPrograms && managedPrograms.length > 0)
    ? managedPrograms
    : (selectedProgram ? [selectedProgram] : [])

  // For Admin: active program is determined when explicitly inside a program URL
  const adminProgramParam = searchParams.get("programId")
  const adminActiveProgram = adminProgramParam ? managedPrograms.find(p => p.id === adminProgramParam) || selectedProgram : null

  // Fetch observer or gestor programs if empty
  React.useEffect(() => {
    if (role === "observer" && managedPrograms.length === 0) {
      getProgramsAction().then((progs) => {
        if (progs && progs.length > 0) {
          const mapped = progs.map(p => ({
            id: p.id,
            name: p.name,
            color: (p as any).color || "#3b82f6",
            code: (p as any).code || ""
          }));
          setManagedPrograms(mapped as any);
        }
      }).catch(console.error);
    } else if (role === "gestor" && managedPrograms.length === 0) {
      getGestorProgramsAction().then((progs) => {
        if (progs && progs.length > 0) {
          const mapped = progs.map(p => ({
            id: p.id,
            name: p.name,
            color: (p as any).color || "#3b82f6",
            code: (p as any).code || ""
          }));
          setManagedPrograms(mapped as any);
        }
      }).catch(console.error);
    }
  }, [role, managedPrograms.length, setManagedPrograms]);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])


  // Prevent hydration mismatch by not rendering on server
  if (!mounted) {
    return null
  }

  // If role is gestor and no program is selected, do NOT render the sidebar
  if (role === "gestor" && !effectiveGestorProgramId) {
    return null
  }

  if (isPending) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <AppIdentity />
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 space-y-4">
            <div className="h-4 w-24 animate-pulse rounded bg-sidebar-accent" />
            <div className="h-4 w-32 animate-pulse rounded bg-sidebar-accent" />
            <div className="h-4 w-20 animate-pulse rounded bg-sidebar-accent" />
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="h-12 w-full animate-pulse rounded bg-sidebar-accent" />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    )
  }

  const navMain =
    role === "admin"
      ? [
          {
            title: "Inicio",
            url: "/dashboard/admin",
            icon: Home,
            isActive: false,
          },
          {
            title: "Gestión de Usuarios",
            url: "/dashboard/admin/users",
            icon: Users,
            isActive: false,
          },
          {
            title: "Áreas de Formación",
            url: "/dashboard/admin/courses",
            icon: BookOpen,
            isActive: false,
          },
          {
            title: "Blog de Anuncios",
            url: "/dashboard/admin/announcements",
            icon: Megaphone,
            isActive: false,
          },
          {
            title: "Configuración",
            url: "/dashboard/admin/settings",
            icon: Settings2,
            isActive: false,
          },
        ]
      : role === "gestor"
        ? [
            {
              title: "Inicio",
              url: effectiveGestorProgramId ? `/dashboard/gestor?programId=${effectiveGestorProgramId}` : "/dashboard/gestor",
              icon: Home,
              isActive: false,
            },
            {
              title: "Gestión de Usuarios",
              url: effectiveGestorProgramId ? `/dashboard/gestor/users?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/users",
              icon: Users,
              isActive: false,
            },
            {
              title: "Estructura Curricular",
              url: effectiveGestorProgramId ? `/dashboard/gestor/courses?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/courses",
              icon: BookOpen,
              isActive: false,
            },
            {
              title: "Programación Horaria",
              url: effectiveGestorProgramId ? `/dashboard/gestor/schedules?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/schedules",
              icon: CalendarClock,
              isActive: false,
            },
            {
              title: "Herramientas",
              url: effectiveGestorProgramId ? `/dashboard/gestor/tools?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/tools",
              icon: Wrench,
              isActive: false,
            },
          ]
        : role === "observer"
          ? [
              {
                title: "Inicio",
                url: effectiveGestorProgramId ? `/dashboard/admin?programId=${effectiveGestorProgramId}` : "/dashboard/admin",
                icon: Home,
                isActive: false,
              },
              {
                title: "Áreas de Formación",
                url: effectiveGestorProgramId ? `/dashboard/admin/courses?programId=${effectiveGestorProgramId}` : "/dashboard/admin/courses",
                icon: BookOpen,
                isActive: false,
              },
              {
                title: "Gestión de Usuarios",
                url: effectiveGestorProgramId ? `/dashboard/admin/users?programId=${effectiveGestorProgramId}` : "/dashboard/admin/users",
                icon: Users,
                isActive: false,
              },
            ]
        : role === "teacher"
            ? [
                {
                  title: "Inicio",
                  url: "/dashboard",
                  icon: Home,
                  isActive: false,
                },
                {
                  title: "Mis Grupos y Fichas",
                  url: "/dashboard/teacher",
                  icon: Users,
                  isActive: false,
                },
                {
                  title: "Programación Horaria",
                  url: "/dashboard/teacher/schedule",
                  icon: CalendarClock,
                  isActive: false,
                },
                {
                  title: "Herramientas",
                  url: "/dashboard/teacher/tools",
                  icon: Wrench,
                  isActive: false,
                },
              ]
            : role === "student"
              ? [
                  {
                    title: "Inicio",
                    url: "/dashboard",
                    icon: Home,
                    isActive: false,
                  },
                  {
                    title: "Registro Académico",
                    url: "/dashboard/student/records",
                    icon: ClipboardList,
                    isActive: false,
                  },
                  {
                    title: "Programación Horaria",
                    url: "/dashboard/student/schedule",
                    icon: CalendarClock,
                    isActive: false,
                  },
                  {
                    title: "Elección de Vocero",
                    url: "/dashboard/student/elections",
                    icon: Award,
                    isActive: false,
                  },
                ]
              : [];


  const user = {
    name: (session?.user as { name?: string } | null | undefined)?.name || "Usuario",
    email: (session?.user as { email?: string } | null | undefined)?.email || "m@example.com",
    avatar:
      (session?.user as { image?: string } | null | undefined)?.image || "",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-0">
        <AppIdentity />



        {/* Selector de Área de Formación (Siempre visible para Gestor Académico y Observador) */}
        {displayPrograms.length > 0 && (role === "gestor" || role === "observer") && (
          <div className="px-3.5 py-2.5 mx-2 mb-2 rounded-2xl bg-muted/30 border border-border/60 flex flex-col gap-1.5 group-data-[collapsible=icon]:hidden animate-in fade-in duration-300">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                {role === "observer" ? <Eye className="w-3 h-3" /> : <School className="w-3 h-3" />}
              </div>
              <span>{role === "observer" ? "Área Observada" : "Área de Formación"}</span>
            </span>
            <Select 
              value={effectiveGestorProgramId || displayPrograms[0]?.id || ""} 
              onValueChange={(val) => {
                const prog = displayPrograms.find(p => p.id === val);
                selectProgram(val, prog);
              }}
            >
              <SelectTrigger className="h-9 text-xs font-semibold tracking-tight rounded-xl border-border/80 bg-background shadow-2xs">
                <SelectValue placeholder="Seleccionar Área..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {displayPrograms.map((prog) => (
                  <SelectItem key={prog.id} value={prog.id} className="text-xs font-medium rounded-xl">
                    {prog.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
