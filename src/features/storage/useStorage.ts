import { useAuth } from "@/features/auth/useAuth";
import type { Material } from "@/features/catalog/types";
import {
  buildKardexEntry,
  writeKardexEntryToBatch,
} from "@/features/kardex/firestore";
import { useFirestoreCollection } from "@/shared/hooks/useFirestoreCollection";
import { todayLocalISO } from "@/shared/lib/date";
import { db } from "@/shared/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { storageCollection, storageDoc } from "./firestore";
import type { Slot, StorageArea } from "./types";
import { isVerifiedToday } from "./verification";

export function useStorageArea(area: StorageArea) {
  const q = useMemo(
    () => query(storageCollection, where("area", "==", area), orderBy("ordem")),
    [area],
  );
  const { data: locations, loading, error } = useFirestoreCollection(q);
  return { locations, loading, error };
}

export function useAllStorage() {
  const q = useMemo(() => query(storageCollection, orderBy("ordem")), []);
  const { data: locations, loading, error } = useFirestoreCollection(q);
  return { locations, loading, error };
}

export function useStorageMutations() {
  const { user, displayName } = useAuth();

  // Grava control/{area} = hoje quando todas as ruas do corredor estão
  // conferidas hoje. Idempotente no dia (guard do getDoc) e nunca apaga ao
  // desmarcar — só sobrescreve quando um novo dia completa.
  const maybeMarkCorridorComplete = useCallback(
    async (area: StorageArea) => {
      if (area !== "direito" && area !== "esquerdo") return;
      const today = todayLocalISO();

      const ctrlRef = doc(db, "control", area);
      const ctrlSnap = await getDoc(ctrlRef);
      if (ctrlSnap.exists() && ctrlSnap.data().lastCompleteOn === today) return;

      const qs = await getDocs(
        query(storageCollection, where("area", "==", area)),
      );
      if (qs.empty) return;
      const allToday = qs.docs.every((d) =>
        isVerifiedToday(d.data().verifiedOn),
      );
      if (!allToday) return;

      await setDoc(
        ctrlRef,
        {
          lastCompleteOn: today,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid ?? "",
        },
        { merge: true },
      );
    },
    [user],
  );

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
          verifiedOn: todayLocalISO(),
          verifiedBy: user?.uid ?? "",
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
        await maybeMarkCorridorComplete(snap.data().area);
      })().catch(() => toast.error("Erro ao atualizar quantidade."));
    },
    [user, displayName, maybeMarkCorridorComplete],
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
        verifiedOn: null,
        verifiedBy: "",
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

  const setRuaVerificada = useCallback(
    (locationId: string, area: StorageArea, verified: boolean) => {
      void (async () => {
        await updateDoc(doc(db, "storage_locations", locationId), {
          verifiedOn: verified ? todayLocalISO() : null,
          verifiedBy: verified ? (user?.uid ?? "") : "",
        });
        if (verified) await maybeMarkCorridorComplete(area);
      })().catch(() => toast.error("Erro ao marcar verificação."));
    },
    [user, maybeMarkCorridorComplete],
  );

  return {
    setSlotMaterial,
    setSlotQuantidade,
    createLocation,
    setLocationLabel,
    deleteLocation,
    setRuaVerificada,
  };
}
