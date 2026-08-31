import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { 
  getSchedulesAction, 
  getAvailableGroupsAction 
} from "@/features/schedule-manager/actions/scheduleManagerActions";
import { ScheduleManagerView } from "@/features/schedule-manager/components/ScheduleManagerView";
import { gestorService } from "@/features/gestor/services/gestorService";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Malla de Horarios y Eventos | AcademiX",
  description: "Diseño y programación de horarios, asignación de franjas horarias y eventos de formación.",
};

export default async function GestorSchedulesPage({
  searchParams,
}: {
  searchParams?: Promise<{ programId?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || (session.user.role !== "gestor" && session.user.role !== "admin")) {
    redirect("/dashboard/student");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const programIdParam = resolvedSearchParams?.programId;

  const cookieStore = await cookies();
  const cookieProgramId = cookieStore.get("academix_gestor_program_id")?.value;
  let effectiveProgramId = programIdParam || cookieProgramId;

  if (session.user.role === "gestor" && !effectiveProgramId) {
    const gestorPrograms = await gestorService.getManagedPrograms(session.user.id);
    if (gestorPrograms.length === 1) {
      effectiveProgramId = gestorPrograms[0].id;
    } else {
      redirect("/dashboard/gestor");
    }
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
