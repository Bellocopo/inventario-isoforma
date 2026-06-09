import { computeKpis } from "@/features/dashboard/aggregate";
import { isSaco } from "@/shared/lib/business";
import type { ConsolidatedItem } from "@/features/dashboard/types";
import type { PlanilhaData, PlanilhaRow } from "./types";

const QTD_COLS = 10;

// Distribui as quantidades em exatamente 10 colunas. Se houver mais de 10
// slots, o excedente (índices 9..) é somado na 10ª coluna; sobras viram null.
export function collapseQtds(qtds: number[]): (number | null)[] {
  const cols: (number | null)[] = new Array(QTD_COLS).fill(null);
  for (let i = 0; i < qtds.length; i++) {
    const col = Math.min(i, QTD_COLS - 1);
    cols[col] = (cols[col] ?? 0) + (qtds[i] ?? 0);
  }
  return cols;
}

export function buildPlanilha(items: ConsolidatedItem[]): PlanilhaData {
  const rows: PlanilhaRow[] = items.map((item) => ({
    tipo: item.tipo,
    embal: item.embal,
    kgUnit: item.kgUnit,
    categoria: item.categoria,
    colorCode: item.colorCode,
    qtds: collapseQtds(item.qtds),
    totalUnid: item.totalQtd,
    isSaco: isSaco(item.kgUnit),
    totalKg: item.totalKg,
  }));

  const kpis = computeKpis(items);

  return {
    rows,
    totalUnidPaletes: kpis.volumePaletes,
    totalKg: kpis.stockTotalKg,
  };
}
