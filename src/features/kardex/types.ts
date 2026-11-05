import type { Embal } from "@/features/catalog/types";

// ENTRADA/SAIDA = externa (muda o total armazenado); TRANSF_* = interna
// (troca de local). Docs antigos só têm ENTRADA/SAIDA, logo contam como externos.
export type KardexTipo =
  | "ENTRADA"
  | "SAIDA"
  | "TRANSF_ENTRADA"
  | "TRANSF_SAIDA";

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
  tipos?: KardexTipo[];
}
