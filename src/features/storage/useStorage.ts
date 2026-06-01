import { useCallback, useMemo } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/shared/lib/firebase";
import { useFirestoreCollection } from "@/shared/hooks/useFirestoreCollection";
import { useAuth } from "@/features/auth/useAuth";
import { storageCollection, storageDoc } from "./firestore";
import type { Slot, StorageArea } from "./types";
import type { Material } from "@/features/catalog/types";

export function useStorageArea(area: StorageArea) {
  const q = useMemo(
    () => query(storageCollection, where("area", "==", area), orderBy("ordem")),
    [area],
  );
  const { data: locations, loading, error } = useFirestoreCollection(q);
  return { locations, loading, error };
}

export function useStorageMutations() {
  const { user } = useAuth();

  const setSlotMaterial = useCallback(
    (locationId: string, slotIndex: number, material: Material | null) => {
      void (async () => {
        const snap = await getDoc(storageDoc(locationId));
        if (!snap.exists()) return;

        const slots: Slot[] = [...(snap.data().slots ?? [])];

        if (material === null) {
          slots.splice(slotIndex, 1);
        } else {
          const slot: Slot = {
            materialId: material.id,
            materialSnapshot: {
              tipo: material.tipo,
              embal: material.embal,
              kgUnit: material.kg,
              categoria: material.categoria,
              fornecedor: material.fornecedor,
              colorCode: material.colorCode,
            },
            // preserva quantidade existente ao trocar material
            quantidade: slots[slotIndex]?.quantidade ?? 0,
          };
          if (slotIndex < slots.length) {
            slots[slotIndex] = slot;
          } else {
            slots.push(slot);
          }
        }

        await updateDoc(doc(db, "storage_locations", locationId), {
          slots,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid ?? "",
        });
      })().catch(() => toast.error("Erro ao atualizar material do slot."));
    },
    [user],
  );

  const setSlotQuantidade = useCallback(
    (locationId: string, slotIndex: number, qtd: number) => {
      void (async () => {
        const snap = await getDoc(storageDoc(locationId));
        if (!snap.exists()) return;

        const slots: Slot[] = [...(snap.data().slots ?? [])];
        if (!slots[slotIndex]) return;

        // TODO(010): log kardex no diff de quantidade
        slots[slotIndex] = { ...slots[slotIndex], quantidade: qtd };

        await updateDoc(doc(db, "storage_locations", locationId), {
          slots,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid ?? "",
        });
      })().catch(() => toast.error("Erro ao atualizar quantidade."));
    },
    [user],
  );

  return { setSlotMaterial, setSlotQuantidade };
}
