"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";

// Importación dinámica de @uiw/react-md-editor para prevenir errores de SSR
const MDEditor = dynamic(
    () => import("@uiw/react-md-editor").then((mod) => mod.default),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-80 rounded-xl border border-border/80 bg-muted/20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-sm font-medium">Cargando editor Markdown...</span>
            </div>
        )
    }
);

interface MarkdownEditorWrapperProps {
    value: string;
    onChange: (value?: string) => void;
    height?: number;
    placeholder?: string;
}

export function MarkdownEditorWrapper({
    value,
    onChange,
    height = 380,
    placeholder = "Escribe el contenido del comunicado aquí utilizando formato Markdown..."
}: MarkdownEditorWrapperProps) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const colorMode = mounted && resolvedTheme === "dark" ? "dark" : "light";

    return (
        <div data-color-mode={colorMode} className="w-full rounded-xl overflow-hidden border border-border/80 shadow-sm focus-within:ring-2 focus-within:ring-primary/40 transition-all">
            <MDEditor
                value={value}
                onChange={onChange}
                height={height}
                preview="live"
                textareaProps={{
                    placeholder
                }}
                className="!bg-background !text-foreground"
            />
        </div>
    );
}
