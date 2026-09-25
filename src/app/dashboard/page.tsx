import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import HomePage from "@/features/home/components/HomePage";
import { getFormattedTodayDate } from "@/lib/dateUtils";
import { getDashboardMetricsAction } from "@/features/home/actions/dashboardActions";
import { announcementService } from "@/features/announcements/services/announcementService";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (session?.user?.role === "admin" || session?.user?.role === "observer") {
    redirect("/dashboard/admin");
  }
  
  if (session?.user?.role === "gestor") {
    redirect("/dashboard/gestor");
  }
  
  const reqHeaders = await headers();
  const timezone = reqHeaders.get("x-vercel-ip-timezone") || "America/Bogota";
  const initialDate = getFormattedTodayDate(timezone);
  const [initialMetrics, initialAnnouncements] = await Promise.all([
    getDashboardMetricsAction(),
    announcementService.getActiveAnnouncements()
  ]);

  return (
    <HomePage 
      initialUserName={session?.user?.name} 
      initialUserRole={session?.user?.role} 
      initialDate={initialDate}
      initialMetrics={initialMetrics}
      initialAnnouncements={initialAnnouncements}
    />
  );
}
