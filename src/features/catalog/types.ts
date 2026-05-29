import type { SupplierId } from "@/shared/lib/suppliers";

export type Categoria = "PADRAO" | "MASTER" | "ADITIVO";
export type Embal = "SC" | "BB";

export interface Material {
  id: string;
  tipo: string;
  embal: Embal;
  kg: number;
  categoria: Categoria;
  colorCode: string | null;
  fornecedor: SupplierId | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MaterialInput = Omit<Material, "id" | "createdAt" | "updatedAt">;
