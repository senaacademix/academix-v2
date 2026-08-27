"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Trash2, Edit2, UserPlus, UserCog, Shield, Eye, Phone, Mail, IdCard, Key } from "lucide-react";
import { toast } from "sonner";
import { 
    createAdminOrObserverAction, 
    updateAdminOrObserverAction, 
    deleteAdminOrObserverAction,
    resetUserPasswordToDocAction
} from "@/app/admin-actions";
import { UserAvatar } from "@/components/ui/user-avatar";

interface Profile {
    identificacion: string;
    nombres: string;
    apellido: string;
    telefono: string | null;
}

interface Program {
    id: string;
    name: string;
}

interface AdminUser {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
    image: string | null;
    createdAt: Date;
    profile: Profile | null;
    programs: Program[];
}

interface AdminUsersManagementProps {
    initialUsers: AdminUser[];
    programs: Program[];
    currentUserId: string;
    hideMainHeader?: boolean;
}

export function AdminUsersManagement({ initialUsers, programs, currentUserId, hideMainHeader = false }: AdminUsersManagementProps) {
    const router = useRouter();
    const [users, setUsers] = useState<AdminUser[]>(initialUsers);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setUsers(initialUsers);
    }, [initialUsers]);

    // Dialogs state
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    // Selected user for editing/deleting/resetting
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
    const [userToReset, setUserToReset] = useState<AdminUser | null>(null);

    // Form states
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"admin" | "gestor" | "observer">("admin");
    const [identificacion, setIdentificacion] = useState("");
    const [nombres, setNombres] = useState("");
    const [apellido, setApellido] = useState("");
    const [telefono, setTelefono] = useState("");
    const [password, setPassword] = useState("");
    const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);

    // Reset Form fields
    const resetForm = () => {
        setEmail("");
        setRole("admin");
        setIdentificacion("");
        setNombres("");
        setApellido("");
        setTelefono("");
        setPassword("");
        setSelectedProgramIds([]);
        setSelectedUser(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setCreateDialogOpen(true);
    };

    const handleOpenEdit = (user: AdminUser) => {
        setSelectedUser(user);
        setEmail(user.email);
        setRole((user.role as "admin" | "gestor" | "observer") || "admin");
        setIdentificacion(user.profile?.identificacion || "");
        setNombres(user.profile?.nombres || "");
        setApellido(user.profile?.apellido || "");
        setTelefono(user.profile?.telefono || "");
        setPassword("");
        setSelectedProgramIds(user.programs?.map(p => p.id) || []);
        setEditDialogOpen(true);
    };

    const handleCreateUser = async () => {
        if (!email || !identificacion || !nombres || !apellido) {
            toast.error("Por favor completa los campos obligatorios");
            return;
        }

        if (role === "gestor" && selectedProgramIds.length === 0) {
            toast.error("Debes asignar al menos un programa de formación al Gestor Académico");
            return;
        }

        startTransition(async () => {
            try {
                const fullName = `${nombres.trim()} ${apellido.trim()}`;
                const res = await createAdminOrObserverAction({
                    email: email.trim(),
                    name: fullName,
                    role,
                    password: password || undefined,
                    identificacion: identificacion.trim(),
                    nombres: nombres.trim(),
                    apellido: apellido.trim(),
                    telefono: telefono.trim() || undefined,
                    programIds: (role === "gestor" || role === "observer") ? selectedProgramIds : []
                });

                const newUser: AdminUser = {
                    id: res.id,
                    name: res.name,
                    email: res.email,
                    role: res.role,
                    image: res.image,
                    createdAt: res.createdAt,
                    profile: res.profile,
                    programs: ((res as any).managedPrograms && (res as any).managedPrograms.length > 0 ? (res as any).managedPrograms : res.programs || []) as Program[]
                };

                setUsers(prev => [newUser, ...prev]);
                toast.success("Usuario creado exitosamente");
                setCreateDialogOpen(false);
                resetForm();
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Error al crear usuario");
            }
        });
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;
        if (!email || !identificacion || !nombres || !apellido) {
            toast.error("Por favor completa los campos obligatorios");
            return;
        }

        if (role === "gestor" && selectedProgramIds.length === 0) {
            toast.error("Debes asignar al menos un programa de formación al Gestor Académico");
            return;
        }

        startTransition(async () => {
            try {
                const fullName = `${nombres.trim()} ${apellido.trim()}`;
                const res = await updateAdminOrObserverAction(selectedUser.id, {
                    email: email.trim(),
                    name: fullName,
                    role,
                    identificacion: identificacion.trim(),
                    nombres: nombres.trim(),
                    apellido: apellido.trim(),
                    telefono: telefono.trim() || undefined,
                    programIds: (role === "gestor" || role === "observer") ? selectedProgramIds : []
                });

                setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
                    ...u,
                    name: res.name,
                    email: res.email,
                    role: res.role,
                    profile: res.profile,
                    programs: ((res as any).managedPrograms && (res as any).managedPrograms.length > 0 ? (res as any).managedPrograms : res.programs || []) as Program[]
                } : u));

                toast.success("Usuario actualizado exitosamente");
                setEditDialogOpen(false);
                resetForm();
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Error al actualizar usuario");
            }
        });
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        startTransition(async () => {
            try {
                await deleteAdminOrObserverAction(userToDelete.id);
                setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
                toast.success("Usuario eliminado exitosamente");
                setDeleteDialogOpen(false);
                setUserToDelete(null);
            } catch (error: any) {
                toast.error(error.message || "Error al eliminar usuario");
            }
        });
    };

    const handleResetPassword = async () => {
        if (!userToReset) return;

        startTransition(async () => {
            try {
                await resetUserPasswordToDocAction(userToReset.id);
                toast.success("Contraseña restablecida exitosamente al número de documento");
                setResetDialogOpen(false);
                setUserToReset(null);
            } catch (error: any) {
                toast.error(error.message || "Error al restablecer contraseña");
            }
        });
    };

    const handleProgramToggle = (programId: string) => {
        setSelectedProgramIds(prev => 
            prev.includes(programId) 
                ? prev.filter(id => id !== programId) 
                : [...prev, programId]
        );
    };

    const filteredUsers = users.filter(user => {
        return (
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.profile?.identificacion.includes(searchQuery)
        );
    }).sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {!hideMainHeader ? (
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Coordinación y Gestión Académica</h1>
                        <p className="text-muted-foreground text-sm">Administra los accesos de Coordinadores Académicos y Gestores de Programas.</p>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
                            <Shield className="mr-1.5 h-3.5 w-3.5 text-primary" />
                            {users.length} miembros del equipo registrados
                        </Badge>
                    </div>
                )}
                <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2 ml-auto shadow-xs">
                    <UserPlus className="h-4 w-4" />
                    Nuevo Coordinador o Gestor
                </Button>
            </div>

            {/* Filtros */}
            <Card className="border-border bg-card shadow-xs rounded-2xl">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, email o documento..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Listado de usuarios */}
            <Card className="border-border bg-card shadow-xs rounded-3xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/70">
                    <CardTitle className="text-lg">Equipo de Coordinación y Gestión ({filteredUsers.length})</CardTitle>
                    <CardDescription>Lista de Coordinadores Académicos y Gestores de Programas de Formación.</CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[280px]">Usuario</TableHead>
                                <TableHead className="w-[180px]">Identificación</TableHead>
                                <TableHead className="w-[200px]">Rol y Programas</TableHead>
                                <TableHead className="w-[150px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                        No se encontraron usuarios.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar src={user.image} alt={user.name || ""} fallbackText={user.name || user.email || ""} className="h-9 w-9" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-foreground">{user.name}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Mail className="h-3 w-3 inline" /> {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs gap-1">
                                                <span className="font-medium flex items-center gap-1">
                                                    <IdCard className="h-3.5 w-3.5 text-muted-foreground" /> {user.profile?.identificacion || "N/A"}
                                                </span>
                                                {user.profile?.telefono && (
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {user.profile.telefono}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {user.role === "gestor" ? (
                                                <div className="flex flex-col gap-1 items-start">
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold gap-1">
                                                        <UserCog className="h-3.5 w-3.5" /> Gestor Académico
                                                    </Badge>
                                                    <span className="text-[11px] text-muted-foreground font-medium">
                                                        {user.programs?.length || 0} programa(s) asignado(s)
                                                    </span>
                                                </div>
                                            ) : user.role === "observer" ? (
                                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold gap-1">
                                                    <Eye className="h-3.5 w-3.5" /> Observador
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold gap-1">
                                                    <Shield className="h-3.5 w-3.5" /> Coordinador Académico
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleOpenEdit(user)}
                                                    title="Editar usuario y programas"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                                    onClick={() => {
                                                        setUserToReset(user);
                                                        setResetDialogOpen(true);
                                                    }}
                                                    title="Restablecer Contraseña"
                                                >
                                                    <Key className="h-4 w-4" />
                                                </Button>
                                                {user.id !== currentUserId && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            setUserToDelete(user);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                        title="Eliminar usuario"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Dialogo: Crear Usuario */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-xl w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-primary" />
                            Nuevo Miembro del Equipo
                        </DialogTitle>
                        <DialogDescription>Crea un Coordinador Académico o un Gestor de Programas de Formación.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 py-2">
                        {/* Selector de Rol */}
                        <div className="space-y-1.5">
                            <Label htmlFor="role" className="text-xs font-bold">Rol Institucional *</Label>
                            <Select value={role} onValueChange={(val: "admin" | "gestor" | "observer") => setRole(val)}>
                                <SelectTrigger className="w-full font-semibold">
                                    <SelectValue placeholder="Seleccione el rol..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin" className="font-bold">👑 Coordinador Académico (Acceso Total)</SelectItem>
                                    <SelectItem value="gestor" className="font-bold">📂 Gestor Académico (Carga y Horarios por Programa)</SelectItem>
                                    <SelectItem value="observer" className="font-bold">👁️ Observador / Auditor (Solo Lectura)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Columna de Datos de Usuario */}
                        <div className="space-y-1">
                            <Label htmlFor="identificacion" className="text-xs font-semibold">Identificación *</Label>
                            <Input
                                id="identificacion"
                                placeholder="Cédula/Documento"
                                value={identificacion}
                                onChange={(e) => setIdentificacion(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="nombres" className="text-xs font-semibold">Nombres *</Label>
                                <Input
                                    id="nombres"
                                    placeholder="Nombres"
                                    value={nombres}
                                    onChange={(e) => setNombres(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="apellido" className="text-xs font-semibold">Apellidos *</Label>
                                <Input
                                    id="apellido"
                                    placeholder="Apellidos"
                                    value={apellido}
                                    onChange={(e) => setApellido(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="email" className="text-xs font-semibold">Correo Electrónico *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@dominio.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="telefono" className="text-xs font-semibold">Teléfono</Label>
                                <Input
                                    id="telefono"
                                    placeholder="Opcional"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="pass" className="text-xs font-semibold">Contraseña</Label>
                                <Input
                                    id="pass"
                                    type="password"
                                    placeholder="Por defecto la Identificación"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Asignación de Programas si es Gestor u Observador */}
                        {(role === "gestor" || role === "observer") && (
                            <div className="space-y-2 border border-border/80 rounded-2xl p-4 bg-muted/30">
                                <Label className="text-xs font-black text-foreground flex items-center justify-between">
                                    <span>Programas de Formación Asignados *</span>
                                    <span className="text-xs font-bold text-primary">{selectedProgramIds.length} seleccionados</span>
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    El {role === "gestor" ? "Gestor" : "Observador"} solo podrá administrar fichas, estudiantes y horarios de los programas marcados.
                                </p>
                                <ScrollArea className="h-44 rounded-xl border border-border/60 p-2 bg-card">
                                    {programs.length === 0 ? (
                                        <p className="text-xs text-muted-foreground p-3">No hay programas de formación creados.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {programs.map(prog => (
                                                <div key={prog.id} className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-muted/50">
                                                    <Checkbox
                                                        id={`create-prog-${prog.id}`}
                                                        checked={selectedProgramIds.includes(prog.id)}
                                                        onCheckedChange={() => handleProgramToggle(prog.id)}
                                                    />
                                                    <label
                                                        htmlFor={`create-prog-${prog.id}`}
                                                        className="text-xs font-medium leading-none cursor-pointer flex-1"
                                                    >
                                                        {prog.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateUser} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isPending}>
                            {isPending ? "Guardando..." : "Crear Usuario"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialogo: Editar Usuario */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-xl w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-primary" />
                            Editar Miembro del Equipo
                        </DialogTitle>
                        <DialogDescription>Modifica los datos y programas asignados al usuario.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 py-2">
                        {/* Selector de Rol */}
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-role" className="text-xs font-bold">Rol Institucional *</Label>
                            <Select value={role} onValueChange={(val: "admin" | "gestor" | "observer") => setRole(val)}>
                                <SelectTrigger className="w-full font-semibold">
                                    <SelectValue placeholder="Seleccione el rol..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin" className="font-bold">👑 Coordinador Académico (Acceso Total)</SelectItem>
                                    <SelectItem value="gestor" className="font-bold">📂 Gestor Académico (Carga y Horarios por Programa)</SelectItem>
                                    <SelectItem value="observer" className="font-bold">👁️ Observador / Auditor (Solo Lectura)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-identificacion" className="text-xs font-semibold">Identificación *</Label>
                            <Input
                                id="edit-identificacion"
                                placeholder="Cédula/Documento"
                                value={identificacion}
                                onChange={(e) => setIdentificacion(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="edit-nombres" className="text-xs font-semibold">Nombres *</Label>
                                <Input
                                    id="edit-nombres"
                                    placeholder="Nombres"
                                    value={nombres}
                                    onChange={(e) => setNombres(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="edit-apellido" className="text-xs font-semibold">Apellidos *</Label>
                                <Input
                                    id="edit-apellido"
                                    placeholder="Apellidos"
                                    value={apellido}
                                    onChange={(e) => setApellido(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-email" className="text-xs font-semibold">Correo Electrónico *</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                placeholder="email@dominio.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-telefono" className="text-xs font-semibold">Teléfono</Label>
                            <Input
                                id="edit-telefono"
                                placeholder="Opcional"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                            />
                        </div>

                        {/* Asignación de Programas si es Gestor u Observador */}
                        {(role === "gestor" || role === "observer") && (
                            <div className="space-y-2 border border-border/80 rounded-2xl p-4 bg-muted/30">
                                <Label className="text-xs font-black text-foreground flex items-center justify-between">
                                    <span>Programas de Formación Asignados *</span>
                                    <span className="text-xs font-bold text-primary">{selectedProgramIds.length} seleccionados</span>
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    El {role === "gestor" ? "Gestor" : "Observador"} solo podrá administrar fichas, estudiantes y horarios de los programas marcados.
                                </p>
                                <ScrollArea className="h-44 rounded-xl border border-border/60 p-2 bg-card">
                                    {programs.length === 0 ? (
                                        <p className="text-xs text-muted-foreground p-3">No hay programas de formación creados.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {programs.map(prog => (
                                                <div key={prog.id} className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-muted/50">
                                                    <Checkbox
                                                        id={`edit-prog-${prog.id}`}
                                                        checked={selectedProgramIds.includes(prog.id)}
                                                        onCheckedChange={() => handleProgramToggle(prog.id)}
                                                    />
                                                    <label
                                                        htmlFor={`edit-prog-${prog.id}`}
                                                        className="text-xs font-medium leading-none cursor-pointer flex-1"
                                                    >
                                                        {prog.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleUpdateUser} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isPending}>
                            {isPending ? "Guardando..." : "Actualizar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialogo: Eliminar Usuario */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará la cuenta de{" "}
                            <strong className="text-foreground">{userToDelete?.name}</strong> de forma permanente del sistema y todos sus datos asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90 text-white" disabled={isPending}>
                            {isPending ? "Eliminando..." : "Eliminar Usuario"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialogo: Restablecer Contraseña */}
            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restablecer contraseña</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Desea restablecer la contraseña de{" "}
                            <strong className="text-foreground">{userToReset?.name}</strong>? La contraseña volverá a ser: <strong className="text-foreground">{userToReset?.profile?.identificacion}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetPassword} className="bg-amber-600 hover:bg-amber-700 text-white" disabled={isPending}>
                            {isPending ? "Procesando..." : "Restablecer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
