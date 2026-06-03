import { useCallback, useMemo } from "react";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
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
import {
  buildKardexEntry,
  writeKardexEntryToBatch,
} from "@/features/kardex/firestore";
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
  const { user, displayName } = useAuth();

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

        const old = slots[slotIndex].quantidade;
        const delta = qtd - old;
        slots[slotIndex] = { ...slots[slotIndex], quantidade: qtd };

        const batch = writeBatch(db);
        batch.update(doc(db, "storage_locations", locationId), {
          slots,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid ?? "",
        });

        if (delta !== 0) {
          writeKardexEntryToBatch(
            batch,
            buildKardexEntry({
              slot: slots[slotIndex],
              locationId,
              locationLabel: snap.data().label,
              delta,
              userId: user?.uid ?? "",
              userDisplay: displayName ?? "",
            }),
          );
        }

        await batch.commit();
      })().catch(() => toast.error("Erro ao atualizar quantidade."));
    },
    [user, displayName],
  );

  const createLocation = useCallback(
    (area: StorageArea, label: string) => {
      void addDoc(collection(db, "storage_locations"), {
        area,
        rua: null,
        label,
        ordem: Date.now(),
        slots: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid ?? "",
      }).catch(() => toast.error("Erro ao criar local."));
    },
    [user],
  );

  const setLocationLabel = useCallback(
    (locationId: string, label: string) => {
      void updateDoc(doc(db, "storage_locations", locationId), {
        label,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid ?? "",
      }).catch(() => toast.error("Erro ao renomear local."));
    },
    [user],
  );

  const deleteLocation = useCallback((locationId: string) => {
    void deleteDoc(doc(db, "storage_locations", locationId)).catch(() =>
      toast.error("Erro ao excluir local."),
    );
  }, []);

  return {
    setSlotMaterial,
    setSlotQuantidade,
    createLocation,
    setLocationLabel,
    deleteLocation,
  };
}
