"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";

const MarkdownPreview = dynamic(
    () => import("@uiw/react-markdown-preview").then((mod) => mod.default),
    {
        ssr: false,
        loading: () => (
            <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm font-medium">Cargando contenido del comunicado...</span>
            </div>
        )
    }
);

interface MarkdownViewerProps {
    source: string;
    className?: string;
}

export function MarkdownViewer({ source, className = "" }: MarkdownViewerProps) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const colorMode = mounted && resolvedTheme === "dark" ? "dark" : "light";

    return (
        <div
            data-color-mode={colorMode}
            className={`prose dark:prose-invert max-w-none text-foreground leading-relaxed
                [&_img]:rounded-2xl [&_img]:max-h-[520px] [&_img]:w-auto [&_img]:mx-auto [&_img]:shadow-lg [&_img]:border [&_img]:border-border/80 [&_img]:my-5
                [&_h1]:text-2xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:text-foreground
                [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-foreground
                [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-foreground
                [&_p]:text-foreground/90 [&_p]:text-sm sm:[&_p]:text-base [&_p]:leading-relaxed
                [&_li]:text-foreground/90 [&_li]:text-sm sm:[&_li]:text-base
                [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:font-semibold hover:[&_a]:text-primary/80
                [&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:bg-primary/[0.03] [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl [&_blockquote]:italic
                ${className}`}
        >
            <MarkdownPreview
                source={source}
                style={{
                    backgroundColor: "transparent",
                    color: "inherit",
                    fontSize: "0.95rem",
                    lineHeight: "1.75"
                }}
            />
        </div>
    );
}
