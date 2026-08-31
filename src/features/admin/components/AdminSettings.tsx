"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Save, Sparkles, HelpCircle, UserCheck } from "lucide-react";

interface AdminSettingsProps {
    initialSettings: {
        hasGithubToken: boolean;
        institutionName?: string | null;
        institutionLogo?: string | null;
        institutionHeroImage?: string | null;
        footerText?: string | null;
        studentDailyLimit?: number | null;
        limitAttendanceToCurrentWeek: boolean;
        scheduleTitle?: string | null;
        scheduleStartDate?: Date | string | null;
        scheduleEndDate?: Date | string | null;
        maxTeacherHours?: number | null;
    };
    initialRequests: any[];
    isObserver?: boolean;
}

export function AdminSettings({ initialSettings, isObserver = false }: AdminSettingsProps) {
    const [studentDailyLimit, setStudentDailyLimit] = useState(initialSettings.studentDailyLimit ?? 2);
    const [studentAccessEnabled, setStudentAccessEnabled] = useState<boolean>(
        (initialSettings as any).studentAccessEnabled ?? true
    );

    useEffect(() => {
        setStudentDailyLimit(initialSettings.studentDailyLimit ?? 2);
        setStudentAccessEnabled((initialSettings as any).studentAccessEnabled ?? true);
    }, [
        initialSettings.studentDailyLimit,
        (initialSettings as any).studentAccessEnabled
    ]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                        Configuración del Sistema
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Gestiona y personaliza las reglas de acceso e inicio de sesión de la plataforma.
                    </p>
                </div>
            </div>

            {/* Configuración de Acceso y Límites */}
            <Card className="rounded-3xl border border-border/80 shadow-xs bg-card overflow-hidden">
                <CardHeader className="border-b border-border/60 bg-muted/20 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-foreground">Reglas de Acceso Estudiantil</CardTitle>
                            <CardDescription className="text-xs font-medium text-muted-foreground mt-0.5">
                                Controla la disponibilidad general y límites de acceso diario para los aprendices.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    <form action={async (formData) => {
                        const { updateSettingsAction } = await import("@/features/admin/actions/settingsActions");
                        await updateSettingsAction(formData);
                        toast.success("Configuración actualizada correctamente");
                    }} className="space-y-6">
                        
                        <div className="space-y-2">
                            <Label htmlFor="studentDailyLimit" className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                Límite Diario de Accesos (Estudiantes)
                            </Label>
                            <Input
                                id="studentDailyLimit"
                                name="studentDailyLimit"
                                type="number"
                                min={1}
                                value={studentDailyLimit}
                                onChange={(e) => setStudentDailyLimit(Number(e.target.value))}
                                placeholder="Ej: 2"
                                className="h-11 rounded-2xl border-border/80 focus-visible:ring-primary font-medium"
                                disabled={isObserver}
                            />
                            <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5 font-medium">
                                <HelpCircle className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                                Controla el número máximo de veces que un estudiante puede acceder a la plataforma por día.
                            </p>
                        </div>

                        <div className="border-t border-border/50 pt-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="studentAccessEnabled" className="text-sm font-bold text-foreground cursor-pointer flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-primary" />
                                        <span>Acceso General para Estudiantes</span>
                                    </Label>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                        Habilita o deshabilita de forma global el acceso y la navegación de todos los aprendices/estudiantes en la plataforma.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Switch
                                        id="studentAccessEnabled"
                                        checked={studentAccessEnabled}
                                        onCheckedChange={async (checked) => {
                                            setStudentAccessEnabled(checked);
                                            try {
                                                const { toggleStudentAccessAction } = await import("@/features/admin/actions/settingsActions");
                                                await toggleStudentAccessAction(checked);
                                                toast.success(checked ? "Acceso de estudiantes habilitado globalmente" : "Acceso de estudiantes deshabilitado globalmente");
                                            } catch (err: any) {
                                                toast.error("Error al actualizar la configuración de acceso");
                                                setStudentAccessEnabled(!checked);
                                            }
                                        }}
                                        disabled={isObserver}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <input
                                        type="hidden"
                                        name="studentAccessEnabled"
                                        value={studentAccessEnabled ? "true" : "false"}
                                    />
                                </div>
                            </div>
                        </div>

                        {!isObserver && (
                            <div className="flex justify-end pt-4 border-t border-border/40">
                                <Button 
                                    type="submit" 
                                    className="rounded-2xl h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-2 transition-all"
                                >
                                    <Save className="w-4 h-4" />
                                    Guardar Configuración
                                </Button>
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
