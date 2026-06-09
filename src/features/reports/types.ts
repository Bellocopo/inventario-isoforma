import type { Categoria, Embal } from "@/features/catalog/types";

export interface PlanilhaRow {
  tipo: string;
  embal: Embal;
  kgUnit: number;
  categoria: Categoria;
  colorCode: string | null;
  qtds: (number | null)[]; // exatamente 10 (excedente somado na 10ª; pad com null)
  totalUnid: number; // item.totalQtd
  isSaco: boolean;
  totalKg: number; // item.totalKg
}

export interface PlanilhaData {
  rows: PlanilhaRow[];
  totalUnidPaletes: number; // computeKpis.volumePaletes
  totalKg: number; // computeKpis.stockTotalKg
}
