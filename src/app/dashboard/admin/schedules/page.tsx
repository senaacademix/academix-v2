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
  title: "Programación de Horarios y Eventos | AcademiX",
  description: "Crea horarios con fechas de inicio y fin, asigna grupos, configura franjas horarias y gestiona eventos institucionales.",
};

export default async function AdminSchedulesPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || (session.user.role !== "admin" && session.user.role !== "gestor" && session.user.role !== "observer")) {
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
