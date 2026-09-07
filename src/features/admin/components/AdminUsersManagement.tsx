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
import { Search, Trash2, Edit2, UserPlus, UserCog, Shield, Eye, Phone, Mail, IdCard, Key, ChevronDown, ChevronRight, Layers, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { 
    createAdminOrObserverAction, 
    updateAdminOrObserverAction, 
    deleteAdminOrObserverAction,
    resetUserPasswordToDocAction,
    getAdminsAndObserversAction
} from "@/features/admin/actions/adminActions";
import { UserAvatar } from "@/components/ui/user-avatar";

interface Profile {
    identificacion: string;
    nombres: string;
    apellido: string;
    telefono: string | null;
}

interface Group {
    id: string;
    code?: string;
    name: string;
    programId: string;
}

interface Program {
    id: string;
    name: string;
    groups?: Group[];
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
    observedGroups?: Group[];
}

interface AdminUsersManagementProps {
    initialUsers: AdminUser[];
    programs: Program[];
    currentUserId: string;
    hideMainHeader?: boolean;
}

function ObserverProgramGroupsSelector({
    programs,
    selectedProgramIds,
    selectedGroupIds,
    onToggleProgram,
    onToggleGroup,
    onToggleAllProgramGroups,
}: {
    programs: Program[];
    selectedProgramIds: string[];
    selectedGroupIds: string[];
    onToggleProgram: (programId: string) => void;
    onToggleGroup: (groupId: string, programId: string) => void;
    onToggleAllProgramGroups: (programId: string) => void;
}) {
    const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({});

    const toggleExpand = (progId: string) => {
        setExpandedPrograms(prev => ({ ...prev, [progId]: !prev[progId] }));
    };

    return (
        <div className="md:col-span-2 space-y-2 border border-border/80 rounded-xl p-3 bg-muted/30">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-amber-500" />
                    <Label className="text-xs font-black text-foreground">
                        Programas y Fichas para Observador (Modo Solo Lectura) *
                    </Label>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <span>{selectedProgramIds.length} programas</span>
                    <span>•</span>
                    <span>{selectedGroupIds.length} fichas seleccionadas</span>
                </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
                El observador solo podrá consultar y visualizar en modo lectura las fichas y programas aquí seleccionados.
            </p>
            
            <ScrollArea className="h-60 rounded-lg border border-border/60 p-2 bg-card">
                {programs.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 text-center">No hay programas creados.</p>
                ) : (
                    <div className="space-y-2">
                        {programs.map(prog => {
                            const progGroups = prog.groups || [];
                            const isProgSelected = selectedProgramIds.includes(prog.id);
                            const selectedCount = progGroups.filter(g => selectedGroupIds.includes(g.id)).length;
                            const isExpanded = expandedPrograms[prog.id] ?? true;

                            return (
                                <div key={prog.id} className="border border-border/70 rounded-lg overflow-hidden bg-background">
                                    <div className="flex items-center justify-between p-2.5 bg-muted/40 hover:bg-muted/70 transition-colors">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                onClick={() => toggleExpand(prog.id)}
                                            >
                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </Button>
                                            <Checkbox
                                                id={`prog-${prog.id}`}
                                                checked={isProgSelected}
                                                onCheckedChange={() => onToggleProgram(prog.id)}
                                            />
                                            <label
                                                htmlFor={`prog-${prog.id}`}
                                                className="text-xs font-bold text-foreground cursor-pointer truncate"
                                            >
                                                {prog.name}
                                            </label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={cn("text-[10px] font-semibold", selectedCount > 0 ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "text-muted-foreground")}>
                                                {selectedCount} de {progGroups.length} fichas
                                            </Badge>
                                            {progGroups.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-primary"
                                                    onClick={() => onToggleAllProgramGroups(prog.id)}
                                                >
                                                    {selectedCount === progGroups.length ? "Desmarcar todas" : "Marcar todas"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="p-2.5 pt-1.5 pl-8 border-t border-border/50 bg-background/50">
                                            {progGroups.length === 0 ? (
                                                <p className="text-[11px] text-muted-foreground italic py-1">Este programa no tiene fichas o grupos creados.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                    {progGroups.map(group => {
                                                        const isChecked = selectedGroupIds.includes(group.id);
                                                        return (
                                                            <div
                                                                key={group.id}
                                                                className={cn(
                                                                    "flex items-center space-x-2 p-1.5 rounded-md border text-xs transition-colors",
                                                                    isChecked ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100" : "border-border/50 hover:bg-muted/50"
                                                                )}
                                                            >
                                                                <Checkbox
                                                                    id={`group-${group.id}`}
                                                                    checked={isChecked}
                                                                    onCheckedChange={() => onToggleGroup(group.id, prog.id)}
                                                                />
                                                                <label
                                                                    htmlFor={`group-${group.id}`}
                                                                    className="text-[11px] font-medium leading-tight cursor-pointer truncate"
                                                                    title={`${group.code ? `Ficha ${group.code} - ` : ""}${group.name}`}
                                                                >
                                                                    <span className="font-bold">{group.code ? `Ficha ${group.code}` : ""}</span>
                                                                    {group.name && group.code ? ` • ${group.name}` : group.name}
                                                                </label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

export function AdminUsersManagement({ initialUsers, programs, currentUserId, hideMainHeader = false }: AdminUsersManagementProps) {
    const router = useRouter();
    const [users, setUsers] = useState<AdminUser[]>(initialUsers);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setUsers(initialUsers);
    }, [initialUsers]);

    const refreshUsers = async () => {
        try {
            setIsRefreshing(true);
            const freshUsers = await getAdminsAndObserversAction();
            if (freshUsers) {
                setUsers(freshUsers as any);
            }
        } catch (error) {
            console.error("Error al refrescar usuarios:", error);
        } finally {
            setIsRefreshing(false);
            router.refresh();
        }
    };

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
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

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
        setSelectedGroupIds([]);
        setSelectedUser(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setCreateDialogOpen(true);
    };

    const handleOpenEdit = (user: AdminUser) => {
        setSelectedUser(user);
        setEmail(user.email);
        setRole(user.role === "observer" ? "observer" : (user.role === "gestor" ? "gestor" : "admin"));
        setIdentificacion(user.profile?.identificacion || "");
        setNombres(user.profile?.nombres || "");
        setApellido(user.profile?.apellido || "");
        setTelefono(user.profile?.telefono || "");
        setPassword("");
        setSelectedProgramIds(user.programs?.map(p => p.id) || []);
        setSelectedGroupIds(user.observedGroups?.map(g => g.id) || []);
        setEditDialogOpen(true);
    };

    const handleProgramToggle = (programId: string) => {
        setSelectedProgramIds(prev => 
            prev.includes(programId) 
                ? prev.filter(id => id !== programId) 
                : [...prev, programId]
        );
    };

    // Observer specific handlers
    const handleObserverProgramToggle = (programId: string) => {
        const prog = programs.find(p => p.id === programId);
        const progGroupIds = prog?.groups?.map(g => g.id) || [];

        setSelectedProgramIds(prev => {
            const isCurrentlySelected = prev.includes(programId);
            if (isCurrentlySelected) {
                // If unchecking program, remove all its groups
                setSelectedGroupIds(curr => curr.filter(id => !progGroupIds.includes(id)));
                return prev.filter(id => id !== programId);
            } else {
                // If checking program, select all its groups by default
                setSelectedGroupIds(curr => Array.from(new Set([...curr, ...progGroupIds])));
                return [...prev, programId];
            }
        });
    };

    const handleObserverGroupToggle = (groupId: string, programId: string) => {
        setSelectedGroupIds(prev => {
            const isSelected = prev.includes(groupId);
            let nextGroups: string[];
            if (isSelected) {
                nextGroups = prev.filter(id => id !== groupId);
                // Check if any groups left for this program
                const prog = programs.find(p => p.id === programId);
                const hasRemaining = prog?.groups?.some(g => g.id !== groupId && nextGroups.includes(g.id));
                if (!hasRemaining) {
                    setSelectedProgramIds(pIds => pIds.filter(id => id !== programId));
                }
            } else {
                nextGroups = [...prev, groupId];
                setSelectedProgramIds(pIds => pIds.includes(programId) ? pIds : [...pIds, programId]);
            }
            return nextGroups;
        });
    };

    const handleObserverToggleAllProgramGroups = (programId: string) => {
        const prog = programs.find(p => p.id === programId);
        if (!prog || !prog.groups || prog.groups.length === 0) return;

        const progGroupIds = prog.groups.map(g => g.id);
        const allSelected = progGroupIds.every(id => selectedGroupIds.includes(id));

        if (allSelected) {
            setSelectedGroupIds(prev => prev.filter(id => !progGroupIds.includes(id)));
            setSelectedProgramIds(prev => prev.filter(id => id !== programId));
        } else {
            setSelectedGroupIds(prev => Array.from(new Set([...prev, ...progGroupIds])));
            setSelectedProgramIds(prev => prev.includes(programId) ? prev : [...prev, programId]);
        }
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

        if (role === "observer") {
            if (selectedProgramIds.length === 0) {
                toast.error("Debes asignar al menos un programa de formación al Observador");
                return;
            }
            if (selectedGroupIds.length === 0) {
                toast.error("Debes asignar al menos una ficha/grupo al Observador");
                return;
            }
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
                    programIds: (role === "gestor" || role === "observer") ? selectedProgramIds : [],
                    groupIds: role === "observer" ? selectedGroupIds : []
                });

                const newUser: AdminUser = {
                    id: res.id,
                    name: res.name,
                    email: res.email,
                    role: res.role,
                    image: res.image,
                    createdAt: res.createdAt,
                    profile: res.profile,
                    programs: (res.role === "observer" 
                        ? ((res as any).observedPrograms || [])
                        : ((res as any).managedPrograms && (res as any).managedPrograms.length > 0 ? (res as any).managedPrograms : res.programs || [])) as Program[],
                    observedGroups: (res as any).observedGroups || []
                };

                setUsers(prev => [newUser, ...prev]);
                toast.success("Usuario creado exitosamente");
                setCreateDialogOpen(false);
                resetForm();
                setSearchQuery(""); // Limpiar búsqueda para mostrar todos los usuarios
                setRoleFilter("all"); // Limpiar filtro de rol
                await refreshUsers();
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

        if (role === "observer") {
            if (selectedProgramIds.length === 0) {
                toast.error("Debes asignar al menos un programa de formación al Observador");
                return;
            }
            if (selectedGroupIds.length === 0) {
                toast.error("Debes asignar al menos una ficha/grupo al Observador");
                return;
            }
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
                    programIds: (role === "gestor" || role === "observer") ? selectedProgramIds : [],
                    groupIds: role === "observer" ? selectedGroupIds : []
                });

                setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
                    ...u,
                    name: res.name,
                    email: res.email,
                    role: res.role,
                    profile: res.profile,
                    programs: (res.role === "observer" 
                        ? ((res as any).observedPrograms || [])
                        : ((res as any).managedPrograms && (res as any).managedPrograms.length > 0 ? (res as any).managedPrograms : res.programs || [])) as Program[],
                    observedGroups: (res as any).observedGroups || []
                } : u));

                toast.success("Usuario actualizado exitosamente");
                setEditDialogOpen(false);
                resetForm();
                await refreshUsers();
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
                await refreshUsers();
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
                await refreshUsers();
            } catch (error: any) {
                toast.error(error.message || "Error al restablecer contraseña");
            }
        });
    };

    const adminCount = users.filter(u => u.role === "admin").length;
    const gestorCount = users.filter(u => u.role === "gestor").length;
    const observerCount = users.filter(u => u.role === "observer").length;

    const filteredUsers = users.filter(user => {
        const matchesQuery = (
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.profile?.identificacion.includes(searchQuery)
        );
        const matchesRole = roleFilter === "all" || user.role === roleFilter;

        return matchesQuery && matchesRole;
    }).sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {!hideMainHeader ? (
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Administración y Gestión Académica</h1>
                        <p className="text-muted-foreground text-sm">Administra los accesos de Administradores y Gestores de Programas.</p>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
                            <Shield className="mr-1.5 h-3.5 w-3.5 text-primary" />
                            {users.length} miembros del equipo registrados
                        </Badge>
                    </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={refreshUsers}
                        disabled={isRefreshing || isPending}
                        title="Refrescar lista y mostrar todos los usuarios"
                        className="h-9 w-9 rounded-xl border-border hover:bg-muted/80 shadow-xs"
                    >
                        <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isRefreshing && "animate-spin text-primary")} />
                    </Button>
                    <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2 shadow-xs">
                        <UserPlus className="h-4 w-4" />
                        Nuevo Miembro (Admin, Gestor u Observador)
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <Card className="border-border bg-card shadow-xs rounded-2xl">
                <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, email o documento..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-9"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                    title="Limpiar búsqueda"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Selector de Rol */}
                        <div className="w-full sm:w-[220px]">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-full font-medium h-9 text-xs">
                                    <SelectValue placeholder="Filtrar por rol..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs font-semibold">
                                        Todos los roles ({users.length})
                                    </SelectItem>
                                    <SelectItem value="admin" className="text-xs font-semibold">
                                        👑 Administradores ({adminCount})
                                    </SelectItem>
                                    <SelectItem value="gestor" className="text-xs font-semibold">
                                        📂 Gestores Académicos ({gestorCount})
                                    </SelectItem>
                                    <SelectItem value="observer" className="text-xs font-semibold">
                                        👁️ Observadores ({observerCount})
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Botones de acceso rápido por rol */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
                        <span className="text-[11px] font-bold text-muted-foreground mr-1">Rol:</span>
                        <Button
                            type="button"
                            variant={roleFilter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRoleFilter("all")}
                            className={cn(
                                "h-7 rounded-lg text-xs font-semibold px-2.5 transition-all",
                                roleFilter === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Todos ({users.length})
                        </Button>
                        <Button
                            type="button"
                            variant={roleFilter === "admin" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRoleFilter(roleFilter === "admin" ? "all" : "admin")}
                            className={cn(
                                "h-7 rounded-lg text-xs font-semibold px-2.5 gap-1.5 transition-all",
                                roleFilter === "admin" 
                                    ? "bg-primary text-primary-foreground shadow-xs" 
                                    : "text-muted-foreground hover:text-primary hover:border-primary/40"
                            )}
                        >
                            <Shield className="h-3 w-3" />
                            Administradores ({adminCount})
                        </Button>
                        <Button
                            type="button"
                            variant={roleFilter === "gestor" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRoleFilter(roleFilter === "gestor" ? "all" : "gestor")}
                            className={cn(
                                "h-7 rounded-lg text-xs font-semibold px-2.5 gap-1.5 transition-all",
                                roleFilter === "gestor" 
                                    ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700" 
                                    : "text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/40"
                            )}
                        >
                            <UserCog className="h-3 w-3" />
                            Gestores ({gestorCount})
                        </Button>
                        <Button
                            type="button"
                            variant={roleFilter === "observer" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRoleFilter(roleFilter === "observer" ? "all" : "observer")}
                            className={cn(
                                "h-7 rounded-lg text-xs font-semibold px-2.5 gap-1.5 transition-all",
                                roleFilter === "observer" 
                                    ? "bg-amber-600 text-white shadow-xs hover:bg-amber-700" 
                                    : "text-muted-foreground hover:text-amber-600 hover:border-amber-500/40"
                            )}
                        >
                            <Eye className="h-3 w-3" />
                            Observadores ({observerCount})
                        </Button>

                        {(searchQuery || roleFilter !== "all") && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery("");
                                    setRoleFilter("all");
                                }}
                                className="h-7 text-xs font-semibold text-muted-foreground hover:text-destructive ml-auto gap-1"
                            >
                                <X className="h-3.5 w-3.5" />
                                Limpiar filtros
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Listado de usuarios */}
            <Card className="border-border bg-card shadow-xs rounded-3xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/70">
                    <CardTitle className="text-lg">Equipo de Administración, Gestión y Observación ({filteredUsers.length})</CardTitle>
                    <CardDescription>Lista de Administradores, Gestores de Programas y Observadores.</CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[280px]">Usuario</TableHead>
                                <TableHead className="w-[180px]">Identificación</TableHead>
                                <TableHead className="w-[220px]">Rol y Asignaciones</TableHead>
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
                                                <div className="flex flex-col gap-1 items-start">
                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold gap-1">
                                                        <Eye className="h-3.5 w-3.5" /> Observador
                                                    </Badge>
                                                    <span className="text-[11px] text-muted-foreground font-medium">
                                                        {user.programs?.length || 0} programa(s) • {user.observedGroups?.length || 0} ficha(s)
                                                    </span>
                                                </div>
                                            ) : (
                                                <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold gap-1">
                                                    <Shield className="h-3.5 w-3.5" /> Administrador
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
                                                    title="Editar usuario y asignaciones"
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
                <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-primary" />
                            Nuevo Miembro del Equipo
                        </DialogTitle>
                        <DialogDescription>Crea un Administrador, Gestor Académico u Observador de Programas y Fichas.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1">
                        {/* Selector de Rol */}
                        <div className="space-y-1">
                            <Label htmlFor="role" className="text-xs font-bold">Rol Institucional *</Label>
                            <Select value={role} onValueChange={(val: "admin" | "gestor" | "observer") => setRole(val)}>
                                <SelectTrigger className="w-full font-semibold h-9 text-xs">
                                    <SelectValue placeholder="Seleccione el rol..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin" className="font-bold text-xs">👑 Administrador</SelectItem>
                                    <SelectItem value="gestor" className="font-bold text-xs">📂 Gestor Académico</SelectItem>
                                    <SelectItem value="observer" className="font-bold text-xs">👁️ Observador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Identificación */}
                        <div className="space-y-1">
                            <Label htmlFor="identificacion" className="text-xs font-semibold">Identificación *</Label>
                            <Input
                                id="identificacion"
                                placeholder="Cédula/Documento"
                                className="h-9 text-xs"
                                value={identificacion}
                                onChange={(e) => setIdentificacion(e.target.value)}
                            />
                        </div>

                        {/* Nombres */}
                        <div className="space-y-1">
                            <Label htmlFor="nombres" className="text-xs font-semibold">Nombres *</Label>
                            <Input
                                id="nombres"
                                placeholder="Nombres"
                                className="h-9 text-xs"
                                value={nombres}
                                onChange={(e) => setNombres(e.target.value)}
                            />
                        </div>

                        {/* Apellidos */}
                        <div className="space-y-1">
                            <Label htmlFor="apellido" className="text-xs font-semibold">Apellidos *</Label>
                            <Input
                                id="apellido"
                                placeholder="Apellidos"
                                className="h-9 text-xs"
                                value={apellido}
                                onChange={(e) => setApellido(e.target.value)}
                            />
                        </div>

                        {/* Correo Electrónico */}
                        <div className="space-y-1">
                            <Label htmlFor="email" className="text-xs font-semibold">Correo Electrónico *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@dominio.com"
                                className="h-9 text-xs"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {/* Teléfono */}
                        <div className="space-y-1">
                            <Label htmlFor="telefono" className="text-xs font-semibold">Teléfono</Label>
                            <Input
                                id="telefono"
                                placeholder="Opcional"
                                className="h-9 text-xs"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                            />
                        </div>

                        {/* Contraseña */}
                        <div className="space-y-1 md:col-span-2">
                            <Label htmlFor="pass" className="text-xs font-semibold">Contraseña</Label>
                            <Input
                                id="pass"
                                type="password"
                                placeholder="Por defecto la Identificación"
                                className="h-9 text-xs"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {/* Asignación de Programas si es Gestor */}
                        {role === "gestor" && (
                            <div className="md:col-span-2 space-y-1.5 border border-border/80 rounded-xl p-3 bg-muted/30">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-black text-foreground">Programas de Formación Asignados *</Label>
                                    <span className="text-xs font-bold text-primary">{selectedProgramIds.length} seleccionados</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    El Gestor Académico solo podrá administrar fichas, estudiantes y horarios de los programas marcados.
                                </p>
                                <ScrollArea className="h-28 rounded-lg border border-border/60 p-2 bg-card">
                                    {programs.length === 0 ? (
                                        <p className="text-xs text-muted-foreground p-2">No hay programas de formación creados.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                            {programs.map(prog => (
                                                <div key={prog.id} className="flex items-center space-x-2 p-1 rounded-md hover:bg-muted/50">
                                                    <Checkbox
                                                        id={`create-prog-${prog.id}`}
                                                        checked={selectedProgramIds.includes(prog.id)}
                                                        onCheckedChange={() => handleProgramToggle(prog.id)}
                                                    />
                                                    <label
                                                        htmlFor={`create-prog-${prog.id}`}
                                                        className="text-xs font-medium leading-none cursor-pointer truncate"
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

                        {/* Asignación jerárquica de Programas y Fichas si es Observador */}
                        {role === "observer" && (
                            <ObserverProgramGroupsSelector
                                programs={programs}
                                selectedProgramIds={selectedProgramIds}
                                selectedGroupIds={selectedGroupIds}
                                onToggleProgram={handleObserverProgramToggle}
                                onToggleGroup={handleObserverGroupToggle}
                                onToggleAllProgramGroups={handleObserverToggleAllProgramGroups}
                            />
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
                <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-primary" />
                            Editar Miembro del Equipo
                        </DialogTitle>
                        <DialogDescription>Modifica los datos y asignaciones del usuario.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1">
                        {/* Selector de Rol */}
                        <div className="space-y-1">
                            <Label htmlFor="edit-role" className="text-xs font-bold">Rol Institucional *</Label>
                            <Select value={role} onValueChange={(val: "admin" | "gestor" | "observer") => setRole(val)}>
                                <SelectTrigger className="w-full font-semibold h-9 text-xs">
                                    <SelectValue placeholder="Seleccione el rol..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin" className="font-bold text-xs">👑 Administrador</SelectItem>
                                    <SelectItem value="gestor" className="font-bold text-xs">📂 Gestor Académico</SelectItem>
                                    <SelectItem value="observer" className="font-bold text-xs">👁️ Observador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Identificación */}
                        <div className="space-y-1">
                            <Label htmlFor="edit-identificacion" className="text-xs font-semibold">Identificación *</Label>
                            <Input
                                id="edit-identificacion"
                                placeholder="Cédula/Documento"
                                className="h-9 text-xs"
                                value={identificacion}
                                onChange={(e) => setIdentificacion(e.target.value)}
                            />
                        </div>

                        {/* Nombres */}
                        <div className="space-y-1">
                            <Label htmlFor="edit-nombres" className="text-xs font-semibold">Nombres *</Label>
                            <Input
                                id="edit-nombres"
                                placeholder="Nombres"
                                className="h-9 text-xs"
                                value={nombres}
                                onChange={(e) => setNombres(e.target.value)}
                            />
                        </div>

                        {/* Apellidos */}
                        <div className="space-y-1">
                            <Label htmlFor="edit-apellido" className="text-xs font-semibold">Apellidos *</Label>
                            <Input
                                id="edit-apellido"
                                placeholder="Apellidos"
                                className="h-9 text-xs"
                                value={apellido}
                                onChange={(e) => setApellido(e.target.value)}
                            />
                        </div>

                        {/* Correo Electrónico */}
                        <div className="space-y-1">
                            <Label htmlFor="edit-email" className="text-xs font-semibold">Correo Electrónico *</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                placeholder="email@dominio.com"
                                className="h-9 text-xs"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {/* Teléfono */}
                        <div className="space-y-1">
                            <Label htmlFor="edit-telefono" className="text-xs font-semibold">Teléfono</Label>
                            <Input
                                id="edit-telefono"
                                placeholder="Opcional"
                                className="h-9 text-xs"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                            />
                        </div>

                        {/* Asignación de Programas si es Gestor */}
                        {role === "gestor" && (
                            <div className="md:col-span-2 space-y-1.5 border border-border/80 rounded-xl p-3 bg-muted/30">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-black text-foreground">Programas de Formación Asignados *</Label>
                                    <span className="text-xs font-bold text-primary">{selectedProgramIds.length} seleccionados</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    El Gestor Académico solo podrá administrar fichas, estudiantes y horarios de los programas marcados.
                                </p>
                                <ScrollArea className="h-28 rounded-lg border border-border/60 p-2 bg-card">
                                    {programs.length === 0 ? (
                                        <p className="text-xs text-muted-foreground p-2">No hay programas de formación creados.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                            {programs.map(prog => (
                                                <div key={prog.id} className="flex items-center space-x-2 p-1 rounded-md hover:bg-muted/50">
                                                    <Checkbox
                                                        id={`edit-prog-${prog.id}`}
                                                        checked={selectedProgramIds.includes(prog.id)}
                                                        onCheckedChange={() => handleProgramToggle(prog.id)}
                                                    />
                                                    <label
                                                        htmlFor={`edit-prog-${prog.id}`}
                                                        className="text-xs font-medium leading-none cursor-pointer truncate"
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

                        {/* Asignación jerárquica de Programas y Fichas si es Observador */}
                        {role === "observer" && (
                            <ObserverProgramGroupsSelector
                                programs={programs}
                                selectedProgramIds={selectedProgramIds}
                                selectedGroupIds={selectedGroupIds}
                                onToggleProgram={handleObserverProgramToggle}
                                onToggleGroup={handleObserverGroupToggle}
                                onToggleAllProgramGroups={handleObserverToggleAllProgramGroups}
                            />
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
