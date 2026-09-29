"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, GraduationCap, ClipboardList, HelpCircle } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { AdminUsersManagement } from "./AdminUsersManagement";
import { TeacherUser } from "./TeacherUsersManagement";
import { AdminImprovementPlans } from "./AdminImprovementPlans";
import { UsersHelpModal } from "./UsersHelpModal";
import { useRouter, useSearchParams } from "next/navigation";

interface UnifiedUserManagementProps {
  studentData: {
    initialUsers: any[];
    totalCount: number;
    initialGroupId?: string;
    initialGroups?: Array<{ id: string; name: string; programId?: string; categoria?: string }>;
    initialPrograms?: Array<{ id: string; name: string }>;
    isObserver?: boolean;
    plans: any[];
  };
  teacherData?: {
    initialTeachers?: TeacherUser[];
    programId?: string;
    programs?: Array<{ id: string; name: string }>;
  };
  adminData: {
    initialUsers: any[];
    programs: Array<{ id: string; name: string; groups?: Array<{ id: string; name: string; programId: string; categoria?: string }> }>;
    currentUserId: string;
  };
  currentUserRole?: string;
  defaultTab?: string;
  defaultSubTab?: string;
}

export function UnifiedUserManagement({
  studentData,
  adminData,
  currentUserRole = "admin",
  defaultSubTab = "directory",
}: UnifiedUserManagementProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If role is admin, show AdminUsersManagement directly
  if (currentUserRole === "admin") {
    return (
      <div className="space-y-6">
        <AdminUsersManagement
          initialUsers={adminData.initialUsers}
          programs={adminData.programs}
          currentUserId={adminData.currentUserId}
          hideMainHeader={false}
        />
      </div>
    );
  }

  const rawSubTab = searchParams.get("subtab");
  const rawTab = searchParams.get("tab");
  const initialActive = rawSubTab === "plans" || rawTab === "plans" ? "plans" : (rawSubTab || defaultSubTab || "directory");

  const [activeTab, setActiveTab] = useState<string>(initialActive);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Reactive counters for students
  const [studentsCount, setStudentsCount] = useState<number>(studentData.totalCount);

  React.useEffect(() => {
    setStudentsCount(studentData.totalCount);
  }, [studentData.totalCount]);

  React.useEffect(() => {
    if (rawSubTab === "plans" || rawTab === "plans") {
      setActiveTab("plans");
    } else {
      setActiveTab("directory");
    }
  }, [rawSubTab, rawTab]);

  const basePath = currentUserRole === "gestor" ? "/dashboard/gestor/users" : "/dashboard/admin/users";

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    if (val === "plans") {
      params.set("subtab", "plans");
    } else {
      params.delete("subtab");
    }
    const queryString = params.toString();
    router.replace(`${basePath}${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Unified Top Header with Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Gestión de Aprendices
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Directorio de matrícula de aprendices y planes de mejoramiento institucional.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <TabsList className="inline-flex max-w-full overflow-x-auto scrollbar-none w-auto h-auto rounded-2xl bg-muted/60 dark:bg-muted/30 p-1.5 gap-1.5 border border-border/60 shadow-2xs">
              {/* Tab 1: Directorio y Matrícula */}
              <TabsTrigger
                value="directory"
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold gap-2 text-muted-foreground hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs data-[state=active]:border-border/70 border border-transparent transition-all shrink-0"
              >
                <Users className="w-4 h-4" />
                <span>Directorio y Matrícula</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[11px] px-2 py-0.5 font-bold bg-primary/10 text-primary border-primary/20 rounded-lg"
                >
                  {studentsCount}
                </Badge>
              </TabsTrigger>

              {/* Tab 2: Planes de Mejoramiento */}
              <TabsTrigger
                value="plans"
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold gap-2 text-muted-foreground hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs data-[state=active]:border-border/70 border border-transparent transition-all shrink-0"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Planes de Mejoramiento</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[11px] px-2 py-0.5 font-bold bg-primary/10 text-primary border-primary/20 rounded-lg"
                >
                  {studentData.plans.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsHelpOpen(true)}
                  className="w-10 h-10 rounded-2xl border-border/80 hover:bg-muted text-foreground shadow-2xs hover:scale-105 transition-all shrink-0"
                >
                  <HelpCircle className="w-4.5 h-4.5 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">¿Qué puedo hacer acá? Guía de Aprendices</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Tab 1: Directorio y Matrícula */}
        <TabsContent value="directory" className="m-0 focus-visible:outline-hidden space-y-6 animate-in fade-in-50 duration-200">
          <UserManagement
            initialUsers={studentData.initialUsers}
            totalCount={studentData.totalCount}
            initialGroupId={studentData.initialGroupId}
            initialGroups={studentData.initialGroups}
            initialPrograms={studentData.initialPrograms}
            isObserver={studentData.isObserver}
            hideMainHeader={true}
            onHelpClick={() => setIsHelpOpen(true)}
            onUserCreated={() => setStudentsCount((prev) => prev + 1)}
          />
        </TabsContent>

        {/* Tab 2: Planes de Mejoramiento */}
        <TabsContent value="plans" className="m-0 focus-visible:outline-hidden space-y-6 animate-in fade-in-50 duration-200">
          <AdminImprovementPlans plans={studentData.plans} hideMainHeader={true} />
        </TabsContent>
      </Tabs>

      {/* Modal de Ayuda para Gestión de Aprendices */}
      <UsersHelpModal
        open={isHelpOpen}
        onOpenChange={setIsHelpOpen}
        activeTab={activeTab === "plans" ? "plans" : "students"}
        showAdminsTab={false}
        showTeachersTab={false}
        programName={studentData.initialPrograms?.[0]?.name}
      />
    </div>
  );
}
