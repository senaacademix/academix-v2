"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleView } from "./ScheduleView";
import { TeacherAvailabilityView } from "./TeacherAvailabilityView";
import { TeacherQualificationsView } from "@/features/teacher/components/TeacherQualificationsView";
import { Calendar, Clock, BookOpen, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TeacherHelpModal } from "@/features/teacher/components/TeacherHelpModal";

export function ScheduleDashboard() {
  const [activeTab, setActiveTab] = useState("calendar");
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          <TabsList className="w-full sm:w-auto h-auto grid grid-cols-3 sm:flex sm:inline-flex bg-muted/60 dark:bg-muted/30 border border-border/80 p-1 sm:p-1.5 rounded-2xl gap-1 backdrop-blur-xl shadow-xs">
            <TabsTrigger
              value="calendar"
              className="w-full flex-1 rounded-xl flex items-center justify-center text-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-extrabold py-2 px-1 sm:px-4 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shadow-none data-[state=active]:shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Horario</span>
                <span className="hidden sm:inline">Mi Horario</span>
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="availability"
              className="w-full flex-1 rounded-xl flex items-center justify-center text-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-extrabold py-2 px-1 sm:px-4 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shadow-none data-[state=active]:shadow-xs"
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Jornada</span>
                <span className="hidden sm:inline">Mi Disponibilidad</span>
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="qualifications"
              className="w-full flex-1 rounded-xl flex items-center justify-center text-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-extrabold py-2 px-1 sm:px-4 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shadow-none data-[state=active]:shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Materias</span>
                <span className="hidden sm:inline">Mis Materias</span>
              </span>
            </TabsTrigger>
          </TabsList>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHelpOpen(true)}
                className="h-10 px-3.5 rounded-2xl border-border/70 bg-card hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all text-xs font-bold gap-1.5 text-muted-foreground shadow-2xs cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">¿Qué puedo hacer acá?</span>
                <span className="sm:hidden">Ayuda</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              className="bg-popover text-popover-foreground border border-border shadow-md text-xs font-semibold px-3 py-1.5 rounded-xl"
            >
              Guía de horarios, disponibilidad y asignaturas
            </TooltipContent>
          </Tooltip>
        </div>

        <TabsContent value="calendar" className="space-y-6 mt-0">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <ScheduleView />
          </motion.div>
        </TabsContent>

        <TabsContent value="availability" className="space-y-6 mt-0">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <TeacherAvailabilityView />
          </motion.div>
        </TabsContent>

        <TabsContent value="qualifications" className="space-y-6 mt-0">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <TeacherQualificationsView />
          </motion.div>
        </TabsContent>
      </Tabs>

      <TeacherHelpModal
        open={helpOpen}
        onOpenChange={setHelpOpen}
        initialTab="schedule"
      />
    </>
  );
}
