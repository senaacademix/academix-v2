"use client";

import React, { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useGestorProgram } from "@/features/gestor/context/GestorProgramContext";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";

export function DashboardSidebarTrigger() {
    const [mounted, setMounted] = useState(false);
    const { data: session } = authClient.useSession();
    const role = getRoleFromUser(session?.user);
    const { hasSelectedProgram, managedPrograms } = useGestorProgram();
    const isSingleGestorProgram = managedPrograms?.length === 1;

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <SidebarTrigger className="-ml-1" />;
    }

    // Hide sidebar trigger if gestor has not selected a program yet (and has multiple/no programs)
    if (role === "gestor" && !hasSelectedProgram && !isSingleGestorProgram) {
        return null;
    }

    return <SidebarTrigger className="-ml-1" />;
}
