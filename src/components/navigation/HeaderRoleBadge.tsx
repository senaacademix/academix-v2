"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";
import { cn } from "@/lib/utils";
import { Sparkles, ShieldCheck, UserCheck, GraduationCap, Eye } from "lucide-react";

export function HeaderRoleBadge() {
  const { data: session, isPending } = authClient.useSession();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || isPending || !session?.user) {
    return null;
  }

  const role = getRoleFromUser(session.user);

  const getRoleBadge = () => {
    switch (role) {
      case "admin":
        return {
          shortLabel: "Admin",
          fullLabel: "Administrador",
          icon: ShieldCheck,
        };
      case "gestor":
        return {
          shortLabel: "Gestor",
          fullLabel: "Gestor Académico",
          icon: Sparkles,
        };
      case "observer":
        return {
          shortLabel: "Observador",
          fullLabel: "Observador de Programa",
          icon: Eye,
        };
      case "teacher":
        return {
          shortLabel: "Docente",
          fullLabel: "Docente / Instructor",
          icon: UserCheck,
        };
      case "student":
        return {
          shortLabel: "Aprendiz",
          fullLabel: "Estudiante / Aprendiz",
          icon: GraduationCap,
        };
      default:
        return {
          shortLabel: "Usuario",
          fullLabel: "Usuario",
          icon: Sparkles,
        };
    }
  };

  const badgeInfo = getRoleBadge();
  const Icon = badgeInfo.icon;

  return (
    <div className="flex items-center min-w-0 pointer-events-none select-none">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-extrabold uppercase tracking-wider border shadow-2xs transition-all duration-300 animate-in fade-in backdrop-blur-md",
          "bg-primary/10 text-primary border-primary/25 hover:bg-primary/15"
        )}
      >
        <Icon className="w-3.5 h-3.5 shrink-0 text-primary" />
        <span className="hidden sm:inline truncate">{badgeInfo.fullLabel}</span>
        <span className="inline sm:hidden truncate">{badgeInfo.shortLabel}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-0.5" />
      </div>
    </div>
  );
}
