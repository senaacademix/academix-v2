"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, X } from "lucide-react";
import { StudentRecords } from "@/features/student/components/StudentRecords";

export interface StudentAcademicInfo {
    id?: string;
    studentId?: string;
    name?: string;
    studentName?: string;
    document?: string | null;
    studentDocument?: string | null;
    email?: string | null;
    studentEmail?: string | null;
    groupName?: string | null;
}

interface StudentAcademicRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: StudentAcademicInfo | null;
}

export function StudentAcademicRecordModal({
    isOpen,
    onClose,
    student
}: StudentAcademicRecordModalProps) {
    if (!student) return null;

    const targetStudentId = student.studentId || student.id;
    const targetStudentName = student.studentName || student.name || "Aprendiz";
    const targetDocument = student.studentDocument ?? student.document;
    const targetEmail = student.studentEmail ?? student.email;
    const targetGroupName = student.groupName;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="!max-w-[100vw] sm:!max-w-[100vw] w-screen h-screen m-0 p-4 sm:p-6 !rounded-none overflow-y-auto border-none bg-background flex flex-col z-[80]"
            >
                <div className="space-y-5 flex-1 flex flex-col min-h-0">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                    variant="outline"
                                    className="px-2.5 py-0.5 text-xs font-bold bg-primary/10 text-primary border-primary/25 gap-1.5 rounded-full"
                                >
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    Registro Académico Individual
                                </Badge>
                                {targetDocument && (
                                    <span className="text-xs font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
                                        Doc: {targetDocument}
                                    </span>
                                )}
                            </div>

                            <DialogTitle className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3 pt-1">
                                <span className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                                    {targetStudentName}
                                </span>
                            </DialogTitle>

                            <DialogDescription className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2 flex-wrap">
                                {targetEmail && <span>{targetEmail}</span>}
                                {targetGroupName && (
                                    <>
                                        <span>•</span>
                                        <span className="font-bold text-foreground">
                                            Ficha / Grupo: {targetGroupName}
                                        </span>
                                    </>
                                )}
                            </DialogDescription>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="h-9 px-3.5 rounded-xl border-border/80 hover:bg-muted text-foreground font-bold text-xs gap-1.5 shadow-2xs shrink-0 cursor-pointer self-start sm:self-center"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Cerrar</span>
                        </Button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        {targetStudentId ? (
                            <StudentRecords
                                studentId={targetStudentId}
                                hideTables={false}
                                hideDocumentation={true}
                            />
                        ) : (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No se pudo identificar el ID del aprendiz seleccionado.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
