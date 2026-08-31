import ExcelJS from "exceljs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCalendarDate } from "@/lib/dateUtils";

export async function generateAndDownloadNoveltiesExcel(
  scheduleName: string,
  dateRangeStr: string,
  novelties: any[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AcademiX System";
  workbook.lastModifiedBy = "AcademiX System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Novedades de Horario");

  // Title Row
  worksheet.mergeCells("A1:G1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `REPORTE CONSOLIDADO DE NOVEDADES DE HORARIO - ${scheduleName.toUpperCase()}`;
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 30;

  // Subtitle
  worksheet.mergeCells("A2:G2");
  const subCell = worksheet.getCell("A2");
  subCell.value = `Vigencia: ${dateRangeStr} | Generado el: ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`;
  subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF475569" } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]); // Blank row

  // Table Headers
  const headerRow = worksheet.addRow([
    "#",
    "Ámbito / Ficha",
    "Tipo de Novedad",
    "Título / Motivo",
    "Fecha Inicio",
    "Fecha Fin",
    "Aula Destino",
  ]);
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF0284C7" } },
    };
  });

  // Data Rows
  novelties.forEach((n, idx) => {
    const startStr = formatCalendarDate(n.startDate, "dd/MM/yyyy");
    const endStr = formatCalendarDate(n.endDate, "dd/MM/yyyy");
    const scopeStr = n.isGeneral ? "🌐 Todas las Fichas" : `Ficha ${n.group?.name || "Sin Ficha"}`;
    const envStr = n.newEnvironment?.name || "N/A";

    const row = worksheet.addRow([
      idx + 1,
      scopeStr,
      n.type,
      n.title,
      startStr,
      endStr,
      envStr,
    ]);

    row.height = 20;

    row.eachCell((cell, colIndex) => {
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = {
        vertical: "middle",
        horizontal: colIndex === 1 || colIndex === 5 || colIndex === 6 ? "center" : "left",
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  // Auto-fit Column Widths
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value ? String(cell.value).length : 0;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });
    column.width = Math.min(maxLength + 4, 40);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Reporte_Novedades_${scheduleName.replace(/\s+/g, "_")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
