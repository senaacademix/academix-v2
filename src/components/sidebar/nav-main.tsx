"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
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

function getItemColorScheme(customColor?: NavItem["iconColor"]) {
  if (customColor) return customColor;

  return {
    inactive: "bg-primary/10 text-primary border-primary/15 group-hover/menu-button:bg-primary/15 group-hover/menu-button:border-primary/25",
    active: "bg-primary text-primary-foreground shadow-sm shadow-primary/30 border-transparent",
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
  const searchParams = useSearchParams();
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
              const itemPathname = item.url.split("?")[0];
              const isDashboard = itemPathname === "/dashboard";
              const active =
                item.isActive ||
                (isDashboard
                  ? pathname === itemPathname
                  : pathname === itemPathname ||
                    (pathname.startsWith(itemPathname + "/") &&
                      !group.items.some((other) => {
                        const otherPath = other.url.split("?")[0];
                        return (
                          otherPath.length > itemPathname.length &&
                          pathname.startsWith(otherPath)
                        );
                      })));

              const colorScheme = getItemColorScheme(item.iconColor);

              if (!item.items || item.items.length === 0) {
                return (
                  <SidebarMenuItem key={item.title} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                    <SidebarMenuButton
                      tooltip={item.title}
                      asChild
                      isActive={active}
                      className={cn(
                        "h-10.5 px-2.5 rounded-2xl transition-all duration-200 group-data-[collapsible=icon]:size-9.5! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:mx-auto! group-data-[collapsible=icon]:justify-center!",
                        active 
                          ? "bg-primary/10 text-primary font-bold border border-primary/25 shadow-2xs" 
                          : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground border border-transparent"
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
                            "whitespace-nowrap text-[12.5px] sm:text-[13px] tracking-tight leading-tight transition-all duration-150 group-data-[collapsible=icon]:hidden",
                            active
                              ? "font-bold text-primary"
                              : "font-medium text-sidebar-foreground/80 group-hover/menu-button:text-sidebar-foreground group-hover/menu-button:font-semibold"
                          )}
                        >
                          {item.title}
                        </span>

                        {/* Active indicator dot for expanded view */}
                        {active && !isCollapsed && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary ml-auto shrink-0 shadow-[0_0_6px_var(--primary)] group-data-[collapsible=icon]:hidden" />
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
                          "h-10.5 px-2.5 rounded-2xl transition-all duration-200 group-data-[collapsible=icon]:size-9.5! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:mx-auto! group-data-[collapsible=icon]:justify-center!",
                          active 
                            ? "bg-primary/10 text-primary font-bold border border-primary/25 shadow-2xs" 
                            : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground border border-transparent"
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
                            "whitespace-nowrap text-[12.5px] sm:text-[13px] tracking-tight leading-tight transition-all duration-150 group-data-[collapsible=icon]:hidden",
                            active
                              ? "font-bold text-primary"
                              : "font-medium text-sidebar-foreground/80 group-hover/menu-button:text-sidebar-foreground group-hover/menu-button:font-semibold"
                          )}
                        >
                          {item.title}
                        </span>
                        <ChevronRight className={cn(
                          "ml-auto h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden",
                          active ? "text-primary" : "text-muted-foreground"
                        )} />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 pt-1 space-y-1">
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const isSubActive = (() => {
                            if (!subItem.url.includes("?")) {
                              return pathname === subItem.url && (!searchParams || !searchParams.get("tool"));
                            }
                            const [subPath, subQuery] = subItem.url.split("?");
                            if (pathname !== subPath) return false;
                            const targetParams = new URLSearchParams(subQuery);
                            for (const [key, val] of targetParams.entries()) {
                              if (searchParams?.get(key) !== val) return false;
                            }
                            return true;
                          })();

                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isSubActive}
                                className={cn(
                                  "rounded-xl h-8.5 px-3 text-xs tracking-tight transition-colors duration-150",
                                  isSubActive
                                    ? "font-bold text-primary bg-primary/10 border border-primary/20"
                                    : "font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                                )}
                              >
                                <Link href={subItem.url} onClick={handleLinkClick}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
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
