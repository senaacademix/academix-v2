export interface SubmittedLinkItem {
    label: string;
    raw: string;
    url: string;
    slotIndex: number;
}

/**
 * Parses the instructor's configured link labels for an activity.
 * Each element in the array represents one expected submission link slot.
 */
export function parseActivityLinkLabels(
    rawLabels?: string | null,
    allowSubmissionLink: boolean = false
): string[] {
    if (rawLabels && rawLabels.trim().startsWith("[")) {
        try {
            const parsed = JSON.parse(rawLabels);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((item) => (typeof item === "string" ? item : String(item ?? "")));
            }
        } catch {
            // ignore JSON parse error and fallback
        }
    }
    return allowSubmissionLink ? [""] : [];
}

/**
 * Serializes the instructor's configured link labels to store in Activity.submissionLinkLabels.
 */
export function serializeActivityLinkLabels(
    labels: string[],
    allowSubmissionLink: boolean
): string | null {
    if (!allowSubmissionLink) return null;
    const clean = (labels.length > 0 ? labels : [""]).map((l) => (l || "").trim());
    return JSON.stringify(clean);
}

/**
 * Returns the display label for a given slot index.
 */
export function getSlotDisplayLabel(labels: string[], index: number): string {
    const custom = labels[index]?.trim();
    if (custom) return custom;
    return labels.length <= 1 ? "Enlace de entrega" : `Enlace ${index + 1}`;
}

export function normalizeExternalUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

/**
 * Parses the raw `StudentGrade.submissionLink` (which may be a legacy single URL string
 * or a JSON array) into an array of raw string values aligned with the activity's slots.
 */
export function getStudentSubmissionSlotValues(
    rawSubmissionLink?: string | null,
    rawActivityLabels?: string | null,
    allowSubmissionLink: boolean = true
): string[] {
    const labels = parseActivityLinkLabels(rawActivityLabels, allowSubmissionLink);
    const slotCount = Math.max(labels.length, 1);

    if (!rawSubmissionLink || !rawSubmissionLink.trim()) {
        return Array(slotCount).fill("");
    }

    const trimmed = rawSubmissionLink.trim();
    let parsedValues: string[] = [];

    if (trimmed.startsWith("[")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                parsedValues = parsed.map((item) => {
                    if (typeof item === "string") return item.trim();
                    if (item && typeof item === "object" && typeof item.url === "string") {
                        return item.url.trim();
                    }
                    return "";
                });
            }
        } catch {
            parsedValues = [trimmed];
        }
    } else {
        parsedValues = [trimmed];
    }

    const totalSlots = Math.max(slotCount, parsedValues.length);
    const result: string[] = [];
    for (let i = 0; i < totalSlots; i++) {
        result.push(parsedValues[i] || "");
    }
    return result;
}

/**
 * Parses a student's submission into non-empty SubmittedLinkItem objects for display.
 */
export function parseStudentSubmissionLinks(
    rawSubmissionLink?: string | null,
    rawActivityLabels?: string | null
): SubmittedLinkItem[] {
    if (!rawSubmissionLink || !rawSubmissionLink.trim()) return [];

    const labels = parseActivityLinkLabels(rawActivityLabels, true);
    const trimmed = rawSubmissionLink.trim();

    if (trimmed.startsWith("[")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                const items: SubmittedLinkItem[] = [];
                parsed.forEach((entry, idx) => {
                    let rawUrl = "";
                    let customLabel = "";
                    if (typeof entry === "string") {
                        rawUrl = entry.trim();
                    } else if (entry && typeof entry === "object") {
                        rawUrl = typeof entry.url === "string" ? entry.url.trim() : "";
                        customLabel = typeof entry.label === "string" ? entry.label.trim() : "";
                    }
                    if (rawUrl) {
                        items.push({
                            label: customLabel || getSlotDisplayLabel(labels, idx),
                            raw: rawUrl,
                            url: normalizeExternalUrl(rawUrl),
                            slotIndex: idx
                        });
                    }
                });
                return items;
            }
        } catch {
            // fallback to single link below
        }
    }

    return [
        {
            label: getSlotDisplayLabel(labels, 0),
            raw: trimmed,
            url: normalizeExternalUrl(trimmed),
            slotIndex: 0
        }
    ];
}

/**
 * Serializes the student's submitted link inputs to save in StudentGrade.submissionLink.
 */
export function serializeStudentSubmissionLinks(
    links: string[],
    rawActivityLabels?: string | null
): string | null {
    const labels = parseActivityLinkLabels(rawActivityLabels, true);
    const cleaned = links.map((l) => (l || "").trim());
    const hasAny = cleaned.some((l) => l.length > 0);
    if (!hasAny) return null;

    if (cleaned.length === 1 && labels.length <= 1) {
        return cleaned[0];
    }

    const payload = cleaned.map((url, idx) => ({
        label: getSlotDisplayLabel(labels, idx),
        url
    }));
    return JSON.stringify(payload);
}

