import { db } from "@/shared/lib/firebase";
import {
  collection,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from "firebase/firestore";
import type { CorridorArea, CorridorCount } from "./types";

const corridorCountConverter: FirestoreDataConverter<CorridorCount> = {
  toFirestore(count: CorridorCount): DocumentData {
    return { lastCompleteOn: count.lastCompleteOn };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): CorridorCount {
    const data = snapshot.data(options);
    return {
      area: snapshot.id as CorridorArea,
      lastCompleteOn: (data.lastCompleteOn as string | null) ?? null,
    };
  },
};

export const controlCollection = collection(db, "control").withConverter(
  corridorCountConverter,
);
