import type { Embal } from "@/features/catalog/types";

export type KardexTipo = "ENTRADA" | "SAIDA";

export interface KardexEntry {
  id: string;
  timestamp: Date;
  materialId: string;
  materialSnapshot: { tipo: string; embal: Embal; kgUnit: number };
  locationId: string;
  locationLabel: string;
  tipo: KardexTipo;
  qtd: number;
  kgTotal: number;
  userId: string;
  userDisplay: string;
}

export type KardexEntryInput = Omit<KardexEntry, "id" | "timestamp">;

export interface KardexFilters {
  materialId?: string;
  locationId?: string;
  tipo?: KardexTipo;
}
