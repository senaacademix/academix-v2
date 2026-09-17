"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 150,
  skipDelayDuration = 100,
  disableHoverableContent = true,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      disableHoverableContent={disableHoverableContent}
      {...props}
    />
  )
}

function useIsTouchOnly() {
  const [isTouchOnly, setIsTouchOnly] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia("(hover: none)")
    setIsTouchOnly(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setIsTouchOnly(e.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isTouchOnly
}

function Tooltip({
  open,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const isTouchOnly = useIsTouchOnly()

  // On touch-only devices, suppress tooltips so taps execute actions immediately without double-tap delay or sticky bubbles
  const effectiveOpen = isTouchOnly && open === undefined ? false : open

  return <TooltipPrimitive.Root data-slot="tooltip" open={effectiveOpen} {...props} />
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-card text-card-foreground border border-border shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-xl px-3 py-1.5 text-xs font-semibold text-balance select-none",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-card fill-card border-border z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
