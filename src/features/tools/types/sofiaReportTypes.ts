export interface ReportCell {
    value: string | number;
    bg?: string;
    note?: string;
    resultName?: string;
    isHeader?: boolean;
    colSpan?: number;
    rowSpan?: number;
    isLongText?: boolean;
}

export interface TimelineOutcomeItem {
    id: string;
    label?: string;
}

export interface TimelinePeriod {
    id: string;
    name: string;
    items: TimelineOutcomeItem[];
}

export interface TimelineConfig {
    type: "sofia-timeline";
    periods: {
        name: string;
        outcomes: (string | { id: string; label?: string })[];
    }[];
}

export interface SofiaReportDetails {
    date: string;
    id: string;
    code: string;
    version: string;
    programName: string;
    status: string;
    startDate: string;
    endDate: string;
    modality: string;
    regional: string;
    center: string;
}

export interface SofiaReportData {
    ficha: string;
    reportDetails?: SofiaReportDetails;
    rows: ReportCell[][];
}

export interface SofiaReportResult {
    success: boolean;
    message?: string;
    data?: SofiaReportData;
}

export interface SofiaProcessingResult {
    success: boolean;
    error?: string;
    message?: string;
    data?: SofiaReportData;
    warnings?: string[];
}

export interface ProcessedReportItem {
    id: string;
    fileName: string;
    fileSize: number;
    ficha: string;
    programName?: string;
    status?: string;
    totalApprentices: number;
    result: SofiaReportResult;
}

export interface CorporateExportCustomHeader {
    title?: string;
    ficha?: string;
    programName?: string;
    center?: string;
    regional?: string;
    instructor?: string;
    date?: string;
}

export interface CorporateExportOptions {
    scope?: "all" | "filtered";
    customHeader?: CorporateExportCustomHeader;
    customRows?: ReportCell[][];
}
