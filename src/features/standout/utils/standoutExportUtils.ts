import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { StandoutNominationDTO, formatStandoutCategoryLabel } from "../types";
import { formatSafeDate } from "@/features/committee/utils/dateUtils";

interface ConsolidatedExportRow {
    studentId: string;
    studentName: string;
    studentDocument: string;
    studentEmail: string;
    groupName: string;
    groupSchedule: string;
    categories: string;
    meritText: string;
    recognitionDecision: string;
    instructors: string;
    evidenceUrls: string;
    latestDate: string;
    nominationsCount: number;
}

function consolidateNominationsByStudent(nominations: StandoutNominationDTO[]): ConsolidatedExportRow[] {
    const map = new Map<string, StandoutNominationDTO[]>();
    for (const nom of nominations) {
        const key = nom.studentId || nom.id;
        const list = map.get(key) || [];
        list.push(nom);
        map.set(key, list);
    }

    return Array.from(map.entries()).map(([studentId, list]) => {
        const primary = list[0];
        const uniqueCategories = Array.from(
            new Set(list.map((n) => formatStandoutCategoryLabel(n.category, n.customCategory)))
        ).join(", ");

        const uniqueInstructors = Array.from(
            new Set(list.map((n) => n.nominatedByName).filter(Boolean))
        ).join(", ");

        const meritParts = list
            .map((n) => {
                const text = [n.reason, n.achievements].filter(Boolean).join(" — ");
                if (!text) return null;
                return list.length > 1 ? `[${n.nominatedByName}]: ${text}` : text;
            })
            .filter(Boolean);

        const decision = list.find((n) => n.recognitionDecision)?.recognitionDecision || "Postulado";
        const evidenceUrls = Array.from(new Set(list.map((n) => n.evidenceUrl).filter(Boolean))).join(" | ") || "-";

        return {
            studentId,
            studentName: primary.studentName,
            studentDocument: primary.studentDocument || "S/I",
            studentEmail: primary.studentEmail,
            groupName: primary.groupName,
            groupSchedule: primary.groupSchedule || "S/I",
            categories: uniqueCategories,
            meritText: meritParts.join(" | ") || "Sin observaciones adicionales",
            recognitionDecision: decision,
            instructors: uniqueInstructors,
            evidenceUrls,
            latestDate: formatSafeDate(primary.createdAt),
            nominationsCount: list.length
        };
    });
}

export async function exportStandoutNominationsToExcel(
    nominations: StandoutNominationDTO[],
    processTitle: string = "Aprendices Destacados"
) {
    const consolidated = consolidateNominationsByStudent(nominations);
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Aprendices Destacados");

    ws.addRow(["CONSOLIDADO DE APRENDICES DESTACADOS — ACADEMIX"]);
    ws.addRow([`Convocatoria: ${processTitle}`]);
    ws.addRow([`Aprendices Destacados: ${consolidated.length} (Total Postulaciones: ${nominations.length})`]);
    ws.addRow([]);

    const headers = [
        "N°",
        "Aprendiz",
        "Identificación",
        "Correo Electrónico",
        "Ficha",
        "Horario",
        "Categoría(s) / Mérito",
        "Motivo de Postulación",
        "Postulado por (Instructores)",
        "N° Postulaciones",
        "Fecha"
    ];

    const headerRow = ws.addRow(headers);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0D9488" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    consolidated.forEach((row, idx) => {
        ws.addRow([
            idx + 1,
            row.studentName,
            row.studentDocument,
            row.studentEmail,
            row.groupName,
            row.groupSchedule,
            row.categories,
            row.meritText,
            row.instructors,
            row.nominationsCount,
            row.latestDate
        ]);
    });

    ws.columns.forEach((col, index) => {
        col.width = index === 7 ? 45 : index === 0 ? 6 : 24;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Aprendices_Destacados_${processTitle.replace(/\s+/g, "_").slice(0, 40)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.appendChild(link);
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportStandoutNominationsToPdf(
    nominations: StandoutNominationDTO[],
    processTitle: string = "Aprendices Destacados"
) {
    const consolidated = consolidateNominationsByStudent(nominations);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("CUADRO DE HONOR Y APRENDICES DESTACADOS — ACADEMIX", 14, 16);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(
        `Convocatoria: ${processTitle} | Aprendices Postulados: ${consolidated.length} (${nominations.length} postulaciones)`,
        14,
        23
    );

    const rows = consolidated.map((row, idx) => [
        idx + 1,
        row.studentName,
        row.studentDocument,
        row.groupName,
        row.categories,
        row.meritText,
        row.nominationsCount > 1 ? `${row.instructors} (${row.nominationsCount})` : row.instructors
    ]);

    autoTable(doc, {
        startY: 28,
        head: [["#", "Aprendiz", "Documento", "Ficha", "Categoría(s)", "Méritos y Logros", "Instructores"]],
        body: rows.length > 0 ? rows : [["-", "Sin postulaciones registradas", "-", "-", "-", "-", "-"]],
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 253, 250] }
    });

    doc.save(`Aprendices_Destacados_${processTitle.replace(/\s+/g, "_").slice(0, 40)}.pdf`);
}

