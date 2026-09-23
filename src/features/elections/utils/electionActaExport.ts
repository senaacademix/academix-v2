import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { GroupElectionDTO } from "../types";

export interface ActaLegalContent {
    legalDeclaration: string;
    responsibilitiesPrincipal: string[];
    responsibilitiesSuplente: string[];
}

export const ACTA_LEGAL_CONSTANTS: ActaLegalContent = {
    legalDeclaration: 
        "En constancia de lo actuado y en estricto cumplimiento de los principios democráticos institucionales y las disposiciones del Reglamento del Aprendiz SENA (Acuerdo 007 de 2012 y normatividad concordante), se certifica que la presente jornada de elección corresponde a un proceso de votación real, democrático, transparente, libre y secreto. El sufragio se llevó a cabo mediante el sistema de gestión institucional digital, asegurando un registro único e inalterable por cada aprendiz habilitado. Los resultados consignados en la presente acta reflejan fielmente la voluntad soberana del grupo de aprendices y gozan de plena validez jurídica e institucional.",
    responsibilitiesPrincipal: [
        "Velar permanente y activamente por los derechos, el bienestar y los legítimos intereses del grupo formativo.",
        "Actuar como canal oficial, permanente y asertivo de interlocución entre los aprendices de la ficha, el equipo de instructores y la coordinación académica.",
        "Compartir, notificar y difundir oportunamente la información académica, circulares institucionales, cronogramas y requerimientos en tiempos adecuados a la totalidad de sus compañeros.",
        "Participar con voz en las sesiones del Comité de Evaluación y Seguimiento de la ficha de formación cuando sea convocado.",
        "Fomentar el clima de respeto, armonía, trabajo colaborativo y sana convivencia dentro y fuera del ambiente de aprendizaje."
    ],
    responsibilitiesSuplente: [
        "Trabajar en estrecha articulación y brindar apoyo permanente al Vocero Principal en todas las gestiones de representación grupal.",
        "Asumir de forma inmediata y con plenas facultades la vocería del grupo ante ausencias temporales, justificadas o definitivas del Vocero Principal.",
        "Colaborar activamente en la recepción y difusión en tiempos adecuados de la información académica, orientaciones y circulares emitidas por el SENA."
    ]
};

export function exportElectionActaPDF(election: GroupElectionDTO) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);

    const electionDateStr = election.endedAt 
        ? format(new Date(election.endedAt), "d 'de' MMMM 'de' yyyy, hh:mm a", { locale: es })
        : (election.startedAt ? format(new Date(election.startedAt), "d 'de' MMMM 'de' yyyy, hh:mm a", { locale: es }) : format(new Date(), "d 'de' MMMM 'de' yyyy, hh:mm a", { locale: es }));
    
    const emissionDateStr = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

    // ── Header Institucional ──────────────────────────────────────────────
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 22, "F");

    // SENA Accent line (Emerald)
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 22, pageWidth, 2.5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SERVICIO NACIONAL DE APRENDIZAJE - SENA", margin, 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text("Dirección de Formación Profesional | Sistema AcademiX", margin, 15);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`ACTA NO. ELEC-${election.groupName.replace(/[^a-zA-Z0-9]/g, "")}-${format(new Date(election.endedAt || election.createdAt), "yyyyMMdd")}`, pageWidth - margin, 12, { align: "right" });

    let currentY = 32;

    // ── Document Title ───────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("ACTA OFICIAL DE ELECCIÓN Y POSESIÓN", margin, currentY);
    currentY += 5.5;

    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129); // emerald-600
    doc.text("VOCERÍA PRINCIPAL Y SUPLENTE DE GRUPO / FICHA", margin, currentY);
    currentY += 7;

    // ── Seccion 1: Datos Generales ───────────────────────────────────────
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, currentY, contentWidth, 36, 2.5, 2.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    const col1X = margin + 4;
    const col2X = margin + (contentWidth / 2) + 2;

    // Left Column
    doc.text("Ficha / Grupo:", col1X, currentY + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(election.groupName || "N/A", col1X + 24, currentY + 6);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Programa:", col1X, currentY + 13);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const progName = election.programName || "Formación Titulada";
    doc.text(progName.length > 34 ? progName.substring(0, 32) + "..." : progName, col1X + 18, currentY + 13);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Ambiente:", col1X, currentY + 20);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(election.environmentName || "Ambiente asignado de sede", col1X + 18, currentY + 20);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Módulo/Materia:", col1X, currentY + 27);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const modTitle = election.courseName || election.title || "Etapa Lectiva - Módulo Formativo";
    doc.text(modTitle.length > 32 ? modTitle.substring(0, 30) + "..." : modTitle, col1X + 27, currentY + 27);

    // Right Column
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Instructor Resp.:", col2X, currentY + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(election.createdByTeacherName || "Docente a cargo", col2X + 26, currentY + 6);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Identificación:", col2X, currentY + 13);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(election.createdByTeacherDoc ? `C.C. ${election.createdByTeacherDoc}` : (election.createdByTeacherEmail || "Registrado en sistema"), col2X + 23, currentY + 13);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Fecha Elección:", col2X, currentY + 20);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(electionDateStr, col2X + 25, currentY + 20);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Estado Jornada:", col2X, currentY + 27);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text("CONCLUIDA Y VALIDADA", col2X + 26, currentY + 27);

    currentY += 42;

    // ── Seccion 2: Métricas Oficiales de Escrutinio ────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("1. RESUMEN DE PARTICIPACIÓN Y CENSO ELECTORAL", margin, currentY);
    currentY += 3.5;

    const summaryCards = [
        { label: "Censo Electoral", val: `${election.tally.totalEligibleStudents} Aprendices` },
        { label: "Votantes Efectivos", val: `${election.tally.totalVotes} (${election.tally.participationRate}%)` },
        { label: "Candidatos", val: `${election.candidates.length} Postulados` },
        { label: "Voto en Blanco", val: `${election.tally.blankVotes} (${election.tally.blankVotesPercentage}%)` }
    ];

    const cardWidth = (contentWidth - 9) / 4;
    summaryCards.forEach((c, idx) => {
        const cx = margin + (idx * (cardWidth + 3));
        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.roundedRect(cx, currentY, cardWidth, 14, 2, 2, "FD");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(c.label, cx + (cardWidth / 2), currentY + 5, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(c.val, cx + (cardWidth / 2), currentY + 10.5, { align: "center" });
    });

    currentY += 19;

    // ── Seccion 3: Desglose de Votación y Candidatos ───────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("2. ESCRUTINIO OFICIAL POR CANDIDATO", margin, currentY);
    currentY += 2;

    // Build rows sorted by votes descending
    const sortedCandidates = [...election.candidates].sort((a, b) => b.votesCount - a.votesCount);
    const tableRows = sortedCandidates.map((c, index) => {
        let role = "Candidato";
        if (election.winners?.voceroPrincipal?.id === c.id) {
            role = "VOCERO PRINCIPAL (ELECTO)";
        } else if (election.winners?.voceroSuplente?.id === c.id) {
            role = "VOCERO SUPLENTE (ELECTO)";
        }

        return [
            `#${index + 1}`,
            c.name,
            c.identificacion ? `C.C./T.I. ${c.identificacion}` : c.email,
            c.votesCount.toString(),
            `${c.percentage}%`,
            role
        ];
    });

    // Add Blank vote row
    tableRows.push([
        "-",
        "VOTO EN BLANCO",
        "Opción democrática",
        election.tally.blankVotes.toString(),
        `${election.tally.blankVotesPercentage}%`,
        election.winners?.isBlankVoteWinner ? "MAYORÍA EN BLANCO" : "Neutral"
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [["Pos", "Candidato / Opción", "Documento / Contacto", "Votos", "% Total", "Asignación / Rol"]],
        body: tableRows,
        theme: "grid",
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontSize: 7.5,
            fontStyle: "bold",
            halign: "center"
        },
        bodyStyles: {
            fontSize: 7.5,
            textColor: [30, 41, 59]
        },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 50 },
            2: { cellWidth: 46 },
            3: { cellWidth: 16, halign: "center", fontStyle: "bold" },
            4: { cellWidth: 18, halign: "center", fontStyle: "bold" },
            5: { cellWidth: 42, fontStyle: "bold" }
        },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
            if (data.row.index === 0 && election.winners?.voceroPrincipal) {
                data.cell.styles.fillColor = [254, 243, 199]; // amber-100
                data.cell.styles.textColor = [146, 64, 14]; // amber-800
            } else if (data.row.index === 1 && election.winners?.voceroSuplente) {
                data.cell.styles.fillColor = [224, 242, 254]; // sky-100
                data.cell.styles.textColor = [3, 105, 161]; // sky-800
            }
        }
    });

    // @ts-expect-error - jspdf-autotable extends jsPDF instance
    currentY = doc.lastAutoTable.finalY + 6;

    // Check if remaining sections fit in current page; otherwise add new page
    if (currentY > 200) {
        doc.addPage();
        currentY = 20;
    }

    // ── Seccion 4: Declaración Legal ──────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("3. DECLARACIÓN Y CERTIFICACIÓN LEGAL DE AUTENTICIDAD", margin, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const legalLines = doc.splitTextToSize(ACTA_LEGAL_CONSTANTS.legalDeclaration, contentWidth);
    doc.text(legalLines, margin, currentY);
    currentY += (legalLines.length * 3.4) + 5;

    // ── Seccion 5: Responsabilidades de Vocero y Suplente ──────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("4. RESPONSABILIDADES Y COMPROMISOS INSTITUCIONALES", margin, currentY);
    currentY += 4.5;

    // Responsabilidades Vocero
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text("A. Deberes del Vocero Principal Electo:", margin, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    ACTA_LEGAL_CONSTANTS.responsibilitiesPrincipal.forEach((resp) => {
        const lines = doc.splitTextToSize(`•  ${resp}`, contentWidth - 4);
        doc.text(lines, margin + 2, currentY);
        currentY += (lines.length * 3.2);
    });

    currentY += 3;

    // Responsabilidades Suplente
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(3, 105, 161); // sky-700
    doc.text("B. Deberes del Vocero Suplente Electo:", margin, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    ACTA_LEGAL_CONSTANTS.responsibilitiesSuplente.forEach((resp) => {
        const lines = doc.splitTextToSize(`•  ${resp}`, contentWidth - 4);
        doc.text(lines, margin + 2, currentY);
        currentY += (lines.length * 3.2);
    });

    currentY += 7;

    // Ensure signatures fit on page or add page
    if (currentY > 235) {
        doc.addPage();
        currentY = 30;
    }

    // ── Seccion 6: Firmas de Constancia y Posesión ─────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("5. CONSTANCIA Y FIRMAS DE POSESIÓN", margin, currentY);
    currentY += 15;

    const sigWidth = (contentWidth - 16) / 3;
    const signers = [
        {
            role: "INSTRUCTOR A CARGO",
            name: election.createdByTeacherName || "Docente Responsable",
            sub: election.createdByTeacherDoc ? `C.C. ${election.createdByTeacherDoc}` : "Verificación Digital"
        },
        {
            role: "VOCERO PRINCIPAL",
            name: election.winners?.voceroPrincipal?.name || "Sin Asignar",
            sub: election.winners?.voceroPrincipal?.identificacion ? `C.C./T.I. ${election.winners.voceroPrincipal.identificacion}` : "Electo Democráticamente"
        },
        {
            role: "VOCERO SUPLENTE",
            name: election.winners?.voceroSuplente?.name || "Sin Asignar",
            sub: election.winners?.voceroSuplente?.identificacion ? `C.C./T.I. ${election.winners.voceroSuplente.identificacion}` : "Electo Democráticamente"
        }
    ];

    signers.forEach((s, idx) => {
        const sx = margin + (idx * (sigWidth + 8));
        
        // Signature line
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineWidth(0.4);
        doc.line(sx, currentY, sx + sigWidth, currentY);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(s.name, sx + (sigWidth / 2), currentY + 4.5, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(16, 185, 129);
        doc.text(s.role, sx + (sigWidth / 2), currentY + 8.5, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(s.sub, sx + (sigWidth / 2), currentY + 12, { align: "center" });
    });

    // ── Footer ───────────────────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `Acta generada el ${emissionDateStr} a través del Sistema AcademiX SENA | Página ${i} de ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 7,
            { align: "center" }
        );
    }

    // Save and download
    const cleanFileName = `Acta_Eleccion_Vocero_${election.groupName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    doc.save(cleanFileName);
}
