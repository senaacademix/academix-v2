import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getScheduleBuilderDataAction } from "@/features/schedule-manager/actions/scheduleBuilderActions";
import { ScheduleGeneralBuilderView } from "@/features/schedule-manager/components/schedule-grid/ScheduleGeneralBuilderView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestión de Horario por Grupos | AcademiX",
  description: "Configuración y programación de clases por grupo, trimestre curricular y asignación de instructores.",
};

interface ScheduleBuilderPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    programId?: string;
  }>;
}

export default async function ScheduleBuilderPage({ params, searchParams }: ScheduleBuilderPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || (session.user.role !== "admin" && session.user.role !== "gestor" && session.user.role !== "observer")) {
    redirect("/dashboard/student");
  }

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const effectiveProgramId = resolvedSearchParams?.programId;

  const builderData = await getScheduleBuilderDataAction(id, effectiveProgramId);

  if (!builderData) {
    notFound();
  }

  const isObserver = session.user.role === "observer";

  return (
    <ScheduleGeneralBuilderView
      initialData={builderData}
      isReadOnly={isObserver}
      isObserver={isObserver}
    />
  );
}
