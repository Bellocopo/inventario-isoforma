import { useFirestoreCollection } from "@/shared/hooks/useFirestoreCollection";
import { query } from "firebase/firestore";
import { useMemo } from "react";
import { controlCollection } from "./firestore";

export interface CorridorCounts {
  direito: string | null;
  esquerdo: string | null;
}

export function useCorridorCounts(): CorridorCounts {
  const q = useMemo(() => query(controlCollection), []);
  const { data } = useFirestoreCollection(q);

  return useMemo(() => {
    const byArea: CorridorCounts = { direito: null, esquerdo: null };
    for (const count of data) {
      byArea[count.area] = count.lastCompleteOn;
    }
    return byArea;
  }, [data]);
}
