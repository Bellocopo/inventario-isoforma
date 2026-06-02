import { RoadBadge } from "@/shared/components/RoadBadge";
import { SUPPLIERS } from "@/shared/lib/suppliers";
import { useRole } from "@/features/auth/useRole";
import { useStorageMutations } from "./useStorage";
import { FilledSlotRow, EmptySlotRow } from "./SlotRows";
import type { Slot, StorageLocation } from "./types";
import type { Material } from "@/features/catalog/types";

function ruaAccentColor(slots: Slot[]): string {
  const first = slots[0];
  if (!first) return SUPPLIERS.none.bg;
  if (first.materialSnapshot.colorCode) return first.materialSnapshot.colorCode;
  return SUPPLIERS[first.materialSnapshot.fornecedor ?? "none"].bg;
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
