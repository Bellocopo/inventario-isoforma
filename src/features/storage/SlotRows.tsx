import type { Categoria, Material } from "@/features/catalog/types";
import { EmbalBadge } from "@/shared/components/EmbalBadge";
import { LocationCombobox } from "@/shared/components/LocationCombobox";
import { MaterialCombobox } from "@/shared/components/MaterialCombobox";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SUPPLIERS } from "@/shared/lib/suppliers";
import { ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import type { Slot } from "./types";

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
  onTransfer: (
    i: number,
    toLocationId: string,
    qty: number,
  ) => Promise<boolean>;
}

export function FilledSlotRow({
  slot,
  slotIndex,
  isAdmin,
  categoria,
  onSelectMaterial,
  onSaveQty,
  onTransfer,
}: FilledSlotRowProps) {
  const [qty, setQty] = useState(slot.quantidade);
  const [savedQty, setSavedQty] = useState(slot.quantidade);
  const [transferOpen, setTransferOpen] = useState(false);

  // Sincroniza o input quando o banco muda (ex.: transferência). Sem isso o
  // valor antigo seria regravado no blur como ENTRADA/SAÍDA externa.
  if (savedQty !== slot.quantidade) {
    setSavedQty(slot.quantidade);
    setQty(slot.quantidade);
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Seletor / nome — largura cheia do card para mostrar o nome completo */}
      <div className="min-w-0">
        {isAdmin ? (
          <MaterialCombobox
            value={slot.materialId}
            categoria={categoria}
            onSelect={(m) => onSelectMaterial(slotIndex, m)}
          />
        ) : (
          <div className="flex h-8 items-center gap-1.5 px-2 text-sm">
            <span
              className="inline-block size-3 shrink-0 rounded-sm border border-black/10"
              style={{ backgroundColor: slotSwatchColor(slot) }}
            />
            <span className="truncate">{slot.materialSnapshot.tipo}</span>
          </div>
        )}
      </div>
      {/* Quantidade (esquerda, 50%) + embalagem + peso (direita) */}
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(Number(e.currentTarget.value))}
            onBlur={() => {
              if (!isNaN(qty) && qty >= 0) onSaveQty(slotIndex, qty);
            }}
            className="border-input bg-background h-8 w-1/2 rounded-md border px-2 text-left text-sm tabular-nums shadow-sm"
          />
        ) : (
          <span className="w-1/2 text-left text-sm tabular-nums">{qty}</span>
        )}
        <EmbalBadge
          type={slot.materialSnapshot.embal}
          className="ml-auto shrink-0"
        />
        <span className="text-muted-foreground shrink-0 text-right text-xs tabular-nums">
          {formatKg(qty, slot.materialSnapshot.kgUnit)}
        </span>
        {isAdmin && slot.quantidade > 0 && (
          <button
            type="button"
            onClick={() => setTransferOpen(true)}
            title="Transferir para outro local"
            className="text-muted-foreground hover:text-foreground shrink-0 p-1 transition-colors"
          >
            <ArrowRightLeft className="size-4" />
          </button>
        )}
      </div>
      {transferOpen && (
        <TransferDialog
          slot={slot}
          onClose={() => setTransferOpen(false)}
          onConfirm={(toId, n) => onTransfer(slotIndex, toId, n)}
        />
      )}
    </div>
  );
}

// ── Transferência (movimentação interna) ─────────────────────────────────────

function TransferDialog({
  slot,
  onClose,
  onConfirm,
}: {
  slot: Slot;
  onClose: () => void;
  onConfirm: (toLocationId: string, qty: number) => Promise<boolean>;
}) {
  const [destino, setDestino] = useState<string | null>(null);
  const [qty, setQty] = useState(slot.quantidade);
  const [saving, setSaving] = useState(false);

  const valid =
    destino !== null &&
    Number.isInteger(qty) &&
    qty >= 1 &&
    qty <= slot.quantidade;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    const ok = await onConfirm(destino, qty);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Transferir material</DialogTitle>
          <DialogDescription>
            {slot.materialSnapshot.tipo} · {slot.quantidade} disponíveis. Não
            altera o total do estoque.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Destino</Label>
            <LocationCombobox
              value={destino}
              onSelect={setDestino}
              placeholder="Selecionar destino"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-qty">Quantidade</Label>
            <Input
              id="transfer-qty"
              type="number"
              min={1}
              max={slot.quantidade}
              value={qty}
              onChange={(e) => setQty(Number(e.currentTarget.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={!valid || saving}>
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
