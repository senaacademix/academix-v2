"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ToolsHub } from "./ToolsHub";
import { SofiaReportsTool } from "./SofiaReportsTool";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

function ToolsDashboardContent() {
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
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    };

    if (selectedToolId === "sofia-reports") {
        return (
            <div className="space-y-4 animate-in fade-in duration-300">
                <SofiaReportsTool onBack={handleBackToHub} />
            </div>
        );
    }

    return <ToolsHub onSelectTool={handleSelectTool} />;
}

export function ToolsDashboard() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center p-16 text-muted-foreground text-sm gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Cargando panel de herramientas...</span>
                </div>
            }
        >
            <ToolsDashboardContent />
        </Suspense>
    );
}
