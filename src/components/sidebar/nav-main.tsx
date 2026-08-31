"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  iconColor?: {
    active: string;
    inactive: string;
  };
  isActive?: boolean;
  badge?: number;
  items?: {
    title: string;
    url: string;
  }[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

function getItemColorScheme(title: string, customColor?: NavItem["iconColor"]) {
  if (customColor) return customColor;

  const lower = title.toLowerCase();

  if (lower.includes("inicio")) {
    return {
      inactive: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
      active: "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30 border-transparent",
    };
  }
  if (lower.includes("matrícula") || lower.includes("usuarios") || lower.includes("fichas") || lower.includes("grupos") || lower.includes("cursos")) {
    return {
      inactive: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
      active: "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/30 border-transparent",
    };
  }
  if (lower.includes("estructura") || lower.includes("ambientes") || lower.includes("programas")) {
    return {
      inactive: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
      active: "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 border-transparent",
    };
  }
  if (lower.includes("horario") || lower.includes("malla") || lower.includes("eventos")) {
    return {
      inactive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
      active: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30 border-transparent",
    };
  }
  if (lower.includes("registro") || lower.includes("historial") || lower.includes("académico")) {
    return {
      inactive: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
      active: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30 border-transparent",
    };
  }
  if (lower.includes("configurac")) {
    return {
      inactive: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
      active: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/30 border-transparent",
    };
  }

  return {
    inactive: "bg-primary/10 text-primary border-primary/20",
    active: "bg-primary text-primary-foreground shadow-md shadow-primary/30 border-transparent",
  };
}

export function NavMain({
  items,
  groups,
}: {
  items?: NavItem[];
  groups?: NavGroup[];
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const navGroups: NavGroup[] = groups || (items ? [{ items }] : []);

  return (
    <>
      {navGroups.map((group, groupIdx) => (
        <SidebarGroup key={groupIdx} className="py-2 px-2">
          {group.label && (
            <SidebarGroupLabel className="px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1.5 select-none group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarMenu className="space-y-1.5">
            {group.items.map((item) => {
              const isDashboard = item.url === "/dashboard";
              const active =
                item.isActive ||
                (isDashboard
                  ? pathname === item.url
                  : pathname === item.url ||
                    (pathname.startsWith(item.url + "/") &&
                      !group.items.some(
                        (other) =>
                          other.url.length > item.url.length &&
                          pathname.startsWith(other.url)
                      )));

              const colorScheme = getItemColorScheme(item.title, item.iconColor);

              if (!item.items || item.items.length === 0) {
                return (
                  <SidebarMenuItem key={item.title} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                    <SidebarMenuButton
                      tooltip={item.title}
                      asChild
                      isActive={active}
                      className={cn(
                        "h-10.5 px-2 rounded-2xl transition-all duration-200 group-data-[collapsible=icon]:size-9.5! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:mx-auto! group-data-[collapsible=icon]:justify-center!",
                        active ? "bg-sidebar-accent/80 shadow-2xs" : "hover:bg-sidebar-accent/50"
                      )}
                    >
                      <Link
                        href={item.url}
                        onClick={handleLinkClick}
                        className="flex items-center gap-2.5 w-full h-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:items-center"
                      >
                        {item.icon && (
                          <div
                            className={cn(
                              "flex items-center justify-center aspect-square rounded-xl shrink-0 transition-all duration-300 border shadow-2xs",
                              isCollapsed ? "h-8.5 w-8.5" : "h-7.5 w-7.5",
                              active ? colorScheme.active : colorScheme.inactive,
                              "group-hover/menu-button:scale-105"
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 aspect-square shrink-0" />
                          </div>
                        )}

                        <span
                          className={cn(
                            "truncate text-[12.5px] sm:text-[13px] tracking-tight leading-tight transition-all duration-150 group-data-[collapsible=icon]:hidden",
                            active
                              ? "font-bold text-sidebar-foreground"
                              : "font-medium text-sidebar-foreground/80 group-hover/menu-button:text-sidebar-foreground group-hover/menu-button:font-semibold"
                          )}
                        >
                          {item.title}
                        </span>

                        {/* Active indicator dot for expanded view */}
                        {active && !isCollapsed && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary ml-auto shrink-0 shadow-[0_0_6px_rgba(59,130,246,0.8)] group-data-[collapsible=icon]:hidden" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={active}
                  className="group/collapsible"
                >
                  <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={active}
                        className={cn(
                          "h-10.5 px-2 rounded-2xl transition-all duration-200 group-data-[collapsible=icon]:size-9.5! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:mx-auto! group-data-[collapsible=icon]:justify-center!",
                          active ? "bg-sidebar-accent/80 shadow-2xs" : "hover:bg-sidebar-accent/50"
                        )}
                      >
                        {item.icon && (
                          <div
                            className={cn(
                              "flex items-center justify-center aspect-square rounded-xl shrink-0 transition-all duration-300 border shadow-2xs",
                              isCollapsed ? "h-8.5 w-8.5" : "h-7.5 w-7.5",
                              active ? colorScheme.active : colorScheme.inactive,
                              "group-hover/menu-button:scale-105"
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 aspect-square shrink-0" />
                          </div>
                        )}
                        <span
                          className={cn(
                            "truncate text-[12.5px] sm:text-[13px] tracking-tight leading-tight transition-all duration-150 group-data-[collapsible=icon]:hidden",
                            active
                              ? "font-bold text-sidebar-foreground"
                              : "font-medium text-sidebar-foreground/80 group-hover/menu-button:text-sidebar-foreground group-hover/menu-button:font-semibold"
                          )}
                        >
                          {item.title}
                        </span>
                        <ChevronRight className="ml-auto h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 pt-1 space-y-1">
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.url}
                              className={cn(
                                "rounded-xl h-8.5 px-3 text-xs tracking-tight transition-colors duration-150",
                                pathname === subItem.url
                                  ? "font-bold text-primary"
                                  : "font-medium text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Link href={subItem.url} onClick={handleLinkClick}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
