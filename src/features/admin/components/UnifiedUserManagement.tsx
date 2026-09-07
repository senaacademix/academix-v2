"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck, GraduationCap, School, ClipboardList, BookOpen } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { AdminUsersManagement } from "./AdminUsersManagement";
import { TeacherUsersManagement, TeacherUser } from "./TeacherUsersManagement";
import { AdminImprovementPlans } from "./AdminImprovementPlans";
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
  teacherData: {
    initialTeachers: TeacherUser[];
  };
  adminData: {
    initialUsers: any[];
    programs: Array<{ id: string; name: string; groups?: Array<{ id: string; name: string; programId: string; categoria?: string }> }>;
    currentUserId: string;
  };
  currentUserRole?: string;
  defaultTab?: "students" | "teachers" | "admins";
  defaultSubTab?: "directory" | "plans";
}

export function UnifiedUserManagement({
  studentData,
  teacherData,
  adminData,
  currentUserRole = "admin",
  defaultTab = "students",
  defaultSubTab = "directory",
}: UnifiedUserManagementProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const currentTabFromUrl =
    rawTab === "teachers" ? "teachers" : rawTab === "admins" ? "admins" : "students";

  const rawSubTab = searchParams.get("subtab");
  const currentSubTabFromUrl = rawSubTab === "plans" ? "plans" : "directory";

  const [activeTab, setActiveTab] = useState<string>(
    rawTab ? currentTabFromUrl : defaultTab
  );
  const [activeStudentSubTab, setActiveStudentSubTab] = useState<string>(
    rawSubTab ? currentSubTabFromUrl : defaultSubTab
  );

  const basePath = currentUserRole === "gestor" ? "/dashboard/gestor/users" : "/dashboard/admin/users";

  const updateUrl = (tab: string, subtab?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "teachers") {
      params.set("tab", "teachers");
      params.delete("subtab");
    } else if (tab === "admins") {
      params.set("tab", "admins");
      params.delete("subtab");
    } else {
      params.delete("tab");
      if (subtab === "plans") {
        params.set("subtab", "plans");
      } else {
        params.delete("subtab");
      }
    }
    const queryString = params.toString();
    router.replace(`${basePath}${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    updateUrl(val, activeStudentSubTab);
  };

  const handleStudentSubTabChange = (subVal: string) => {
    setActiveStudentSubTab(subVal);
    updateUrl("students", subVal);
  };

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

  return (
    <div className="space-y-6">
      {/* Unified Top Header with Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Gestión de Usuarios
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Centro de control institucional para estudiantes, docentes y administradores.
                </p>
              </div>
            </div>
          </div>

          <TabsList className="inline-flex max-w-full overflow-x-auto scrollbar-none w-auto h-auto rounded-2xl bg-muted/60 p-1.5 gap-1.5 self-start md:self-auto border border-border/50 shadow-xs">
            {/* Tab 1: Estudiantes */}
            <TabsTrigger
              value="students"
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all shrink-0"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Estudiantes</span>
              <Badge
                variant="secondary"
                className="ml-1 text-[11px] px-2 py-0.5 font-bold bg-primary/10 text-primary border-primary/20 rounded-lg"
              >
                {studentData.totalCount}
              </Badge>
            </TabsTrigger>

            {/* Tab 2: Docentes */}
            <TabsTrigger
              value="teachers"
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all shrink-0"
            >
              <School className="w-4 h-4 text-indigo-600" />
              <span>Docentes</span>
              <Badge
                variant="secondary"
                className="ml-1 text-[11px] px-2 py-0.5 font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 rounded-lg"
              >
                {teacherData.initialTeachers.length}
              </Badge>
            </TabsTrigger>

            {/* Tab 3: Administradores y Gestores */}
            {currentUserRole === "admin" && (
              <TabsTrigger
                value="admins"
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all shrink-0"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Administradores y Gestores</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[11px] px-2 py-0.5 font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 rounded-lg"
                >
                  {adminData.initialUsers.length}
                </Badge>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Tab 1: Estudiantes (con sub-pestañas para Directorio vs Planes de Mejoramiento) */}
        <TabsContent value="students" className="m-0 focus-visible:outline-hidden space-y-6">
          <Tabs
            value={activeStudentSubTab}
            onValueChange={handleStudentSubTabChange}
            className="w-full space-y-5"
          >
            <div className="flex items-center justify-between w-full overflow-x-auto scrollbar-none">
              <TabsList className="inline-flex max-w-full overflow-x-auto scrollbar-none w-auto h-auto rounded-xl bg-muted/50 p-1 gap-1 border border-border/40">
                <TabsTrigger
                  value="directory"
                  className="px-3 py-1.5 sm:px-3.5 rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs shrink-0"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Directorio y Matrícula ({studentData.totalCount})</span>
                </TabsTrigger>

                <TabsTrigger
                  value="plans"
                  className="px-3 py-1.5 sm:px-3.5 rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-rose-600 data-[state=active]:shadow-xs shrink-0"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-rose-600" />
                  <span>Planes de Mejoramiento ({studentData.plans.length})</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Sub-Pestaña A: Directorio de Estudiantes */}
            <TabsContent value="directory" className="m-0 focus-visible:outline-hidden">
              <UserManagement
                initialUsers={studentData.initialUsers}
                totalCount={studentData.totalCount}
                initialGroupId={studentData.initialGroupId}
                initialGroups={studentData.initialGroups}
                initialPrograms={studentData.initialPrograms}
                isObserver={studentData.isObserver}
                hideMainHeader={true}
              />
            </TabsContent>

            {/* Sub-Pestaña B: Planes de Mejoramiento */}
            <TabsContent value="plans" className="m-0 focus-visible:outline-hidden">
              <AdminImprovementPlans plans={studentData.plans} hideMainHeader={true} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Tab 2: Docentes */}
        <TabsContent value="teachers" className="m-0 focus-visible:outline-hidden">
          <TeacherUsersManagement
            initialTeachers={teacherData.initialTeachers}
            hideMainHeader={true}
          />
        </TabsContent>

        {/* Tab 3: Coordinadores y Gestores */}
        {currentUserRole === "admin" && (
          <TabsContent value="admins" className="m-0 focus-visible:outline-hidden">
            <AdminUsersManagement
              initialUsers={adminData.initialUsers}
              programs={adminData.programs}
              currentUserId={adminData.currentUserId}
              hideMainHeader={true}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
