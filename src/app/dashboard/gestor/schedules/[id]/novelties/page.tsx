import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getScheduleNoveltiesDataAction } from "@/features/schedule-manager/actions/scheduleNoveltyActions";
import { ScheduleNoveltiesManagerView } from "@/features/schedule-manager/components/novelties/ScheduleNoveltiesManagerView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Novedades de Horario | AcademiX",
  description: "Registro y consulta de contingencias y novedades de horarios académicos.",
};

interface GestorScheduleNoveltiesPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GestorScheduleNoveltiesPage({ params }: GestorScheduleNoveltiesPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || (session.user.role !== "gestor" && session.user.role !== "admin")) {
    redirect("/dashboard/student");
  }

  const { id } = await params;
  const data = await getScheduleNoveltiesDataAction(id);

  if (!data) {
    notFound();
  }

  return (
    <ScheduleNoveltiesManagerView
      schedule={data.schedule}
      groups={data.groups}
      environments={data.environments}
      initialNovelties={data.novelties}
      baseUrl="/dashboard/gestor/schedules"
    />
  );
}
