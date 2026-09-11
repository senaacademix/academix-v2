import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getScheduleEventsDataAction } from "@/features/schedule-manager/actions/scheduleEventsActions";
import { ScheduleEventsManagerView } from "@/features/schedule-manager/components/events/ScheduleEventsManagerView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestión de Eventos del Horario | AcademiX",
  description: "Programación y cronograma de eventos institucionales para el horario académico.",
};

interface GestorScheduleEventsPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    programId?: string;
  }>;
}

export default async function GestorScheduleEventsPage({ params, searchParams }: GestorScheduleEventsPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || (session.user.role !== "gestor" && session.user.role !== "admin")) {
    redirect("/dashboard/student");
  }

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const cookieStore = await cookies();
  const cookieProgramId = cookieStore.get("academix_gestor_program_id")?.value;
  const effectiveProgramId = resolvedSearchParams?.programId || cookieProgramId;

  const data = await getScheduleEventsDataAction(id, effectiveProgramId);

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
