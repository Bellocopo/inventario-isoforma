import { db } from "@/shared/lib/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from "firebase/firestore";
import type { Slot, StorageLocation, StorageLocationInput } from "./types";

const storageLocationConverter: FirestoreDataConverter<StorageLocation> = {
  toFirestore(location: StorageLocation): DocumentData {
    return {
      area: location.area,
      rua: location.rua,
      label: location.label,
      ordem: location.ordem,
      slots: location.slots,
      updatedBy: location.updatedBy,
      verifiedOn: location.verifiedOn,
      verifiedBy: location.verifiedBy,
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): StorageLocation {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      area: data.area as StorageLocation["area"],
      rua: (data.rua as string | null) ?? null,
      label: data.label as string,
      ordem: data.ordem as number,
      slots: (data.slots as Slot[]) ?? [],
      updatedBy: (data.updatedBy as string) ?? "",
      verifiedOn: (data.verifiedOn as string | null) ?? null,
      verifiedBy: (data.verifiedBy as string) ?? "",
      createdAt: data.createdAt
        ? (data.createdAt as Timestamp).toDate()
        : new Date(),
      updatedAt: data.updatedAt
        ? (data.updatedAt as Timestamp).toDate()
        : new Date(),
    };
  },
};

export const storageCollection = collection(
  db,
  "storage_locations",
).withConverter(storageLocationConverter);

export function storageDoc(id: string) {
  return doc(db, "storage_locations", id).withConverter(
    storageLocationConverter,
  );
}

export { serverTimestamp };

export type { StorageLocationInput };
