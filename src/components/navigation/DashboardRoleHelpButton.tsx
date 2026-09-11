"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

import { TeacherHelpModal, TeacherTabKey } from "@/features/teacher/components/TeacherHelpModal";
import { StudentHelpModal, StudentTabKey } from "@/features/student/components/StudentHelpModal";
import { AdminDashboardHelpModal, AdminDashboardTabKey } from "@/features/admin/components/AdminDashboardHelpModal";
import { AcademicTabsHelpModal, AcademicTabKey } from "@/features/admin/components/AcademicTabsHelpModal";
import { UsersHelpModal, UsersTabKey } from "@/features/admin/components/UsersHelpModal";
import { ScheduleHelpModal } from "@/features/schedule-manager/components/ScheduleHelpModal";

export function DashboardRoleHelpButton() {
  const pathname = usePathname() || "";
  const { data: session } = authClient.useSession();
  const role = session?.user ? getRoleFromUser(session.user) : null;

  // Modal open states
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [teacherInitialTab, setTeacherInitialTab] = useState<TeacherTabKey>("attendance");

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentInitialTab, setStudentInitialTab] = useState<StudentTabKey>("overview");

  const [adminDashModalOpen, setAdminDashModalOpen] = useState(false);
  const [adminDashInitialTab, setAdminDashInitialTab] = useState<AdminDashboardTabKey>("overview");

  const [academicModalOpen, setAcademicModalOpen] = useState(false);
  const [academicInitialTab, setAcademicInitialTab] = useState<AcademicTabKey>("overview");

  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [usersInitialTab, setUsersInitialTab] = useState<UsersTabKey>("students");

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const handleClick = () => {
    // 1. Teacher Routes
    if (pathname.startsWith("/dashboard/teacher") || role === "teacher") {
      if (pathname.includes("/schedule")) {
        setTeacherInitialTab("schedule");
      } else if (pathname.includes("/attendance")) {
        setTeacherInitialTab("attendance");
      } else {
        setTeacherInitialTab("attendance");
      }
      setTeacherModalOpen(true);
      return;
    }

    // 2. Student Routes
    if (pathname.startsWith("/dashboard/student") || role === "student") {
      if (pathname.includes("/schedule")) {
        setStudentInitialTab("schedule");
      } else if (pathname.includes("/attendance")) {
        setStudentInitialTab("attendance");
      } else if (pathname.includes("/evaluations")) {
        setStudentInitialTab("evaluations");
      } else if (pathname.includes("/records")) {
        setStudentInitialTab("attendance");
      } else {
        setStudentInitialTab("overview");
      }
      setStudentModalOpen(true);
      return;
    }

    // 3. Admin / Gestor Routes
    if (pathname.includes("/courses")) {
      setAcademicInitialTab("overview");
      setAcademicModalOpen(true);
      return;
    }

    if (pathname.includes("/users")) {
      setUsersInitialTab("students");
      setUsersModalOpen(true);
      return;
    }

    if (pathname.includes("/schedules")) {
      setScheduleModalOpen(true);
      return;
    }

    // Default for Admin/Gestor Dashboard
    if (role === "gestor") {
      setAdminDashInitialTab("programs");
    } else {
      setAdminDashInitialTab("overview");
    }
    setAdminDashModalOpen(true);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleClick}
            className="h-8 w-8 rounded-xl border-border/70 bg-background/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all text-muted-foreground shadow-2xs cursor-pointer"
            aria-label="¿Qué puedo hacer acá? Guía interactiva"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          className="bg-popover text-popover-foreground border border-border shadow-md text-xs font-semibold px-3 py-1.5 rounded-xl"
        >
          ¿Qué puedo hacer acá? Guía interactiva
        </TooltipContent>
      </Tooltip>

      {/* Teacher Help Modal */}
      <TeacherHelpModal
        open={teacherModalOpen}
        onOpenChange={setTeacherModalOpen}
        initialTab={teacherInitialTab}
      />

      {/* Student Help Modal */}
      <StudentHelpModal
        open={studentModalOpen}
        onOpenChange={setStudentModalOpen}
        initialTab={studentInitialTab}
      />

      {/* Admin / Gestor Dashboard Help Modal */}
      <AdminDashboardHelpModal
        open={adminDashModalOpen}
        onOpenChange={setAdminDashModalOpen}
        initialTab={adminDashInitialTab}
      />

      {/* Academic Malla Curricular Modal */}
      <AcademicTabsHelpModal
        open={academicModalOpen}
        onOpenChange={setAcademicModalOpen}
        activeTab={academicInitialTab}
      />

      {/* Unified Users Management Modal */}
      <UsersHelpModal
        open={usersModalOpen}
        onOpenChange={setUsersModalOpen}
        activeTab={usersInitialTab}
        showAdminsTab={role === "admin"}
      />

      {/* Schedules Help Modal */}
      <ScheduleHelpModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
      />
    </>
  );
}
