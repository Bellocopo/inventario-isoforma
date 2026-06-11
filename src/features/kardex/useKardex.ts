import {
  deleteDoc,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type Query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { kardexCollection, kardexDoc } from "./firestore";
import type { KardexEntry, KardexFilters } from "./types";

interface PaginationState {
  // Opaque key derived from filters + pageSize — when it changes, pagination resets.
  key: string;
  cursorStack: QueryDocumentSnapshot<KardexEntry>[];
  page: number;
}

function makePaginationKey(filters: KardexFilters, pageSize: number): string {
  return [
    filters.materialId ?? "",
    filters.locationId ?? "",
    filters.tipo ?? "",
    pageSize,
  ].join("|");
}

export function useKardex({
  filters,
  pageSize,
}: {
  filters: KardexFilters;
  pageSize: number;
}) {
  const key = makePaginationKey(filters, pageSize);

  const [pagination, setPagination] = useState<PaginationState>({
    key,
    cursorStack: [],
    page: 1,
  });

  // Reset during render when filters or pageSize change — single setState, no effect needed.
  if (pagination.key !== key) {
    setPagination({ key, cursorStack: [], page: 1 });
  }

  const [entries, setEntries] = useState<KardexEntry[]>([]);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<KardexEntry> | null>(null);
  const [resolvedQuery, setResolvedQuery] = useState<Query<KardexEntry> | null>(
    null,
  );
  const [total, setTotal] = useState(0);

  const baseQuery = useMemo(() => {
    const constraints: QueryConstraint[] = [];
    if (filters.materialId)
      constraints.push(where("materialId", "==", filters.materialId));
    if (filters.locationId)
      constraints.push(where("locationId", "==", filters.locationId));
    if (filters.tipo) constraints.push(where("tipo", "==", filters.tipo));
    return query(
      kardexCollection,
      ...constraints,
      orderBy("timestamp", "desc"),
    );
  }, [filters.materialId, filters.locationId, filters.tipo]);

  // Total count for pagination
  useEffect(() => {
    getCountFromServer(baseQuery)
      .then((snap) => setTotal(snap.data().count))
      .catch(() => setTotal(0));
  }, [baseQuery]);

  const cursor =
    pagination.cursorStack[pagination.cursorStack.length - 1] ?? null;

  const paginatedQuery = useMemo(
    () =>
      cursor
        ? query(baseQuery, startAfter(cursor), limit(pageSize))
        : query(baseQuery, limit(pageSize)),
    [baseQuery, cursor, pageSize],
  );

  useEffect(() => {
    return onSnapshot(
      paginatedQuery,
      (snap) => {
        setEntries(snap.docs.map((d) => d.data()));
        setLastDoc(
          (snap.docs[snap.docs.length - 1] as
            | QueryDocumentSnapshot<KardexEntry>
            | undefined) ?? null,
        );
        setResolvedQuery(paginatedQuery);
      },
      () => setResolvedQuery(paginatedQuery),
    );
  }, [paginatedQuery]);

  const loading = resolvedQuery !== paginatedQuery;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasNext = pagination.page < totalPages;

  const goNext = useCallback(() => {
    if (!lastDoc || !hasNext) return;
    setPagination((prev) => ({
      ...prev,
      cursorStack: [...prev.cursorStack, lastDoc],
      page: prev.page + 1,
    }));
  }, [lastDoc, hasNext]);

  const goPrev = useCallback(() => {
    setPagination((prev) => {
      if (prev.page <= 1) return prev;
      return {
        ...prev,
        cursorStack: prev.cursorStack.slice(0, -1),
        page: prev.page - 1,
      };
    });
  }, []);

  return {
    entries,
    loading,
    page: pagination.page,
    totalPages,
    goNext,
    goPrev,
    hasNext,
  };
}

export function useKardexMutations() {
  const deleteEntry = useCallback((id: string) => {
    void deleteDoc(kardexDoc(id)).catch(() =>
      toast.error("Erro ao excluir entrada do Kardex."),
    );
  }, []);

  return { deleteEntry };
}
