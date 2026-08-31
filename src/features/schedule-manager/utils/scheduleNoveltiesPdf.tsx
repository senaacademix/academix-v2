import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCalendarDate } from "@/lib/dateUtils";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1E293B",
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#0284C7",
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 3,
  },
  table: {
    display: "flex",
    width: "auto",
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    minHeight: 22,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#0F172A",
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  colNum: { width: "6%", textAlign: "center" },
  colScope: { width: "22%", paddingLeft: 4 },
  colType: { width: "22%", paddingLeft: 4 },
  colTitle: { width: "26%", paddingLeft: 4 },
  colDates: { width: "24%", textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 6,
  },
});

interface NoveltiesPdfProps {
  scheduleName: string;
  dateRangeStr: string;
  novelties: any[];
}

export function NoveltiesPdfDocument({ scheduleName, dateRangeStr, novelties }: NoveltiesPdfProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>REPORTE DE NOVEDADES DE HORARIO - {scheduleName}</Text>
          <Text style={styles.subtitle}>
            Período: {dateRangeStr} | Generado el: {format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
          </Text>
        </View>

        {/* Table Header */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.colNum, { color: "#FFF" }]}>#</Text>
          <Text style={[styles.colScope, { color: "#FFF" }]}>Ámbito / Ficha</Text>
          <Text style={[styles.colType, { color: "#FFF" }]}>Tipo de Novedad</Text>
          <Text style={[styles.colTitle, { color: "#FFF" }]}>Título / Motivo</Text>
          <Text style={[styles.colDates, { color: "#FFF" }]}>Fechas (Inicio - Fin)</Text>
        </View>

        {/* Table Rows */}
        {novelties.map((n, idx) => {
          const startFmt = formatCalendarDate(n.startDate, "dd/MM/yyyy");
          const endFmt = formatCalendarDate(n.endDate, "dd/MM/yyyy");
          const scopeStr = n.isGeneral ? "🌐 Todas las Fichas" : `Ficha ${n.group?.name || "Sin Ficha"}`;

          return (
            <View key={n.id || idx} style={styles.tableRow}>
              <Text style={styles.colNum}>{idx + 1}</Text>
              <Text style={styles.colScope}>{scopeStr}</Text>
              <Text style={styles.colType}>{n.type}</Text>
              <Text style={styles.colTitle}>{n.title}</Text>
              <Text style={styles.colDates}>
                {startFmt === endFmt ? startFmt : `${startFmt} - ${endFmt}`}
              </Text>
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text>AcademiX System — Plataforma Integral de Gestión Académica y Horarios</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateAndDownloadNoveltiesPdf(
  scheduleName: string,
  dateRangeStr: string,
  novelties: any[]
) {
  const doc = <NoveltiesPdfDocument scheduleName={scheduleName} dateRangeStr={dateRangeStr} novelties={novelties} />;
  const asBlob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(asBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Reporte_Novedades_${scheduleName.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
