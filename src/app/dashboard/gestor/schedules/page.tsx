import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { 
  getSchedulesAction, 
  getAvailableGroupsAction 
} from "@/features/schedule-manager/actions/scheduleManagerActions";
import { ScheduleManagerView } from "@/features/schedule-manager/components/ScheduleManagerView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Malla de Horarios y Eventos | AcademiX",
  description: "Diseño y programación de horarios, asignación de franjas horarias y eventos de formación.",
};

export default async function GestorSchedulesPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || (session.user.role !== "gestor" && session.user.role !== "admin")) {
    redirect("/dashboard/student");
  }

  const [schedules, availableGroups] = await Promise.all([
    getSchedulesAction(),
    getAvailableGroupsAction(),
  ]);

  return (
    <ScheduleManagerView
      initialSchedules={schedules}
      availableGroups={availableGroups}
    />
  );
}
