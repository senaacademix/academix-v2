"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { revalidateCurrentPathAction } from "@/app/actions/refresh";
import { triggerClientRefreshListeners } from "@/lib/app-refresh";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function RefreshButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const spinning = isRefreshing || isPending;

  const handleRefresh = async () => {
    if (spinning) return;
    setIsRefreshing(true);

    try {
      await revalidateCurrentPathAction(pathname || "/dashboard");

      startTransition(() => {
        router.refresh();
      });

      await triggerClientRefreshListeners();
      toast.success("Datos actualizados", {
        id: "academix-app-refresh",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error al actualizar la vista:", error);
      toast.error("No se pudo actualizar la vista", {
        id: "academix-app-refresh",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={spinning}
          aria-label="Actualizar datos de la vista actual"
          className={cn(
            "h-8 w-8 shrink-0 opacity-60 hover:opacity-100 hover:bg-accent transition-all cursor-pointer",
            spinning && "opacity-100 text-primary"
          )}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4 transition-transform duration-500",
              spinning && "animate-spin text-primary"
            )}
          />
          <span className="sr-only">Actualizar datos</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{spinning ? "Actualizando..." : "Actualizar datos"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
