"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ position = "bottom-left", ...props }: ToasterProps) => {
  const { theme = "system", resolvedTheme } = useTheme()
  const activeTheme = (resolvedTheme || theme) as ToasterProps["theme"]

  return (
    <Sonner
      theme={activeTheme}
      className="toaster group"
      position={position}
      richColors
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500 shrink-0" />,
        info: <InfoIcon className="size-4 text-blue-500 shrink-0" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500 shrink-0" />,
        error: <OctagonXIcon className="size-4 text-rose-500 shrink-0" />,
        loading: <Loader2Icon className="size-4 animate-spin text-primary shrink-0" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border/90 group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:border font-sans",
          description: "group-[.toast]:text-muted-foreground font-medium text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-semibold rounded-xl",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-semibold rounded-xl",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:border-border",
        },
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
