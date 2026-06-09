import ExcelJS from "exceljs";
import type { Borders } from "exceljs";
import type { PlanilhaData, PlanilhaRow } from "./types";

const YELLOW = "FFFFFF00";
const PINK = "FFFCE4EC"; // masters
const PURPLE = "FFEDE7F6"; // aditivos

const THIN_BORDER: Partial<Borders> = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
};

const QTD_COLS = 10;
const TOTAL_COLS = 3 + QTD_COLS + 2; // TIPO/EMBAL/KG + 10 qtd + TOTAL(UNID)/TOTAL

function solid(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function rowFill(row: PlanilhaRow): string | null {
  if (row.categoria === "MASTER") return PINK;
  if (row.categoria === "ADITIVO") return PURPLE;
  return null;
}

function formatDatePtBr(dateISO: string): string {
  const [y, m, d] = dateISO.split("-");
  return `${d}/${m}/${y}`;
}

export async function exportPlanilhaXlsx(
  data: PlanilhaData,
  dateISO: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Planilha Amarela");

  // Larguras: TIPO larga, qtd estreitas.
  ws.columns = [
    { width: 38 }, // TIPO
    { width: 8 }, // EMBAL
    { width: 10 }, // KG
    ...Array.from({ length: QTD_COLS }, () => ({ width: 5 })),
    { width: 14 }, // TOTAL (UNID)
    { width: 14 }, // TOTAL
  ];

  // ── Linha 1: título + data (merge) ─────────────────────────────────────────
  ws.mergeCells(1, 1, 1, TOTAL_COLS);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `PLANILHA AMARELA — ${formatDatePtBr(dateISO)}`;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = solid(YELLOW);
  for (let c = 1; c <= TOTAL_COLS; c++) ws.getCell(1, c).border = THIN_BORDER;

  // ── Linha 2: cabeçalho de colunas ──────────────────────────────────────────
  const header = [
    "TIPO",
    "EMBAL",
    "KG",
    ...Array.from({ length: QTD_COLS }, (_, i) => String(i + 1)),
    "TOTAL (UNID)",
    "TOTAL",
  ];
  const headerRow = ws.getRow(2);
  header.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = solid(YELLOW);
    cell.border = THIN_BORDER;
  });

  // ── Linhas de dados ────────────────────────────────────────────────────────
  let r = 3;
  for (const row of data.rows) {
    const xlRow = ws.getRow(r);
    const fill = rowFill(row);

    const tipoCell = xlRow.getCell(1);
    tipoCell.value = row.tipo;
    tipoCell.alignment = { horizontal: "left", vertical: "middle" };

    xlRow.getCell(2).value = row.embal;
    xlRow.getCell(2).alignment = { horizontal: "center" };

    const kgCell = xlRow.getCell(3);
    kgCell.value = row.kgUnit;
    kgCell.numFmt = "#,##0";
    kgCell.alignment = { horizontal: "right" };

    row.qtds.forEach((q, i) => {
      const cell = xlRow.getCell(4 + i);
      cell.value = q ?? null;
      cell.alignment = { horizontal: "center" };
    });

    const totalUnidCell = xlRow.getCell(4 + QTD_COLS);
    totalUnidCell.value = row.totalUnid;
    totalUnidCell.numFmt = row.isSaco ? '#,##0" scs"' : "#,##0";
    totalUnidCell.alignment = { horizontal: "right" };

    const totalKgCell = xlRow.getCell(5 + QTD_COLS);
    totalKgCell.value = row.totalKg;
    totalKgCell.numFmt = "#,##0";
    totalKgCell.alignment = { horizontal: "right" };

    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = xlRow.getCell(c);
      cell.border = THIN_BORDER;
      if (fill) cell.fill = solid(fill);
    }
    r++;
  }

  // ── Linha TOTAIS ───────────────────────────────────────────────────────────
  const totalsRowIdx = r;
  ws.mergeCells(totalsRowIdx, 1, totalsRowIdx, 3 + QTD_COLS);
  const labelCell = ws.getCell(totalsRowIdx, 1);
  labelCell.value = "TOTAIS (paletes — exclui sacos)";
  labelCell.font = { bold: true };
  labelCell.alignment = { horizontal: "right", vertical: "middle" };

  const totUnidCell = ws.getCell(totalsRowIdx, 4 + QTD_COLS);
  totUnidCell.value = data.totalUnidPaletes;
  totUnidCell.numFmt = "#,##0";
  totUnidCell.font = { bold: true };
  totUnidCell.alignment = { horizontal: "right" };

  const totKgCell = ws.getCell(totalsRowIdx, 5 + QTD_COLS);
  totKgCell.value = data.totalKg;
  totKgCell.numFmt = "#,##0";
  totKgCell.font = { bold: true };
  totKgCell.alignment = { horizontal: "right" };

  for (let c = 1; c <= TOTAL_COLS; c++) {
    const cell = ws.getCell(totalsRowIdx, c);
    cell.border = THIN_BORDER;
    cell.fill = solid(YELLOW);
  }

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Planilha_Amarela_${dateISO}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
