"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  Copy,
  Check,
  Sparkles,
  Layers,
  GraduationCap,
  Award,
  FileText,
  Target,
  Hash,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

export interface ParsedCompetencyData {
  competenciaTitle: string;
  competenciaCode?: string;
  raps: Array<{ id: string; label: string; text: string }>;
  rawDescription: string;
  fullFormattedText: string;
  allRapsText: string;
}

export function parseCourseCompetency(
  courseTitle: string,
  rawDesc?: string | null,
  periodName?: string,
  programName?: string,
  weeklyHours?: number
): ParsedCompetencyData {
  const desc = (rawDesc || "").trim();
  if (!desc) {
    return {
      competenciaTitle: "No se ha registrado una descripción o competencia para esta materia.",
      raps: [],
      rawDescription: "",
      allRapsText: "",
      fullFormattedText: `MATERIA: ${courseTitle}\n${periodName ? `PERIODO: ${periodName}\n` : ""}${weeklyHours ? `INTENSIDAD: ${weeklyHours}h / semana\n` : ""}Sin información de competencias disponible.`,
    };
  }

  // Detect RAP split index
  const rapDelimiterRegex = /(?:\b(?:RAP|Resultado(?:s)?(?:\s+de\s+aprendizaje)?|R\.A\.)\s*(?:\d+|[a-zA-Z0-9_-]+)?\s*[:\-])/i;
  const firstRapIndex = desc.search(rapDelimiterRegex);

  let compPart = desc;
  let rapsPart = "";

  if (firstRapIndex !== -1) {
    compPart = desc.slice(0, firstRapIndex).trim();
    rapsPart = desc.slice(firstRapIndex).trim();
  }

  // Extract Code if present: e.g. (Código: 220501098)
  let compCode: string | undefined;
  const codeRegex = /[\(\[](?:código|codigo|cód|cod)\s*:\s*([^()\[\]]+)[\)\]]/i;
  const codeMatch = compPart.match(codeRegex);
  if (codeMatch) {
    compCode = codeMatch[1].trim();
  }

  // Clean competence title: Remove leading "Competencia \d*:" or "Competencia:"
  let cleanComp = compPart.replace(/^competencia(?:\s*\d+)?\s*[:\-]\s*/i, "").trim();
  if (!cleanComp) {
    cleanComp = compPart || desc;
  }

  // Parse RAPs
  const raps: Array<{ id: string; label: string; text: string }> = [];
  if (rapsPart) {
    const markerRegex = /(\b(?:RAP|Resultado(?:s)?(?:\s+de\s+aprendizaje)?|R\.A\.)\s*(?:\d+|[a-zA-Z0-9_-]+)?\s*[:\-])/gi;
    const tokens = rapsPart.split(markerRegex).filter((t) => t.trim().length > 0);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].trim();
      if (markerRegex.test(token)) {
        const label = token.replace(/[:\-]$/, "").trim();
        const content = (tokens[i + 1] || "").trim();
        i++;
        if (content) {
          raps.push({
            id: `rap-${raps.length + 1}`,
            label: label || `RAP ${raps.length + 1}`,
            text: content,
          });
        }
      } else if (token) {
        raps.push({
          id: `rap-${raps.length + 1}`,
          label: `RAP ${raps.length + 1}`,
          text: token,
        });
      }
    }
  }

  if (rapsPart && raps.length === 0) {
    raps.push({
      id: "rap-1",
      label: "Resultado de Aprendizaje",
      text: rapsPart,
    });
  }

  const allRapsText = raps.map((r) => `${r.label}: ${r.text}`).join("\n\n");

  // Format full text for clipboard
  const lines: string[] = [];
  lines.push(`ASIGNATURA: ${courseTitle}`);
  if (programName) lines.push(`PROGRAMA: ${programName}`);
  if (periodName) lines.push(`PERIODO: ${periodName}`);
  if (weeklyHours) lines.push(`INTENSIDAD: ${weeklyHours}h / semana`);
  lines.push("");
  lines.push(`COMPETENCIA:`);
  lines.push(cleanComp);
  if (compCode) lines.push(`CÓDIGO COMPETENCIA: ${compCode}`);

  if (raps.length > 0) {
    lines.push("");
    lines.push(`RESULTADOS DE APRENDIZAJE (RAP):`);
    raps.forEach((r) => {
      lines.push(`• ${r.label}: ${r.text}`);
    });
  }

  return {
    competenciaTitle: cleanComp,
    competenciaCode: compCode,
    raps,
    rawDescription: desc,
    allRapsText,
    fullFormattedText: lines.join("\n"),
  };
}

interface CourseCompetencyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    id: string;
    title: string;
    description?: string | null;
    weeklyHours?: number;
    badge?: string | null;
    badgeColor?: string | null;
  } | null;
  periodName?: string;
  programName?: string;
  programCode?: string;
}

export function CourseCompetencyModal({
  open,
  onOpenChange,
  course,
  periodName,
  programName,
  programCode,
}: CourseCompetencyModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!course) return null;

  const parsed = parseCourseCompetency(
    course.title,
    course.description,
    periodName,
    programName,
    course.weeklyHours
  );

  const handleCopy = async (text: string, key: string, label: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      toast.success(`${label} copiado al portapapeles`);
      setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2000);
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/70 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {periodName && (
                  <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-background/80">
                    {periodName}
                  </Badge>
                )}
                {programCode && (
                  <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5">
                    {programCode}
                  </Badge>
                )}
                {course.weeklyHours ? (
                  <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                    <Clock className="w-3 h-3 mr-1" />
                    {course.weeklyHours}h / semana
                  </Badge>
                ) : null}
                {course.badge && (
                  <Badge variant="secondary" className="text-[10px] font-semibold bg-muted/60">
                    {course.badge}
                  </Badge>
                )}
              </div>

              <DialogTitle className="text-base sm:text-lg font-black text-foreground tracking-tight line-clamp-2">
                {course.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Información técnica, competencia laboral y resultados de aprendizaje curricular.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. SECCIÓN COMPETENCIA */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Competencia Laboral
                </h3>
                {parsed.competenciaCode && (
                  <Badge variant="outline" className="text-[10px] font-mono font-semibold px-2 py-0">
                    <Hash className="w-2.5 h-2.5 mr-0.5" /> Código: {parsed.competenciaCode}
                  </Badge>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopy(
                    parsed.competenciaCode
                      ? `${parsed.competenciaTitle} (Código: ${parsed.competenciaCode})`
                      : parsed.competenciaTitle,
                    "comp",
                    "Competencia"
                  )
                }
                className="h-7 text-xs font-semibold gap-1.5 rounded-xl border-border/80 hover:bg-primary/10 hover:text-primary transition-all"
              >
                {copiedKey === "comp" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 font-bold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar Competencia</span>
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 hover:border-border transition-colors">
              <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">
                {parsed.competenciaTitle}
              </p>
            </div>
          </div>

          {/* 2. SECCIÓN RESULTADOS DE APRENDIZAJE (RAP) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Resultados de Aprendizaje (RAP)
                </h3>
                {parsed.raps.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0">
                    {parsed.raps.length} {parsed.raps.length === 1 ? "Resultado" : "Resultados"}
                  </Badge>
                )}
              </div>

              {parsed.raps.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(parsed.allRapsText, "all-raps", "Resultados de aprendizaje")}
                  className="h-7 text-xs font-semibold gap-1.5 rounded-xl border-border/80 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all"
                >
                  {copiedKey === "all-raps" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 font-bold">Copiados</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar Todos los RAPs</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {parsed.raps.length > 0 ? (
              <div className="space-y-2.5">
                {parsed.raps.map((rap, index) => {
                  const rapCopyKey = `rap-${index}`;
                  return (
                    <div
                      key={rap.id}
                      className="p-3.5 rounded-2xl bg-card border border-border/70 hover:border-emerald-500/40 hover:shadow-xs transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <span className="inline-block text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          {rap.label}
                        </span>
                        <p className="text-xs text-foreground/90 leading-relaxed font-normal">
                          {rap.text}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleCopy(`${rap.label}: ${rap.text}`, rapCopyKey, rap.label)
                        }
                        title={`Copiar ${rap.label}`}
                        className="h-7 w-7 rounded-lg shrink-0 opacity-70 group-hover:opacity-100 hover:bg-emerald-500/10 hover:text-emerald-600"
                      >
                        {copiedKey === rapCopyKey ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground italic">
                  Esta materia no cuenta con resultados de aprendizaje (RAP) desglosados de forma individual.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 bg-muted/30 border-t border-border/70 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs w-full sm:w-auto"
          >
            Cerrar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleCopy(parsed.fullFormattedText, "full", "Ficha completa")}
            className="rounded-xl text-xs font-bold gap-2 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
          >
            {copiedKey === "full" ? (
              <>
                <Check className="w-3.5 h-3.5 text-primary-foreground" />
                <span>¡Copiado al Portapapeles!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Competencia y Resultados Completos</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
