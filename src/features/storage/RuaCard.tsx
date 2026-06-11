import { useRole } from "@/features/auth/useRole";
import type { Material } from "@/features/catalog/types";
import { RoadBadge } from "@/shared/components/RoadBadge";
import { SUPPLIERS } from "@/shared/lib/suppliers";
import { CheckCircle2 } from "lucide-react";
import { EmptySlotRow, FilledSlotRow } from "./SlotRows";
import type { Slot, StorageLocation } from "./types";
import { useStorageMutations } from "./useStorage";
import { isVerifiedToday } from "./verification";

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
  const { setSlotMaterial, setSlotQuantidade, setRuaVerificada } =
    useStorageMutations();

  const { id, rua, label, slots, verifiedOn } = location;
  const accentColor = ruaAccentColor(slots);
  const verified = isVerifiedToday(verifiedOn);

  const handleSelectMaterial = (i: number, m: Material | null) =>
    setSlotMaterial(id, i, m);
  const handleSaveQty = (i: number, qty: number) =>
    setSlotQuantidade(id, i, qty);

  // Linha vazia só para admin (reader só visualiza)
  const showEmptyRow = isAdmin && slots.length < 4;

  return (
    <div
      className={`bg-card text-card-foreground overflow-hidden rounded-xl border shadow-sm`}
      style={{ borderLeftColor: accentColor, borderLeftWidth: 4 }}
    >
      <div
        className={`mb-2 flex items-center gap-3 px-3 pt-3 pb-2 transition-colors ${verified ? "bg-green-500/10" : ""}`}
      >
        <RoadBadge
          letter={rua ?? label}
          className={verified ? "bg-green-600 dark:bg-green-700" : undefined}
        />
        <span
          className={`text-sm font-semibold transition-colors ${verified ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}
        >
          {label}
        </span>
        {isAdmin && (
          <button
            className={`hover:bg-accent ml-auto flex h-8 w-8 items-center justify-center rounded transition-colors ${verified ? "text-green-500" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
            onClick={() => setRuaVerificada(id, !verified)}
            title={verified ? "Desmarcar conferência" : "Marcar como conferida"}
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>
        )}
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
