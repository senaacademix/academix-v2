import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { StudentDashboard } from "@/features/student/components/StudentDashboard";
import { courseService } from "@/features/teacher/services/courseService";
import { getAvailableThemes } from "@/app/actions/themes";

import { getFormattedTodayDate } from "@/lib/dateUtils";

import prisma from "@/lib/prisma";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "student") {
    redirect("/signin");
  }

  const [availableCourses, myEnrollments, pendingEnrollments, themes, studentUserData] = await Promise.all([
    courseService.getAllCourses(),
    courseService.getStudentEnrollments(session.user.id),
    courseService.getStudentPendingEnrollments(session.user.id),
    getAvailableThemes(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        group: {
          select: {
            id: true,
            name: true,
            program: {
              select: {
                id: true,
                name: true,
                timelines: {
                  select: { id: true, name: true, isDefault: true }
                }
              }
            },
            scheduleSlots: {
              include: {
                period: {
                  include: {
                    timeline: {
                      select: { id: true, name: true }
                    }
                  }
                },
                academicSchedule: {
                  select: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true,
                    isActive: true,
                    isPublished: true
                  }
                }
              }
            }
          }
        }
      }
    })
  ]);

  const reqHeaders = await headers();
  const timezone = reqHeaders.get("x-vercel-ip-timezone") || "America/Bogota";
  const formattedDate = getFormattedTodayDate(timezone);

  return <StudentDashboard
    availableCourses={availableCourses}
    myEnrollments={myEnrollments}
    studentName={session.user.name}
    pendingEnrollments={pendingEnrollments}
    themes={themes}
    formattedDate={formattedDate}
    studentGroup={studentUserData?.group || null}
  />;
}
