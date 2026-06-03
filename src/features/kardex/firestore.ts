import {
  collection,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  type WriteBatch,
} from "firebase/firestore";
import { db } from "@/shared/lib/firebase";
import type { KardexEntry, KardexEntryInput, KardexTipo } from "./types";
import type { Slot } from "@/features/storage/types";

const kardexConverter: FirestoreDataConverter<KardexEntry> = {
  toFirestore(entry: KardexEntry): DocumentData {
    return {
      materialId: entry.materialId,
      materialSnapshot: entry.materialSnapshot,
      locationId: entry.locationId,
      locationLabel: entry.locationLabel,
      tipo: entry.tipo,
      qtd: entry.qtd,
      kgTotal: entry.kgTotal,
      userId: entry.userId,
      userDisplay: entry.userDisplay,
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): KardexEntry {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      timestamp: data.timestamp
        ? (data.timestamp as Timestamp).toDate()
        : new Date(),
      materialId: data.materialId as string,
      materialSnapshot:
        data.materialSnapshot as KardexEntry["materialSnapshot"],
      locationId: data.locationId as string,
      locationLabel: data.locationLabel as string,
      tipo: data.tipo as KardexTipo,
      qtd: data.qtd as number,
      kgTotal: data.kgTotal as number,
      userId: data.userId as string,
      userDisplay: data.userDisplay as string,
    };
  },
};

export const kardexCollection = collection(db, "kardex").withConverter(
  kardexConverter,
);

export function kardexDoc(id: string) {
  return doc(db, "kardex", id).withConverter(kardexConverter);
}

export function buildKardexEntry(params: {
  slot: Slot;
  locationId: string;
  locationLabel: string;
  delta: number;
  userId: string;
  userDisplay: string;
}): KardexEntryInput {
  const { slot, locationId, locationLabel, delta, userId, userDisplay } =
    params;
  return {
    materialId: slot.materialId,
    materialSnapshot: {
      tipo: slot.materialSnapshot.tipo,
      embal: slot.materialSnapshot.embal,
      kgUnit: slot.materialSnapshot.kgUnit,
    },
    locationId,
    locationLabel,
    tipo: delta > 0 ? "ENTRADA" : "SAIDA",
    qtd: Math.abs(delta),
    kgTotal: Math.abs(delta) * slot.materialSnapshot.kgUnit,
    userId,
    userDisplay,
  };
}

export function writeKardexEntryToBatch(
  batch: WriteBatch,
  input: KardexEntryInput,
): void {
  // Bypass the converter so serverTimestamp() is written as-is (toFirestore omite timestamp).
  const newDoc = doc(collection(db, "kardex"));
  batch.set(newDoc, {
    ...input,
    timestamp: serverTimestamp(),
  });
}

export { writeBatch, serverTimestamp };
