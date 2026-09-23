import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TeacherDashboard } from "@/features/teacher/components/TeacherDashboard";
import { courseService } from "@/features/teacher/services/courseService";

import prisma from "@/lib/prisma";

import { getFormattedTodayDate, isScheduleCurrent } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as any;
  const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

  if (!session || (role !== "teacher" && role !== "admin")) {
    redirect("/signin");
  }

  const [courses, groups, academicSchedules, settings] = await Promise.all([
    courseService.getTeacherCourses(session.user.id),
    courseService.getTeacherGroups(session.user.id),
    prisma.academicSchedule.findMany({
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
        isPublished: true,
      },
    }),
    prisma.systemSettings.findUnique({
      where: { id: "settings" },
      select: {
        scheduleStartDate: true,
        scheduleEndDate: true,
      },
    }),
  ]);

  // Identificar el Horario Vigente oficial (por rango actual en Colombia, activo o más reciente)
  const activeSchedule =
    academicSchedules.find((s) => isScheduleCurrent(s.startDate, s.endDate)) ||
    academicSchedules.find((s) => s.isActive) ||
    academicSchedules[0] ||
    null;

  const effectiveScheduleStart = activeSchedule?.startDate
    ? activeSchedule.startDate.toISOString()
    : settings?.scheduleStartDate
    ? settings.scheduleStartDate.toISOString()
    : null;

  const effectiveScheduleEnd = activeSchedule?.endDate
    ? activeSchedule.endDate.toISOString()
    : settings?.scheduleEndDate
    ? settings.scheduleEndDate.toISOString()
    : null;

  const reqHeaders = await headers();
  const timezone = reqHeaders.get("x-vercel-ip-timezone") || "America/Bogota";

  const currentDate = new Date().toISOString();
  const formattedDate = getFormattedTodayDate(timezone);

  return (
    <TeacherDashboard 
      courses={courses} 
      groups={groups}
      currentDate={currentDate} 
      teacherName={session.user.name}
      formattedDate={formattedDate}
      scheduleStartDate={effectiveScheduleStart}
      scheduleEndDate={effectiveScheduleEnd}
    />
  );
}
