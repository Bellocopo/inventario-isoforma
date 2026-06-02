import { useState } from "react";
import { EmbalBadge } from "@/shared/components/EmbalBadge";
import { MaterialCombobox } from "@/shared/components/MaterialCombobox";
import { SUPPLIERS } from "@/shared/lib/suppliers";
import type { Slot } from "./types";
import type { Material } from "@/features/catalog/types";
import type { Categoria } from "@/features/catalog/types";

export function formatKg(qtd: number, kgUnit: number): string {
  return (qtd * kgUnit).toLocaleString("pt-BR") + " kg";
}

export function slotSwatchColor(slot: Slot): string {
  if (slot.materialSnapshot.colorCode) return slot.materialSnapshot.colorCode;
  return SUPPLIERS[slot.materialSnapshot.fornecedor ?? "none"].bg;
}

// ── Linha de slot preenchido ─────────────────────────────────────────────────

export interface FilledSlotRowProps {
  slot: Slot;
  slotIndex: number;
  isAdmin: boolean;
  categoria?: Categoria;
  onSelectMaterial: (i: number, m: Material | null) => void;
  onSaveQty: (i: number, qty: number) => void;
}

export function FilledSlotRow({
  slot,
  slotIndex,
  isAdmin,
  categoria,
  onSelectMaterial,
  onSaveQty,
}: FilledSlotRowProps) {
  const [qty, setQty] = useState(slot.quantidade);

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        {isAdmin ? (
          <MaterialCombobox
            value={slot.materialId}
            categoria={categoria}
            onSelect={(m) => onSelectMaterial(slotIndex, m)}
          />
        ) : (
          <div className="flex h-8 items-center gap-1.5 truncate px-2 text-sm">
            <span
              className="inline-block size-3 shrink-0 rounded-sm border border-black/10"
              style={{ backgroundColor: slotSwatchColor(slot) }}
            />
            <span className="truncate">{slot.materialSnapshot.tipo}</span>
          </div>
        )}
      </div>
      {isAdmin ? (
        <input
          type="number"
          min={0}
          value={qty}
          onChange={(e) => setQty(Number(e.currentTarget.value))}
          onBlur={() => {
            if (!isNaN(qty) && qty >= 0) onSaveQty(slotIndex, qty);
          }}
          className="border-input bg-background h-8 w-16 rounded-md border px-2 text-right text-sm tabular-nums shadow-sm"
        />
      ) : (
        <span className="w-16 text-right text-sm tabular-nums">{qty}</span>
      )}
      <EmbalBadge type={slot.materialSnapshot.embal} className="shrink-0" />
      <span className="text-muted-foreground w-24 shrink-0 text-right text-xs tabular-nums">
        {formatKg(qty, slot.materialSnapshot.kgUnit)}
      </span>
    </div>
  );
}

// ── Linha vazia (novo slot) ──────────────────────────────────────────────────

export interface EmptySlotRowProps {
  slotIndex: number;
  isAdmin: boolean;
  categoria?: Categoria;
  onSelectMaterial: (i: number, m: Material | null) => void;
}

export function EmptySlotRow({
  slotIndex,
  isAdmin,
  categoria,
  onSelectMaterial,
}: EmptySlotRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <MaterialCombobox
          value={null}
          categoria={categoria}
          onSelect={(m) => onSelectMaterial(slotIndex, m)}
          disabled={!isAdmin}
        />
      </div>
    </div>
  );
}
