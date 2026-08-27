import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getScheduleBuilderDataAction } from "@/features/schedule-manager/actions/scheduleBuilderActions";
import { ScheduleGeneralBuilderView } from "@/features/schedule-manager/components/schedule-grid/ScheduleGeneralBuilderView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestión de Horario por Grupos | AcademiX",
  description: "Configuración y programación de clases por grupo, trimestre curricular y asignación docente.",
};

interface GestorScheduleBuilderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GestorScheduleBuilderPage({ params }: GestorScheduleBuilderPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || (session.user.role !== "gestor" && session.user.role !== "admin")) {
    redirect("/dashboard/student");
  }

  const { id } = await params;
  const builderData = await getScheduleBuilderDataAction(id);

  if (!builderData) {
    notFound();
  }

  return <ScheduleGeneralBuilderView initialData={builderData} />;
}
