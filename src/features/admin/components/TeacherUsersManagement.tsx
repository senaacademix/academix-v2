"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  UserPlus,
  GraduationCap,
  Calendar,
  Key,
  Pencil,
  Trash2,
  Phone,
  Mail,
  IdCard,
  BookOpen,
  X,
  HelpCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createUserAction, deleteUserAction, resetUserPasswordToDocAction, updateTeacherUserAction } from "@/features/admin/actions/adminActions";
import { TeacherAvailabilityView } from "@/features/schedule/components/TeacherAvailabilityView";
import { TeacherQualificationsView } from "@/features/teacher/components/TeacherQualificationsView";

export interface TeacherUser {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  image?: string | null;
  createdAt: Date;
  profile?: {
    identificacion: string | null;
    nombres: string | null;
    apellido: string | null;
    telefono: string | null;
  } | null;
}

interface TeacherUsersManagementProps {
  initialTeachers: TeacherUser[];
  hideMainHeader?: boolean;
  programId?: string;
  onHelpClick?: () => void;
}

export function TeacherUsersManagement({
  initialTeachers,
  hideMainHeader = false,
  programId,
  onHelpClick,
}: TeacherUsersManagementProps) {
  const router = useRouter();
  const [teachers, setTeachers] = useState<TeacherUser[]>(initialTeachers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTeachers(initialTeachers);
  }, [initialTeachers]);

  // Dialogs state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [qualificationsDialogOpen, setQualificationsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Selected teacher
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherUser | null>(null);

  // Create form state
  const [newIdentificacion, setNewIdentificacion] = useState("");
  const [newNombres, setNewNombres] = useState("");
  const [newApellido, setNewApellido] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTelefono, setNewTelefono] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editIdentificacion, setEditIdentificacion] = useState("");
  const [editNombres, setEditNombres] = useState("");
  const [editApellido, setEditApellido] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const handleOpenEditTeacher = (teacher: TeacherUser) => {
    setSelectedTeacher(teacher);
    const names = (teacher.name || "").split(" ");
    setEditNombres(teacher.profile?.nombres || names[0] || "");
    setEditApellido(teacher.profile?.apellido || names.slice(1).join(" ") || "");
    setEditIdentificacion(teacher.profile?.identificacion || "");
    setEditEmail(teacher.email || "");
    setEditTelefono(teacher.profile?.telefono || "");
    setEditPassword("");
    setEditDialogOpen(true);
  };

  const handleUpdateTeacher = async () => {
    if (!selectedTeacher) return;
    if (!editIdentificacion.trim() || !editNombres.trim() || !editApellido.trim() || !editEmail.trim()) {
      toast.error("Documento, nombres, apellidos y correo son obligatorios.");
      return;
    }

    startTransition(async () => {
      try {
        const updated = await updateTeacherUserAction({
          userId: selectedTeacher.id,
          identificacion: editIdentificacion.trim(),
          nombres: editNombres.trim(),
          apellido: editApellido.trim(),
          email: editEmail.trim().toLowerCase(),
          telefono: editTelefono.trim() || undefined,
          password: editPassword.trim() || undefined,
        });

        setTeachers((prev) =>
          prev.map((t) =>
            t.id === selectedTeacher.id
              ? {
                  ...t,
                  name: updated.name,
                  email: updated.email,
                  profile: {
                    identificacion: editIdentificacion.trim(),
                    nombres: editNombres.trim(),
                    apellido: editApellido.trim(),
                    telefono: editTelefono.trim() || null,
                  },
                }
              : t
          )
        );

        toast.success("Información del instructor actualizada exitosamente");
        setEditDialogOpen(false);
        router.refresh();
      } catch (error: any) {
        toast.error("Error al actualizar instructor", {
          description: error.message || "Ocurrió un error inesperado",
        });
      }
    });
  };

  const resetForm = () => {
    setNewIdentificacion("");
    setNewNombres("");
    setNewApellido("");
    setNewEmail("");
    setNewTelefono("");
    setNewPassword("");
  };

  const handleCreateTeacher = async () => {
    if (!newIdentificacion.trim() || !newNombres.trim() || !newApellido.trim() || !newEmail.trim()) {
      toast.error("Error", {
        description: "Documento, nombres, apellidos y correo son obligatorios.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const fullName = `${newNombres.trim()} ${newApellido.trim()}`;
        const user = await createUserAction({
          email: newEmail.trim().toLowerCase(),
          name: fullName,
          role: "teacher",
          password: newPassword.trim() || newIdentificacion.trim(),
          identificacion: newIdentificacion.trim(),
          nombres: newNombres.trim(),
          apellido: newApellido.trim(),
          telefono: newTelefono.trim() || undefined,
        });

        const newTeacher: TeacherUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: "teacher",
          createdAt: new Date(),
          profile: {
            identificacion: newIdentificacion.trim(),
            nombres: newNombres.trim(),
            apellido: newApellido.trim(),
            telefono: newTelefono.trim() || null,
          },
        };

        setTeachers((prev) => [newTeacher, ...prev]);
        toast.success("Instructor registrado exitosamente");
        setCreateDialogOpen(false);
        resetForm();
        setSearchQuery("");
        router.refresh();
      } catch (error: any) {
        toast.error("Error al registrar instructor", {
          description: error.message || "Ocurrió un error inesperado",
        });
      }
    });
  };

  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) return;
    startTransition(async () => {
      try {
        await deleteUserAction(selectedTeacher.id);
        setTeachers((prev) => prev.filter((t) => t.id !== selectedTeacher.id));
        toast.success("Instructor eliminado exitosamente");
        setDeleteDialogOpen(false);
        setSelectedTeacher(null);
        router.refresh();
      } catch (error: any) {
        toast.error("Error al eliminar instructor", {
          description: error.message || "Ocurrió un error inesperado",
        });
      }
    });
  };

  const handleResetPassword = async () => {
    if (!selectedTeacher) return;
    startTransition(async () => {
      try {
        await resetUserPasswordToDocAction(selectedTeacher.id);
        toast.success("Contraseña restablecida exitosamente al documento de identidad");
        setResetDialogOpen(false);
        setSelectedTeacher(null);
      } catch (error: any) {
        toast.error("Error al restablecer contraseña", {
          description: error.message || "Ocurrió un error inesperado",
        });
      }
    });
  };

  const filteredTeachers = teachers
    .filter((t) => {
      const q = searchQuery.toLowerCase();
      return (
        t.name?.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.profile?.identificacion?.includes(searchQuery)
      );
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }));

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {!hideMainHeader ? (
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Instructores</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Directorio de instructores, disponibilidades y habilitaciones pedagógicas.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
              <GraduationCap className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
              {teachers.length} instructores registrados
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {onHelpClick && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onHelpClick}
                  className="h-9 w-9 rounded-xl border-border/80 hover:bg-muted text-foreground shadow-2xs hover:scale-105 transition-all"
                >
                  <HelpCircle className="w-4 h-4 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">¿Qué puedo hacer acá? Guía de Instructores</TooltipContent>
            </Tooltip>
          )}
          <Button
            onClick={() => {
              resetForm();
              setCreateDialogOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2 shadow-xs"
          >
            <UserPlus className="h-4 w-4" />
            Registrar Instructor
          </Button>
        </div>
      </div>



      {/* Search Filter */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar instructor por nombre, correo o número de documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  title="Limpiar búsqueda y mostrar todos"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="text-xs font-semibold text-muted-foreground hover:text-indigo-600 shrink-0 gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Mostrar todos ({teachers.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Teachers Table */}
      <Card className="border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[300px]">Instructor</TableHead>
              <TableHead>Identificación</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right pr-6">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-sm">
                  No se encontraron instructores registrados.
                </TableCell>
              </TableRow>
            ) : (
              filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={teacher.image}
                        alt={teacher.name || teacher.email}
                        fallbackText={teacher.name || teacher.email}
                        size="sm"
                        className="h-9 w-9 border border-border/80"
                      />
                      <div>
                        <div className="font-bold text-sm text-foreground">
                          {teacher.name || "Sin nombre"}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {teacher.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-mono font-medium text-foreground flex items-center gap-1.5">
                      <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
                      {teacher.profile?.identificacion || "No registrado"}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {teacher.profile?.telefono || "Sin teléfono"}
                    </div>
                  </TableCell>

                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Edit Teacher Information */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-indigo-600 hover:bg-indigo-500/10"
                        title="Editar información del instructor"
                        onClick={() => handleOpenEditTeacher(teacher)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      {/* Reset password */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:bg-amber-500/10"
                        title="Restablecer contraseña al documento"
                        onClick={() => {
                          setSelectedTeacher(teacher);
                          setResetDialogOpen(true);
                        }}
                      >
                        <Key className="h-3.5 w-3.5" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-500/10"
                        title="Eliminar instructor"
                        onClick={() => {
                          setSelectedTeacher(teacher);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Teacher Modal */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-indigo-600" />
              <span>Editar Información del Instructor</span>
            </DialogTitle>
            <DialogDescription>
              Modifica los datos personales y de acceso del instructor.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nombres *</Label>
                <Input
                  placeholder="Ej: Carlos"
                  value={editNombres}
                  onChange={(e) => setEditNombres(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Apellidos *</Label>
                <Input
                  placeholder="Ej: Gómez"
                  value={editApellido}
                  onChange={(e) => setEditApellido(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Número de Identificación *</Label>
              <Input
                placeholder="Ej: 1020304050"
                value={editIdentificacion}
                onChange={(e) => setEditIdentificacion(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Correo Electrónico *</Label>
              <Input
                type="email"
                placeholder="carlos.gomez@misena.edu.co"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Teléfono</Label>
                <Input
                  placeholder="Ej: 3001234567"
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nueva Contraseña</Label>
                <Input
                  type="password"
                  placeholder="(Dejar en blanco para mantener)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              disabled={isPending}
              onClick={handleUpdateTeacher}
            >
              {isPending ? "Guardando..." : "Actualizar Instructor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Teacher Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              <span>Registrar Nuevo Instructor</span>
            </DialogTitle>
            <DialogDescription>
              Crea la cuenta del instructor en el sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nombres *</Label>
                <Input
                  placeholder="Ej: Carlos"
                  value={newNombres}
                  onChange={(e) => setNewNombres(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Apellidos *</Label>
                <Input
                  placeholder="Ej: Gómez"
                  value={newApellido}
                  onChange={(e) => setNewApellido(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Número de Identificación *</Label>
              <Input
                placeholder="Ej: 1020304050"
                value={newIdentificacion}
                onChange={(e) => setNewIdentificacion(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Correo Electrónico *</Label>
              <Input
                type="email"
                placeholder="carlos.gomez@misena.edu.co"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Teléfono</Label>
                <Input
                  placeholder="Ej: 3001234567"
                  value={newTelefono}
                  onChange={(e) => setNewTelefono(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Contraseña Inicial</Label>
                <Input
                  type="password"
                  placeholder="(Por defecto: Documento)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              disabled={isPending}
              onClick={handleCreateTeacher}
            >
              {isPending ? "Registrando..." : "Guardar Instructor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Availability Dialog */}
      <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
        <DialogContent className="max-w-[100vw] sm:max-w-[95vw] lg:max-w-6xl w-full h-[90vh] max-h-[90vh] rounded-3xl flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span>Disponibilidad Horaria: {selectedTeacher?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Visualiza y gestiona las franjas de disponibilidad declaradas por el instructor para la programación de horarios.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            {selectedTeacher && (
              <TeacherAvailabilityView
                teacherId={selectedTeacher.id}
                isAdminMode={true}
                onAdminActionComplete={() => {}}
              />
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button onClick={() => setAvailabilityDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Qualifications Dialog */}
      <Dialog open={qualificationsDialogOpen} onOpenChange={setQualificationsDialogOpen}>
        <DialogContent className="max-w-[100vw] sm:max-w-[95vw] lg:max-w-5xl w-full h-[85vh] max-h-[85vh] rounded-3xl flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <span>Habilitaciones Curriculares: {selectedTeacher?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configura y valida las materias y competencias que este instructor está habilitado para impartir.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            {selectedTeacher && (
              <TeacherQualificationsView
                teacherId={selectedTeacher.id}
                isAdminMode={true}
                programId={programId}
                onAdminActionComplete={() => {}}
              />
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button onClick={() => setQualificationsDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Confirm Alert */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer Contraseña?</AlertDialogTitle>
            <AlertDialogDescription>
              La contraseña de <strong>{selectedTeacher?.name}</strong> se restablecerá a su número de documento ({selectedTeacher?.profile?.identificacion || "No registrado"}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleResetPassword}
            >
              Restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Teacher Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Instructor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la cuenta del instructor <strong>{selectedTeacher?.name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleDeleteTeacher}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
