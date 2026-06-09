import type { Categoria, Embal } from "@/features/catalog/types";
import type { StorageArea } from "@/features/storage/types";
import type { SupplierId } from "@/shared/lib/suppliers";

export interface ConsolidatedItem {
  materialId: string;
  tipo: string;
  embal: Embal;
  kgUnit: number;
  categoria: Categoria;
  fornecedor: SupplierId | null;
  colorCode: string | null;
  totalQtd: number; // Σ quantidade
  totalKg: number; // Σ quantidade * kgUnit
  qtds: number[]; // quantidades individuais por slot (para a Planilha Amarela)
}

export interface DashboardKpis {
  stockTotalKg: number; // Σ totalKg (tudo)
  volumePaletes: number; // Σ totalQtd onde kgUnit > 25
  tiposComSaldo: number; // itens com totalQtd > 0
}

export interface MaterialLocation {
  area: StorageArea;
  source: string; // nome humano da área ("Lado Direito", ...)
  label: string; // label do local
  qtd: number;
}
