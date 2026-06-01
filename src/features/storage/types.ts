import type { SupplierId } from "@/shared/lib/suppliers";
import type { Categoria, Embal } from "@/features/catalog/types";

export type { Categoria, Embal };

export type StorageArea =
  | "direito"
  | "esquerdo"
  | "fora"
  | "masters"
  | "aditivos";

export interface SlotSnapshot {
  tipo: string;
  embal: Embal;
  kgUnit: number;
  categoria: Categoria;
  fornecedor: SupplierId | null;
  colorCode: string | null;
}

export interface Slot {
  materialId: string;
  materialSnapshot: SlotSnapshot;
  quantidade: number;
}

export interface StorageLocation {
  id: string;
  area: StorageArea;
  rua: string | null;
  label: string;
  ordem: number;
  slots: Slot[];
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export type StorageLocationInput = Omit<
  StorageLocation,
  "id" | "createdAt" | "updatedAt"
>;
