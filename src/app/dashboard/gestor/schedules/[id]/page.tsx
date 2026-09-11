import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
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
  searchParams?: Promise<{
    programId?: string;
  }>;
}

export default async function GestorScheduleBuilderPage({ params, searchParams }: GestorScheduleBuilderPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || (session.user.role !== "gestor" && session.user.role !== "admin")) {
    redirect("/dashboard/student");
  }

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const cookieStore = await cookies();
  const cookieProgramId = cookieStore.get("academix_gestor_program_id")?.value;
  const effectiveProgramId = resolvedSearchParams?.programId || cookieProgramId;

  const builderData = await getScheduleBuilderDataAction(id, effectiveProgramId);

  if (!builderData) {
    notFound();
  }

  return <ScheduleGeneralBuilderView initialData={builderData} />;
}
