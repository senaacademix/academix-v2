"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { GestorManagedProgram } from "../types/gestorTypes";

const GESTOR_PROGRAM_COOKIE = "academix_gestor_program_id";

interface GestorProgramContextType {
    selectedProgramId: string | null;
    selectedProgram: GestorManagedProgram | null;
    managedPrograms: GestorManagedProgram[];
    setManagedPrograms: (programs: GestorManagedProgram[]) => void;
    selectProgram: (programId: string, programObj?: GestorManagedProgram) => void;
    clearProgram: () => void;
    hasSelectedProgram: boolean;
}

const GestorProgramContext = createContext<GestorProgramContextType | null>(null);

function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
}

function setSessionCookie(name: string, value: string) {
    if (typeof document === "undefined") return;
    // Session cookie (lasts only for the current browser session)
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function GestorProgramProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
    const [managedPrograms, setManagedProgramsState] = useState<GestorManagedProgram[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initial check from searchParams or session storage/cookie
    useEffect(() => {
        // Clean up any legacy localStorage
        try {
            if (typeof window !== "undefined") {
                localStorage.removeItem(GESTOR_PROGRAM_COOKIE);
            }
        } catch {}

        const paramId = searchParams.get("programId");
        const cookieId = getCookie(GESTOR_PROGRAM_COOKIE);
        const sessionStoreId = typeof window !== "undefined" ? sessionStorage.getItem(GESTOR_PROGRAM_COOKIE) : null;

        if (paramId) {
            setSelectedProgramId(paramId);
            setSessionCookie(GESTOR_PROGRAM_COOKIE, paramId);
            if (typeof window !== "undefined") {
                sessionStorage.setItem(GESTOR_PROGRAM_COOKIE, paramId);
            }
        } else if (pathname !== "/dashboard/gestor") {
            // Preserve session selection when on subpages
            const effective = cookieId || sessionStoreId || null;
            if (effective) {
                setSelectedProgramId(effective);
            }
        }
        setIsInitialized(true);
    }, [searchParams, pathname]);

    const setManagedPrograms = useCallback((programs: GestorManagedProgram[]) => {
        setManagedProgramsState(programs);
        if (programs.length === 1) {
            // Single program assigned -> auto-select immediately
            const single = programs[0];
            setSelectedProgramId(single.id);
            setSessionCookie(GESTOR_PROGRAM_COOKIE, single.id);
            if (typeof window !== "undefined") {
                sessionStorage.setItem(GESTOR_PROGRAM_COOKIE, single.id);
            }
        }
    }, []);

    const selectProgram = useCallback((programId: string, programObj?: GestorManagedProgram) => {
        setSelectedProgramId(programId);
        setSessionCookie(GESTOR_PROGRAM_COOKIE, programId);
        if (typeof window !== "undefined") {
            sessionStorage.setItem(GESTOR_PROGRAM_COOKIE, programId);
            const currentUrl = new URL(window.location.href);
            const currentParam = currentUrl.searchParams.get("programId");
            if (currentParam !== programId) {
                currentUrl.searchParams.set("programId", programId);
                window.location.href = currentUrl.toString();
            }
        }
        if (programObj) {
            setManagedProgramsState((prev) => {
                if (prev.some((p) => p.id === programObj.id)) return prev;
                return [...prev, programObj];
            });
        }
    }, []);

    const clearProgram = useCallback(() => {
        setSelectedProgramId(null);
        deleteCookie(GESTOR_PROGRAM_COOKIE);
        if (typeof window !== "undefined") {
            sessionStorage.removeItem(GESTOR_PROGRAM_COOKIE);
        }
        if (pathname.startsWith("/dashboard/admin")) {
            router.push("/dashboard/admin/courses");
        } else {
            router.push("/dashboard/gestor");
        }
    }, [pathname, router]);

    const effectiveProgramId = selectedProgramId || (managedPrograms.length > 0 ? managedPrograms[0].id : null);
    const selectedProgram = effectiveProgramId
        ? managedPrograms.find((p) => p.id === effectiveProgramId) || (managedPrograms.length > 0 ? managedPrograms[0] : null)
        : null;

    return (
        <GestorProgramContext.Provider
            value={{
                selectedProgramId: effectiveProgramId,
                selectedProgram,
                managedPrograms,
                setManagedPrograms,
                selectProgram,
                clearProgram,
                hasSelectedProgram: Boolean(effectiveProgramId),
            }}
        >
            {children}
        </GestorProgramContext.Provider>
    );
}

export function useGestorProgram() {
    const context = useContext(GestorProgramContext);
    if (!context) {
        return {
            selectedProgramId: null,
            selectedProgram: null,
            managedPrograms: [],
            setManagedPrograms: () => {},
            selectProgram: () => {},
            clearProgram: () => {},
            hasSelectedProgram: false,
        };
    }
    return context;
}
