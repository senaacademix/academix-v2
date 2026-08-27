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

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    badge?: number;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup className="py-3 px-2">
      <SidebarGroupLabel className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 mb-2 select-none group-data-[collapsible=icon]:hidden">
        Navegación
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-1.5">
        {items.map((item) => {
          const isDashboard = item.url === "/dashboard";
          const active =
            item.isActive ||
            (isDashboard
              ? pathname === item.url
              : pathname === item.url ||
                (pathname.startsWith(item.url + "/") &&
                  !items.some(
                    (other) =>
                      other.url.length > item.url.length &&
                      pathname.startsWith(other.url)
                  )));

          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={active}
                  className="h-10 px-3 rounded-xl transition-all duration-200 group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:mx-auto"
                >
                  <Link
                    href={item.url}
                    onClick={handleLinkClick}
                    className="flex items-center gap-3 w-full h-full group-data-[collapsible=icon]:justify-center"
                  >
                    {item.icon && (
                      <item.icon
                        className={cn(
                          "h-4.5 w-4.5 shrink-0 transition-transform duration-200",
                          active
                            ? "text-primary group-data-[collapsible=icon]:text-primary-foreground scale-105"
                            : "text-muted-foreground group-hover/menu-button:text-foreground"
                        )}
                      />
                    )}

                    <span className="truncate font-semibold text-xs sm:text-sm group-data-[collapsible=icon]:hidden">
                      {item.title}
                    </span>

                    {/* Subtle active indicator dot for expanded view */}
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
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={active}
                    className="h-10 px-3 rounded-xl transition-all duration-200 group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:mx-auto flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
                  >
                    {item.icon && (
                      <item.icon
                        className={cn(
                          "h-4.5 w-4.5 shrink-0 transition-transform duration-200",
                          active
                            ? "text-primary group-data-[collapsible=icon]:text-primary-foreground scale-105"
                            : "text-muted-foreground group-hover/menu-button:text-foreground"
                        )}
                      />
                    )}
                    <span className="truncate font-semibold text-xs sm:text-sm group-data-[collapsible=icon]:hidden">
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
                          className="rounded-lg h-8 px-2.5 text-xs font-medium"
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
  );
}
