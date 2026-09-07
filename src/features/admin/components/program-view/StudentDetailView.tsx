"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
    ArrowLeft, 
    GraduationCap, 
    Mail, 
    Phone, 
    ShieldCheck, 
    FileText, 
    User, 
    Building2,
    Calendar,
    Award
} from "lucide-react";
import { StudentRecords } from "@/features/student/components/StudentRecords";
import { StudentNovedadBadge } from "@/components/StudentNovedadBadge";
import { formatName } from "@/lib/utils";

interface StudentDetailViewProps {
    student: any;
    group: any;
    program: any;
    onBack: () => void;
}

export function StudentDetailView({
    student,
    group,
    program,
    onBack,
}: StudentDetailViewProps) {
    if (!student) return null;

    const profile = student.profile;
    const doc = profile?.identificacion || "No registrado";
    const fullName = student.name || `${profile?.nombres || ""} ${profile?.apellido || ""}`.trim() || "Estudiante";
    const phone = profile?.telefono;
    const email = student.email;
    const novedad = profile?.novedad;
    const novedadColor = profile?.novedadColor;

    const initials = fullName
        .split(" ")
        .filter(Boolean)
        .map((w: string) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "AP";

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Navigation & Breadcrumb Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-3xl border border-border/80 shadow-xs">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onBack}
                        className="h-9 gap-2 rounded-2xl text-xs font-bold border-border/80 hover:bg-muted"
                    >
                        <ArrowLeft className="h-4 w-4 text-primary" />
                        <span>Volver a la Ficha {group?.name || ""}</span>
                    </Button>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <span>/</span>
                        <span className="truncate max-w-[160px]">{group?.name ? `Ficha ${group.name}` : "Grupo"}</span>
                        <span>/</span>
                        <span className="font-bold text-foreground truncate max-w-[200px]">{formatName(fullName)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-3 py-1 rounded-xl">
                        Expediente Académico 360° • Solo Lectura
                    </Badge>
                </div>
            </div>

            {/* Student Hero Profile Card */}
            <Card className="border border-border/80 bg-card shadow-xs rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                        <div className="flex items-start sm:items-center gap-4">
                            <div className="h-16 w-16 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xl shadow-md shrink-0 ring-4 ring-primary/10">
                                {initials}
                            </div>
                            <div className="space-y-1.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                        {formatName(fullName)}
                                    </h2>
                                    <Badge variant="outline" className="text-xs font-bold bg-muted/40 font-mono">
                                        CC: {doc}
                                    </Badge>
                                    {novedad && (
                                        <StudentNovedadBadge novedad={novedad} color={novedadColor} />
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-medium">
                                    <span className="flex items-center gap-1.5 font-mono">
                                        <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                                        {email}
                                    </span>
                                    {phone && (
                                        <span className="flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                                            {phone}
                                        </span>
                                    )}
                                    {group?.name && (
                                        <span className="flex items-center gap-1.5 font-semibold text-foreground">
                                            <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                                            Ficha {group.name}
                                        </span>
                                    )}
                                    {program?.name && (
                                        <span className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[280px]">
                                            <Award className="h-3.5 w-3.5 text-primary shrink-0" />
                                            {program.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Comprehensive Student Records Full Width View */}
            <div className="bg-card border border-border/80 rounded-3xl p-4 sm:p-6 shadow-xs">
                <StudentRecords 
                    studentId={student.id} 
                    hideTables={false} 
                    hideDocumentation={false} 
                    defaultTab="attendance" 
                />
            </div>
        </div>
    );
}
