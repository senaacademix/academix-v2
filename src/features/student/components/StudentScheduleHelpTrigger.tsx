"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { StudentHelpModal } from "./StudentHelpModal";

export function StudentScheduleHelpTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="gap-2 rounded-2xl h-11 px-4 text-xs font-bold border-border/80 text-foreground bg-background/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary shadow-2xs transition-all cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">¿Qué puedo hacer acá?</span>
            <span className="sm:hidden">Ayuda</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          className="bg-popover text-popover-foreground border border-border shadow-md text-xs font-semibold px-3 py-1.5 rounded-xl"
        >
          Guía de horarios semanales y eventos
        </TooltipContent>
      </Tooltip>

      <StudentHelpModal open={open} onOpenChange={setOpen} initialTab="schedule" />
    </>
  );
}
