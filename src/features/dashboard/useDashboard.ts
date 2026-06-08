import { useMemo } from "react";
import { useAllStorage } from "@/features/storage/useStorage";
import { consolidate, computeKpis } from "./aggregate";

export function useDashboard() {
  const { locations, loading, error } = useAllStorage();

  const items = useMemo(() => consolidate(locations), [locations]);
  const kpis = useMemo(() => computeKpis(items), [items]);

  return { locations, items, kpis, loading, error };
}
