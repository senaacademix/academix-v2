"use client";

import * as React from "react";
import Image from "next/image";
import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export function AppIdentity() {
  const { data: session, isPending } = authClient.useSession();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const role = getRoleFromUser(session?.user);

  const getRoleBadge = () => {
    switch (role) {
      case "admin":
        return { label: "Administrador", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 shadow-2xs" };
      case "gestor":
        return { label: "Gestor Académico", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-2xs" };
      case "teacher":
        return { label: "Docente / Instructor", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 shadow-2xs" };
      case "student":
        return { label: "Estudiante / Aprendiz", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 shadow-2xs" };
      default:
        return { label: "AcademiX", color: "bg-primary/15 text-primary border-primary/30 shadow-2xs" };
    }
  };

  const badgeInfo = getRoleBadge();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <div
          className={cn(
            "flex items-center transition-all duration-200 ease-in-out w-full border-b border-sidebar-border/60 h-14",
            isCollapsed
              ? "justify-center px-0"
              : "justify-start px-3.5 bg-sidebar/50 backdrop-blur-md"
          )}
        >
          <div className={cn("flex items-center gap-3", isCollapsed && "justify-center w-full")}>
            {/* Logo Container con Glow */}
            <div
              className={cn(
                "relative flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-md shadow-primary/10 transition-transform duration-300 hover:scale-105 aspect-square",
                isCollapsed ? "h-8.5 w-8.5" : "h-9 w-9"
              )}
            >
              <Image
                src="/logo.png"
                alt="Logo"
                width={22}
                height={22}
                className="object-contain aspect-square"
                priority
              />
            </div>

            {!isCollapsed && (
              isMounted && !isPending ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[17px] font-extrabold tracking-tight text-sidebar-foreground leading-tight">
                    Academi<span className="text-primary">X</span>
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                </div>
              ) : (
                <span className="h-4 w-24 animate-pulse rounded-lg bg-sidebar-accent" />
              )
            )}
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
