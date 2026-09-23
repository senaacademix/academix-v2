"use client";

import React from "react";
import { Award, ShieldCheck } from "lucide-react";

interface StudentVoceroBadgeProps {
    role?: "PRINCIPAL" | "SUPLENTE" | null;
    className?: string;
    size?: "sm" | "default";
}

export function StudentVoceroBadge({ role, className = "", size = "default" }: StudentVoceroBadgeProps) {
    if (!role) return null;

    if (role === "PRINCIPAL") {
        return (
            <span
                title="Vocero Principal electo de la ficha formativa"
                className={`bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-full shadow-2xs gap-1 inline-flex items-center shrink-0 tracking-tight select-none cursor-default ${
                    size === "sm" ? "text-[10px] px-2 py-0.5 leading-none" : "text-xs px-2.5 py-1 leading-none"
                } ${className}`}
            >
                <Award className={size === "sm" ? "w-3 h-3 text-amber-100" : "w-3.5 h-3.5 text-amber-100"} />
                Vocero Principal
            </span>
        );
    }

    return (
        <span
            title="Vocero Suplente electo de la ficha formativa"
            className={`bg-sky-500 hover:bg-sky-600 text-white font-extrabold rounded-full shadow-2xs gap-1 inline-flex items-center shrink-0 tracking-tight select-none cursor-default ${
                size === "sm" ? "text-[10px] px-2 py-0.5 leading-none" : "text-xs px-2.5 py-1 leading-none"
            } ${className}`}
        >
            <ShieldCheck className={size === "sm" ? "w-3 h-3 text-sky-100" : "w-3.5 h-3.5 text-sky-100"} />
            Vocero Suplente
        </span>
    );
}
