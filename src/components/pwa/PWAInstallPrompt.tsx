"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Sparkles, Share2, PlusSquare, Smartphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // 1. Check if already installed in standalone mode
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check dismissal cooldown (3 days)
    const dismissedUntil = localStorage.getItem("academix_pwa_dismissed_until");
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|firefox|fxios/.test(userAgent);

    if (isIOSDevice) {
      setIsIOS(true);
      // Give the user 2.5 seconds to appreciate the app before prompting
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    // 4. Android / Chrome / Chromium / Edge beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Small delay for smooth user experience
      setTimeout(() => {
        setShowPrompt(true);
      }, 1500);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Also listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowPrompt(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("[PWA] Error prompt installation:", err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    // Dismiss for 3 days
    const threeDays = Date.now() + 3 * 24 * 60 * 60 * 1000;
    localStorage.setItem("academix_pwa_dismissed_until", threeDays.toString());
  };

  if (!isMounted || isInstalled || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Notificación para instalar aplicación AcademiX"
        initial={{ y: 90, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 90, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[9999] pointer-events-auto"
      >
        <div className="relative rounded-3xl border border-primary/30 bg-card/95 dark:bg-card/90 backdrop-blur-2xl shadow-2xl p-4 sm:p-5 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
          {/* Decorative ambient gradient backdrop */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-primary/15 blur-3xl rounded-full pointer-events-none -z-10" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-emerald-500/10 blur-2xl rounded-full pointer-events-none -z-10" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            aria-label="Cerrar notificación de instalación"
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-muted-foreground/80 hover:text-foreground hover:bg-muted/70 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {!showIOSGuide ? (
            <div className="space-y-3.5">
              {/* Header: Logo + App Name + Official Badge */}
              <div className="flex items-start gap-3 pr-6">
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent border border-primary/35 p-1.5 flex items-center justify-center shrink-0 shadow-md shadow-primary/15">
                  <Image
                    src="/logo.png"
                    alt="AcademiX Logo"
                    width={36}
                    height={36}
                    className="object-contain aspect-square drop-shadow-sm"
                  />
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight leading-none">
                      Instalar AcademiX
                    </h3>
                    <Badge variant="outline" className="text-[9.5px] font-black uppercase tracking-wider bg-primary/10 border-primary/25 text-primary py-0 px-1.5 h-4">
                      App Oficial
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    Instala la aplicación en tu dispositivo para ingresar directamente, ver horarios sin conexión y navegar en pantalla completa.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={handleInstallClick}
                  size="sm"
                  className="flex-1 h-9.5 text-xs font-black rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar Aplicación</span>
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className="h-9.5 px-3 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
                >
                  Ahora no
                </Button>
              </div>
            </div>
          ) : (
            /* iOS Specific Guidance */
            <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Cómo instalar en iPhone / iPad</h3>
                  <p className="text-[11px] text-muted-foreground">Sigue estos sencillos pasos en Safari:</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-foreground/90 bg-muted/30 p-3 rounded-2xl border border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    1
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Pulsa el botón</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border/80 font-bold text-primary">
                      <Share2 className="w-3 h-3" /> Compartir
                    </span>
                    <span>en la barra inferior.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    2
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Desliza y selecciona</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border/80 font-bold text-foreground">
                      <PlusSquare className="w-3 h-3 text-primary" /> Añadir a pantalla de inicio
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  className="w-full h-9 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Entendido
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
