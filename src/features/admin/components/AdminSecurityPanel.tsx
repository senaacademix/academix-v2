"use client";

import React, { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  Zap,
  Lock,
  Unlock,
  Users,
  RotateCcw,
  Save,
  CheckCircle2,
  Clock,
  Ban,
  Activity,
  UserX,
} from "lucide-react";
import {
  SecuritySettingsData,
} from "@/features/security/services/securityService";
import {
  updateSecuritySettingsAction,
  unlockUserAccountAction,
} from "@/features/security/actions/securityActions";

interface BlockedUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastFailedLogin: Date | null;
  profile?: {
    identificacion: string | null;
  } | null;
}

interface AdminSecurityPanelProps {
  initialSettings: SecuritySettingsData;
  initialBlockedUsers: BlockedUser[];
}

export function AdminSecurityPanel({
  initialSettings,
  initialBlockedUsers,
}: AdminSecurityPanelProps) {
  const [settings, setSettings] = useState<SecuritySettingsData>(initialSettings);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>(initialBlockedUsers);
  const [isPending, startTransition] = useTransition();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await updateSecuritySettingsAction(settings);
        if (res.success && res.data) {
          setSettings(res.data);
          toast.success("Seguridad actualizada", {
            description: "Las reglas de Rate Limiting y Anti-Fuerza Bruta se han guardado exitosamente.",
          });
        } else {
          toast.error("Error al guardar", {
            description: res.error || "No se pudo actualizar la configuración.",
          });
        }
      } catch (err) {
        toast.error("Error inesperado", {
          description: err instanceof Error ? err.message : "Ocurrió un error al guardar.",
        });
      }
    });
  };

  const handleUnlock = (userId: string, userName: string) => {
    setUnlockingId(userId);
    startTransition(async () => {
      try {
        const res = await unlockUserAccountAction(userId);
        if (res.success) {
          setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
          toast.success("Cuenta desbloqueada", {
            description: `Se han restablecido los intentos fallidos de ${userName}.`,
          });
        } else {
          toast.error("No se pudo desbloquear", {
            description: res.error || "Error al procesar la solicitud.",
          });
        }
      } catch (err) {
        toast.error("Error al desbloquear", {
          description: err instanceof Error ? err.message : "Error inesperado.",
        });
      } finally {
        setUnlockingId(null);
      }
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Perímetro Blindado
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Activity className="w-3.5 h-3.5" />
              Sliding Window 60s
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Seguridad & Rate Limiting
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control de peticiones por IP, mitigación de ataques de fuerza bruta y gestión de cuentas bloqueadas.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-2xl h-11 px-6 font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Save className="w-4 h-4" />
          <span>{isPending ? "Guardando..." : "Guardar Cambios"}</span>
        </Button>
      </div>

      {/* Grid de Configuración Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarjeta 1: Rate Limiting por IP */}
        <Card className="rounded-3xl border border-border/70 shadow-sm bg-card overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">
                    Rate Limiting Perimetral (IP)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Mitiga ráfagas masivas y denegación de servicio (DoS L7).
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.rateLimitEnabled}
                onCheckedChange={(val) =>
                  setSettings({ ...settings, rateLimitEnabled: val })
                }
              />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rateLimitGeneral" className="text-sm font-semibold text-foreground">
                  Peticiones generales por minuto por IP
                </Label>
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {settings.rateLimitRequestsPerMinute} req/min
                </span>
              </div>
              <Input
                id="rateLimitGeneral"
                type="number"
                min={10}
                max={600}
                value={settings.rateLimitRequestsPerMinute}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rateLimitRequestsPerMinute: parseInt(e.target.value) || 60,
                  })
                }
                className="rounded-xl h-11 bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Umbral para rutas de navegación general antes de responder con código 429 Too Many Requests.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rateLimitAuth" className="text-sm font-semibold text-foreground">
                  Límite estricto de autenticación (/api/auth/*)
                </Label>
                <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  {settings.rateLimitAuthPerMinute} req/min
                </span>
              </div>
              <Input
                id="rateLimitAuth"
                type="number"
                min={3}
                max={50}
                value={settings.rateLimitAuthPerMinute}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rateLimitAuthPerMinute: parseInt(e.target.value) || 10,
                  })
                }
                className="rounded-xl h-11 bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Límite de solicitudes simultáneas a los endpoints de login por dirección IP.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 2: Anti-Fuerza Bruta por Cuenta */}
        <Card className="rounded-3xl border border-border/70 shadow-sm bg-card overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  Anti-Fuerza Bruta & Bloqueo de Cuentas
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Protege contra ataques de diccionario dirigidos a usuarios específicos.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxFailed" className="text-sm font-semibold text-foreground">
                  Intentos fallidos máximos
                </Label>
                <Input
                  id="maxFailed"
                  type="number"
                  min={3}
                  max={20}
                  value={settings.authMaxFailedAttempts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      authMaxFailedAttempts: parseInt(e.target.value) || 5,
                    })
                  }
                  className="rounded-xl h-11 bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Número de contraseñas incorrectas antes de congelar la cuenta.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lockoutDuration" className="text-sm font-semibold text-foreground">
                  Duración del bloqueo (Minutos)
                </Label>
                <Input
                  id="lockoutDuration"
                  type="number"
                  min={1}
                  max={1440}
                  value={settings.authLockoutDurationMinutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      authLockoutDurationMinutes: parseInt(e.target.value) || 15,
                    })
                  }
                  className="rounded-xl h-11 bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Tiempo de enfriamiento obligatorio tras superar los fallos.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold text-foreground">
                    Retardo Progresivo Anti-Bot (Tarpit)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Añade un retraso intencional de 1.5s ante fallos consecutivos para desincentivar herramientas automatizadas.
                  </p>
                </div>
                <Switch
                  checked={settings.enableProgressiveDelay}
                  onCheckedChange={(val) =>
                    setSettings({ ...settings, enableProgressiveDelay: val })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold text-foreground">
                    Permitir Auto-Registro de Aprendices
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Desactivado por política institucional. Los aprendices deben ser dados de alta por el Gestor Académico.
                  </p>
                </div>
                <Switch
                  checked={settings.allowPublicRegistration}
                  onCheckedChange={(val) =>
                    setSettings({ ...settings, allowPublicRegistration: val })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tarjeta 3: Lista de Cuentas Bloqueadas */}
      <Card className="rounded-3xl border border-border/70 shadow-sm bg-card overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  Cuentas Bloqueadas por Fuerza Bruta ({blockedUsers.length})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Usuarios que han superado el umbral de intentos fallidos de inicio de sesión.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {blockedUsers.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                No hay cuentas bloqueadas en este momento
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                El sistema no registra usuarios con intentos fallidos excesivos. Todas las cuentas están operando normalmente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {blockedUsers.map((user) => {
                const now = new Date();
                const lockedDate = user.lockedUntil ? new Date(user.lockedUntil) : null;
                const minutesLeft = lockedDate
                  ? Math.max(1, Math.ceil((lockedDate.getTime() - now.getTime()) / 60000))
                  : 0;

                return (
                  <div
                    key={user.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-sm shrink-0">
                        <UserX className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground">{user.name}</p>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {user.role || "student"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
                        {user.profile?.identificacion && (
                          <p className="text-[11px] text-muted-foreground">
                            Doc: {user.profile.identificacion}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:justify-end">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Bloqueado ({minutesLeft}m restantes)</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {user.failedLoginAttempts} intentos fallidos
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={unlockingId === user.id}
                        onClick={() => handleUnlock(user.id, user.name)}
                        className="rounded-xl border-border hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-colors"
                      >
                        <Unlock className="w-4 h-4 mr-1.5" />
                        <span>Desbloquear</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
