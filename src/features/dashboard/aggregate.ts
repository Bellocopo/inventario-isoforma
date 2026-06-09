import { isPalete } from "@/shared/lib/business";
import type { Categoria } from "@/features/catalog/types";
import type { StorageArea, StorageLocation } from "@/features/storage/types";
import type {
  ConsolidatedItem,
  DashboardKpis,
  MaterialLocation,
} from "./types";

export const AREA_LABELS: Record<StorageArea, string> = {
  direito: "Lado Direito",
  esquerdo: "Lado Esquerdo",
  fora: "Fora do Local",
  masters: "Masters",
  aditivos: "Aditivos",
};

export function consolidate(locations: StorageLocation[]): ConsolidatedItem[] {
  const byMaterial = new Map<string, ConsolidatedItem>();

  for (const loc of locations) {
    for (const slot of loc.slots) {
      const snap = slot.materialSnapshot;
      const existing = byMaterial.get(slot.materialId);
      if (existing) {
        existing.totalQtd += slot.quantidade;
        existing.totalKg += slot.quantidade * snap.kgUnit;
        existing.qtds.push(slot.quantidade);
      } else {
        byMaterial.set(slot.materialId, {
          materialId: slot.materialId,
          tipo: snap.tipo,
          embal: snap.embal,
          kgUnit: snap.kgUnit,
          categoria: snap.categoria,
          fornecedor: snap.fornecedor,
          colorCode: snap.colorCode,
          totalQtd: slot.quantidade,
          totalKg: slot.quantidade * snap.kgUnit,
          qtds: [slot.quantidade],
        });
      }
    }
  }

  return [...byMaterial.values()]
    .filter((item) => item.totalQtd > 0)
    .sort((a, b) => b.totalKg - a.totalKg);
}

export function computeKpis(items: ConsolidatedItem[]): DashboardKpis {
  let stockTotalKg = 0;
  let volumePaletes = 0;
  for (const item of items) {
    stockTotalKg += item.totalKg;
    if (isPalete(item.kgUnit)) volumePaletes += item.totalQtd;
  }
  return {
    stockTotalKg,
    volumePaletes,
    tiposComSaldo: items.length,
  };
}

export function findLocations(
  locations: StorageLocation[],
  materialId: string,
): MaterialLocation[] {
  const result: MaterialLocation[] = [];
  for (const loc of locations) {
    for (const slot of loc.slots) {
      if (slot.materialId === materialId && slot.quantidade > 0) {
        result.push({
          area: loc.area,
          source: AREA_LABELS[loc.area],
          label: loc.label,
          qtd: slot.quantidade,
        });
      }
    }
  }
  return result;
}

export function byCategoria(
  items: ConsolidatedItem[],
  categoria: Categoria,
): ConsolidatedItem[] {
  return items.filter((item) => item.categoria === categoria);
}
