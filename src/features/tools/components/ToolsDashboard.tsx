"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ToolsHub } from "./ToolsHub";
import { SofiaReportsTool } from "./SofiaReportsTool";
import { TeacherRouletteTool } from "./TeacherRouletteTool";
import { TeacherGroupGeneratorTool } from "./TeacherGroupGeneratorTool";
import { TeacherVoceroElectionTool } from "./TeacherVoceroElectionTool";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOOLS_REGISTRY } from "../constants/toolsRegistry";

interface ToolsDashboardProps {
    initialGroups?: any[];
    userRole?: string;
}

function ToolsDashboardContent({ initialGroups = [], userRole = "gestor" }: ToolsDashboardProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const selectedToolId = searchParams.get("tool");

    const handleSelectTool = (toolId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tool", toolId);
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleBackToHub = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("tool");
        params.delete("groupId");
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    };

    // Validar si la herramienta solicitada existe y está permitida para el rol actual
    const currentTool = TOOLS_REGISTRY.find((t) => t.id === selectedToolId);
    const isAllowed = currentTool && (!currentTool.allowedRoles || currentTool.allowedRoles.includes(userRole as any));

    if (selectedToolId && isAllowed) {
        if (selectedToolId === "sofia-reports") {
            return (
                <div className="h-full flex-1 flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-300">
                    <SofiaReportsTool onBack={handleBackToHub} />
                </div>
            );
        }

        if (selectedToolId === "roulette") {
            return (
                <div className="h-full flex-1 flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-300">
                    <TeacherRouletteTool groups={initialGroups} onBack={handleBackToHub} />
                </div>
            );
        }

        if (selectedToolId === "group-generator") {
            return (
                <div className="h-full flex-1 flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-300">
                    <TeacherGroupGeneratorTool groups={initialGroups} onBack={handleBackToHub} />
                </div>
            );
        }

        if (selectedToolId === "vocero-election") {
            return (
                <div className="h-full flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
                    <TeacherVoceroElectionTool groups={initialGroups} onBack={handleBackToHub} />
                </div>
            );
        }
    }

    return (
        <div className="w-full h-full flex-1 flex flex-col min-h-0">
            <ToolsHub onSelectTool={handleSelectTool} userRole={userRole} />
        </div>
    );
}

export function ToolsDashboard({ initialGroups = [], userRole = "gestor" }: ToolsDashboardProps) {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center p-16 text-muted-foreground text-sm gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Cargando panel de herramientas...</span>
                </div>
            }
        >
            <ToolsDashboardContent initialGroups={initialGroups} userRole={userRole} />
        </Suspense>
    );
}
