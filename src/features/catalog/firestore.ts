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
import type { Material, MaterialInput } from "./types";

const catalogConverter: FirestoreDataConverter<Material> = {
  toFirestore(material: Material): DocumentData {
    return {
      tipo: material.tipo,
      embal: material.embal,
      kg: material.kg,
      categoria: material.categoria,
      colorCode: material.colorCode,
      fornecedor: material.fornecedor,
      ativo: material.ativo,
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): Material {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      tipo: data.tipo as string,
      embal: data.embal as Material["embal"],
      kg: data.kg as number,
      categoria: data.categoria as Material["categoria"],
      colorCode: (data.colorCode as string | null) ?? null,
      fornecedor: (data.fornecedor as Material["fornecedor"]) ?? null,
      ativo: data.ativo as boolean,
      // serverTimestamp() é null no snapshot otimista local antes da confirmação do servidor
      createdAt: data.createdAt
        ? (data.createdAt as Timestamp).toDate()
        : new Date(),
      updatedAt: data.updatedAt
        ? (data.updatedAt as Timestamp).toDate()
        : new Date(),
    };
  },
};

export const catalogCollection = collection(db, "catalog").withConverter(
  catalogConverter,
);

export function catalogDoc(id: string) {
  return doc(db, "catalog", id).withConverter(catalogConverter);
}

export { serverTimestamp };

export type { MaterialInput };
