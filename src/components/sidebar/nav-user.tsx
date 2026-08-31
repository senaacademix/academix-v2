"use client"

import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  KeyRound,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { getPostLogoutRedirect, signOut } from "@/features/auth/services/authService"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { getProfileAction, updateProfileAction, changeUserPasswordAction } from "@/features/profile/actions/profileActions"
import { Badge } from "@/components/ui/badge"
import { getRoleFromUser } from "@/features/auth/services/authService"
import { formatName, getInitials, cn } from "@/lib/utils"

function resolveAvatarUrl(image?: string | null) {
  const src = (image || "").trim()
  if (!src) return undefined
  if (/^https?:\/\//.test(src) || src.startsWith("data:")) return src
  const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")
  try {
    return new URL(src, base).toString()
  } catch {
    return src
  }
}

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const router = useRouter()
  const { data: session, refetch } = authClient.useSession()
  const userRole = getRoleFromUser(session?.user)

  const getRoleBadgeLabel = () => {
    switch (userRole) {
      case "admin":
        return { label: "Administrador", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 shadow-2xs" };
      case "gestor":
        return { label: "Gestor Académico", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-2xs" };
      case "teacher":
        return { label: "Docente / Instructor", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 shadow-2xs" };
      case "student":
        return { label: "Estudiante / Aprendiz", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 shadow-2xs" };
      default:
        return { label: "Usuario", color: "bg-primary/15 text-primary border-primary/30 shadow-2xs" };
    }
  };

  const roleBadge = getRoleBadgeLabel();
  const { isMobile, setOpenMobile } = useSidebar()
  const [loading, setLoading] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  
  // Password change states
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const handleChangePasswordSubmit = async () => {
    setPasswordError("")
    setPasswordSuccess("")

    if (!newPassword || newPassword.length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas nuevas no coinciden.")
      return
    }

    setChangingPassword(true)
    try {
      await changeUserPasswordAction({
        currentPassword,
        newPassword
      })
      setPasswordSuccess("Tu contraseña ha sido cambiada exitosamente.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => {
        setPasswordChangeOpen(false)
        setPasswordSuccess("")
      }, 2000)
    } catch (err: any) {
      setPasswordError(err.message || "Error al cambiar la contraseña.")
    } finally {
      setChangingPassword(false)
    }
  }

  const handleOpenAccount = () => {
    setFirstName((displayedUser.name || "").split(/\s+/)[0] || "")
    const parts = (displayedUser.name || "").split(/\s+/)
    setLastName(parts.length > 1 ? parts[parts.length - 1] || "" : "")
    setMenuOpen(false)
    setAccountOpen(true)
    loadProfile()
    // En móvil NO cerramos el sidebar aquí:
    // el Sheet del sidebar usa su propio backdrop y al cerrarse programáticamente
    // dispara onPointerDownOutside en el Dialog, cierrándolo inmediatamente.
    // El sidebar se cerrará solo cuando el usuario toque fuera de él.
  }

  const su = session?.user as { name?: string; email?: string; image?: string } | null | undefined
  const rawImage = su?.image ?? (su as unknown as { avatar?: string })?.avatar ?? (su as unknown as { picture?: string })?.picture ?? (su as unknown as { photoURL?: string })?.photoURL ?? null
  const displayedUser = {
    name: su?.name ?? user.name,
    email: su?.email ?? user.email,
    avatar: resolveAvatarUrl(rawImage) ?? user.avatar ?? "",
  }

  const initialFirst = useMemo(() => (displayedUser.name || "").split(/\s+/)[0] || "", [displayedUser.name])
  const initialLast = useMemo(() => {
    const parts = (displayedUser.name || "").split(/\s+/)
    return parts.length > 1 ? parts[parts.length - 1] || "" : ""
  }, [displayedUser.name])
  const [firstName, setFirstName] = useState(initialFirst)
  const [lastName, setLastName] = useState(initialLast)
  const [identificacion, setIdentificacion] = useState("")
  const [telefono, setTelefono] = useState("")
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [loadingProfile, setLoadingProfile] = useState(false)
  const fullName = useMemo(() => `${firstName}`.trim() + (lastName.trim() ? ` ${lastName.trim()}` : ""), [firstName, lastName])

  // Load profile data when dialog opens
  const loadProfile = async () => {
    setLoadingProfile(true)
    try {
      const [profile] = await Promise.all([
        getProfileAction()
      ]);

      if (profile?.identificacion) {
        setIdentificacion(profile.identificacion)
        setFirstName(profile.nombres || "")
        setLastName(profile.apellido || "")
        setTelefono(profile.telefono || "")
        setDataProcessingConsent(profile.dataProcessingConsent || false)
      }


    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleSaveAccount = async () => {
    setSaveError("")
    
    // Capitalize names before saving
    const capitalizedFirstName = formatName(firstName)
    const capitalizedLastName = formatName(lastName)
    const capitalizedFullName = `${capitalizedFirstName} ${capitalizedLastName}`.trim()

    setSaving(true)

    // Update user name
    const { error } = await authClient.updateUser({ name: capitalizedFullName })
    if (error) {
      setSaveError(error.message || "Error al actualizar el perfil")
      setSaving(false)
      return
    }

    // Update profile data via server action
    try {
      const formData = new FormData()
      formData.append("identificacion", identificacion)
      formData.append("nombres", capitalizedFirstName)
      formData.append("apellido", capitalizedLastName)
      formData.append("telefono", telefono)

    } catch (err) {
      setSaveError("Error al guardar los datos del perfil")
      setSaving(false)
      return
    }

    await refetch?.()
    setSaving(false)
    setAccountOpen(false)
  }

  const handleLogout = async () => {
    setLoading(true)
    try {
      if (isMobile) {
        setOpenMobile(false)
      }
      await signOut()
      router.push(getPostLogoutRedirect())
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <SidebarMenu className="group-data-[collapsible=icon]:items-center pb-1.5 group-data-[collapsible=icon]:pb-3">
        <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:mx-auto! group-data-[collapsible=icon]:rounded-xl"
              >
                <Avatar className="h-8.5 w-8.5 aspect-square rounded-xl shrink-0">
                  <AvatarImage src={displayedUser.avatar} alt={displayedUser.name ?? ""} className="aspect-square object-cover" />
                  <AvatarFallback className="rounded-xl font-bold text-xs bg-primary/10 text-primary aspect-square flex items-center justify-center">
                    {getInitials(displayedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden min-w-0">
                  <span className="truncate font-semibold text-foreground">{formatName(displayedUser.name)}</span>
                  <span className="truncate text-[11px] font-medium text-muted-foreground">{roleBadge.label}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden text-muted-foreground" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-2xl p-2 shadow-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-1 font-normal">
                <div className="flex items-center gap-3 px-1 py-1.5 text-left">
                  <Avatar className="h-9 w-9 rounded-xl shrink-0">
                    <AvatarImage src={displayedUser.avatar} alt={displayedUser.name ?? ""} />
                    <AvatarFallback className="rounded-xl font-bold text-xs bg-primary/10 text-primary">
                      {getInitials(displayedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                    <span className="truncate font-bold text-foreground">{formatName(displayedUser.name)}</span>
                    <span className="truncate text-xs text-muted-foreground">{displayedUser.email}</span>
                    <span
                      className={cn(
                        "mt-1.5 inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider",
                        roleBadge.color
                      )}
                    >
                      {roleBadge.label}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={handleOpenAccount}
                  className="rounded-xl cursor-pointer"
                >
                  <BadgeCheck className="mr-2 h-4 w-4 text-primary" />
                  <span>Mi Perfil y Datos</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setMenuOpen(false)
                    setPasswordChangeOpen(true)
                  }}
                  className="rounded-xl cursor-pointer"
                >
                  <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Cambiar Contraseña</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem onSelect={handleLogout} disabled={loading} className="rounded-xl cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent
          className="sm:max-w-md rounded-3xl"
          onPointerDownOutside={(e) => {
            if (isMobile) e.preventDefault()
          }}
          onInteractOutside={(e) => {
            if (isMobile) e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Información de Perfil</DialogTitle>
            <DialogDescription>Consulta y actualiza tus datos personales en la institución.</DialogDescription>
          </DialogHeader>

          {/* Role pill in modal */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Rol Asignado</div>
              <div className="text-sm font-black text-foreground mt-0.5">{roleBadge.label}</div>
            </div>
            <span className={cn("px-2.5 py-1 rounded-xl text-xs font-bold border", roleBadge.color)}>
              {roleBadge.label}
            </span>
          </div>

          <div className="flex flex-col gap-4 mt-1">
            <div>
              <Label htmlFor="identificacion">Identificación</Label>
              <Input className="mt-2.5" id="identificacion" value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} placeholder="Cédula" />
            </div>
            <div>
              <Label htmlFor="first-name">Nombres</Label>
              <Input className="mt-2.5" id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tus nombres" />
            </div>
            <div>
              <Label htmlFor="last-name">Apellido</Label>
              <Input className="mt-2.5" id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Tu apellido" />
            </div>
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input className="mt-2.5" id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Número de teléfono" />
            </div>

            <div className="flex items-center space-x-2 border p-3 rounded-md bg-muted/50">
              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${dataProcessingConsent ? 'bg-green-500 border-green-500' : 'bg-transparent border-gray-400'}`}>
                {dataProcessingConsent && <div className="h-2 w-2 bg-white rounded-full" />}
              </div>
              <div className="space-y-1">
                <Label htmlFor="habeas-data" className="text-sm font-medium leading-none cursor-default">
                  Aceptación de tratamiento de datos (Habeas Data)
                </Label>
                <p className="text-xs text-muted-foreground">
                  {dataProcessingConsent
                    ? "Has aceptado el tratamiento de tus datos personales."
                    : "No has aceptado el tratamiento de tus datos personales."
                  }
                </p>
              </div>
            </div>



            {saveError && <div className="text-sm text-destructive">{saveError}</div>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAccountOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveAccount} disabled={saving || !fullName.trim() || !identificacion.trim()}>{saving ? "Guardando..." : "Guardar"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG: CHANGE PASSWORD ============ */}
      <Dialog open={passwordChangeOpen} onOpenChange={setPasswordChangeOpen}>
        <DialogContent
          onPointerDownOutside={(e) => {
            if (isMobile) e.preventDefault()
          }}
          onInteractOutside={(e) => {
            if (isMobile) e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>Actualiza tu contraseña para asegurar tu cuenta</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <Label htmlFor="current-password">Contraseña Actual</Label>
              <Input
                className="mt-2.5"
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                disabled={changingPassword}
              />
            </div>
            <div>
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <Input
                className="mt-2.5"
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                disabled={changingPassword}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
              <Input
                className="mt-2.5"
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                disabled={changingPassword}
              />
            </div>

            {passwordError && <div className="text-sm text-destructive font-medium">{passwordError}</div>}
            {passwordSuccess && <div className="text-sm text--600 dark:text--400 font-medium">{passwordSuccess}</div>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordChangeOpen(false)} disabled={changingPassword}>
                Cancelar
              </Button>
              <Button
                onClick={handleChangePasswordSubmit}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? "Actualizando..." : "Actualizar Contraseña"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
