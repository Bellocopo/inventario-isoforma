import { useState } from "react";
import { RoadBadge } from "@/shared/components/RoadBadge";
import { EmbalBadge } from "@/shared/components/EmbalBadge";
import { MaterialCombobox } from "@/shared/components/MaterialCombobox";
import { SUPPLIERS } from "@/shared/lib/suppliers";
import { useRole } from "@/features/auth/useRole";
import { useStorageMutations } from "./useStorage";
import type { Slot, StorageLocation } from "./types";
import type { Material } from "@/features/catalog/types";

function ruaAccentColor(slots: Slot[]): string {
  const first = slots[0];
  if (!first) return SUPPLIERS.none.bg;
  if (first.materialSnapshot.colorCode) return first.materialSnapshot.colorCode;
  return SUPPLIERS[first.materialSnapshot.fornecedor ?? "none"].bg;
}

function formatKg(qtd: number, kgUnit: number): string {
  return (qtd * kgUnit).toLocaleString("pt-BR") + " kg";
}

function slotSwatchColor(slot: Slot): string {
  if (slot.materialSnapshot.colorCode) return slot.materialSnapshot.colorCode;
  return SUPPLIERS[slot.materialSnapshot.fornecedor ?? "none"].bg;
}

// ── Linha de slot preenchido ─────────────────────────────────────────────────

interface FilledSlotRowProps {
  slot: Slot;
  slotIndex: number;
  isAdmin: boolean;
  onSelectMaterial: (i: number, m: Material | null) => void;
  onSaveQty: (i: number, qty: number) => void;
}

function FilledSlotRow({
  slot,
  slotIndex,
  isAdmin,
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

interface EmptySlotRowProps {
  slotIndex: number;
  isAdmin: boolean;
  onSelectMaterial: (i: number, m: Material | null) => void;
}

function EmptySlotRow({
  slotIndex,
  isAdmin,
  onSelectMaterial,
}: EmptySlotRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <MaterialCombobox
          value={null}
          onSelect={(m) => onSelectMaterial(slotIndex, m)}
          disabled={!isAdmin}
        />
      </div>
    </div>
  );
}

// ── RuaCard ──────────────────────────────────────────────────────────────────

interface RuaCardProps {
  location: StorageLocation;
}

export function RuaCard({ location }: RuaCardProps) {
  const { isAdmin } = useRole();
  const { setSlotMaterial, setSlotQuantidade } = useStorageMutations();

  const { id, rua, label, slots } = location;
  const accentColor = ruaAccentColor(slots);

  const handleSelectMaterial = (i: number, m: Material | null) =>
    setSlotMaterial(id, i, m);
  const handleSaveQty = (i: number, qty: number) =>
    setSlotQuantidade(id, i, qty);

  // Linha vazia só para admin (reader só visualiza)
  const showEmptyRow = isAdmin && slots.length < 4;

  return (
    <div
      className="bg-card text-card-foreground overflow-hidden rounded-xl border shadow-sm"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 4 }}
    >
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        <RoadBadge letter={rua ?? label} />
        <span className="text-muted-foreground text-sm font-semibold">
          {label}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 px-3 pb-3">
        {slots.map((slot, i) => (
          <FilledSlotRow
            key={slot.materialId + i}
            slot={slot}
            slotIndex={i}
            isAdmin={isAdmin}
            onSelectMaterial={handleSelectMaterial}
            onSaveQty={handleSaveQty}
          />
        ))}
        {showEmptyRow && (
          <EmptySlotRow
            slotIndex={slots.length}
            isAdmin={isAdmin}
            onSelectMaterial={handleSelectMaterial}
          />
        )}
      </div>
    </div>
  );
}
