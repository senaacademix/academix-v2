import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getScheduleEventsDataAction } from "@/features/schedule-manager/actions/scheduleEventsActions";
import { ScheduleEventsManagerView } from "@/features/schedule-manager/components/events/ScheduleEventsManagerView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestión de Eventos del Horario | AcademiX",
  description: "Programación y cronograma de eventos institucionales para el horario académico.",
};

interface ScheduleEventsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ScheduleEventsPage({ params }: ScheduleEventsPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== "admin") {
    redirect("/dashboard/student");
  }

  const { id } = await params;
  const data = await getScheduleEventsDataAction(id);

  if (!data) {
    notFound();
  }

  return (
    <ScheduleEventsManagerView
      schedule={data.schedule}
      groups={data.groups || []}
      initialEvents={data.events}
    />
  );
}
