import { useRole } from "@/features/auth/useRole";
import type { Categoria, Material } from "@/features/catalog/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { SUPPLIERS } from "@/shared/lib/suppliers";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { EmptySlotRow, FilledSlotRow } from "./SlotRows";
import type { Slot, StorageLocation } from "./types";
import { useStorageMutations } from "./useStorage";

type LocalCardVariant = "neutral" | "masters" | "aditivos";

interface LocalCardProps {
  location: StorageLocation;
  categoria?: Categoria;
  variant: LocalCardVariant;
}

function localAccentColor(slots: Slot[]): string {
  const first = slots[0];
  if (!first) return SUPPLIERS.none.bg;
  if (first.materialSnapshot.colorCode) return first.materialSnapshot.colorCode;
  return SUPPLIERS[first.materialSnapshot.fornecedor ?? "none"].bg;
}

const HEADER_BG: Record<LocalCardVariant, string> = {
  neutral: "",
  masters: "bg-brand-pink/20",
  aditivos: "bg-brand-purple/20",
};

export function LocalCard({ location, categoria, variant }: LocalCardProps) {
  const { isAdmin } = useRole();
  const {
    setSlotMaterial,
    setSlotQuantidade,
    setLocationLabel,
    deleteLocation,
  } = useStorageMutations();

  const { id, label, slots } = location;
  const [localLabel, setLocalLabel] = useState(label);
  const accentColor = localAccentColor(slots);

  const handleSelectMaterial = (i: number, m: Material | null) =>
    setSlotMaterial(id, i, m);
  const handleSaveQty = (i: number, qty: number) =>
    setSlotQuantidade(id, i, qty);

  const showEmptyRow = isAdmin && slots.length < 4;

  return (
    <div
      className="bg-card text-card-foreground overflow-hidden rounded-xl border shadow-sm"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 4 }}
    >
      <div
        className={`flex items-center gap-2 px-3 pt-3 pb-2 ${HEADER_BG[variant]}`}
      >
        {isAdmin ? (
          <input
            value={localLabel}
            onChange={(e) => setLocalLabel(e.currentTarget.value)}
            onBlur={() => {
              const trimmed = localLabel.trim();
              if (trimmed && trimmed !== label) setLocationLabel(id, trimmed);
              else setLocalLabel(label);
            }}
            className="min-w-0 flex-1 truncate bg-transparent text-sm font-semibold outline-none focus:underline"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {label}
          </span>
        )}

        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-muted-foreground hover:text-destructive shrink-0 p-1 transition-colors">
                <Trash2 className="size-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir local</AlertDialogTitle>
                <AlertDialogDescription>
                  "{label}" e todos os materiais nele serão removidos. Essa ação
                  não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => deleteLocation(id)}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="flex flex-col gap-1.5 px-3 pb-3">
        {slots.map((slot, i) => (
          <FilledSlotRow
            key={slot.materialId + i}
            slot={slot}
            slotIndex={i}
            isAdmin={isAdmin}
            categoria={categoria}
            onSelectMaterial={handleSelectMaterial}
            onSaveQty={handleSaveQty}
          />
        ))}
        {showEmptyRow && (
          <EmptySlotRow
            slotIndex={slots.length}
            isAdmin={isAdmin}
            categoria={categoria}
            onSelectMaterial={handleSelectMaterial}
          />
        )}
      </div>
    </div>
  );
}
