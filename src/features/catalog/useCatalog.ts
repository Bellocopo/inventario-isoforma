import { useMemo, useCallback } from "react";
import {
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import { useFirestoreCollection } from "@/shared/hooks/useFirestoreCollection";
import { catalogCollection, catalogDoc } from "./firestore";
import type { Material, MaterialInput } from "./types";

function applyAutoPrefix(
  tipo: string,
  categoria: Material["categoria"],
): string {
  if (categoria === "MASTER" && !tipo.startsWith("MASTER "))
    return `MASTER ${tipo}`;
  if (categoria === "ADITIVO" && !tipo.startsWith("ADITIVO "))
    return `ADITIVO ${tipo}`;
  return tipo;
}

export function useCatalog({
  includeInactive = false,
}: { includeInactive?: boolean } = {}) {
  // Composite index needed for (ativo==true, tipo asc) — emulator creates automatically,
  // production requires firestore.indexes.json entry.
  const q = useMemo(
    () =>
      includeInactive
        ? query(catalogCollection, orderBy("tipo"))
        : query(catalogCollection, where("ativo", "==", true), orderBy("tipo")),
    [includeInactive],
  );

  const { data: materials, loading, error } = useFirestoreCollection(q);
  return { materials, loading, error };
}

export function useCatalogMutations() {
  // Mutações são fire-and-forget: Firestore enfileira localmente quando offline
  // e sincroniza ao reconectar. O await só bloquearia o form até o servidor confirmar.
  const addMaterial = useCallback((input: MaterialInput) => {
    const tipo = applyAutoPrefix(
      input.tipo.trim().toUpperCase(),
      input.categoria,
    );
    void addDoc(catalogCollection, {
      ...input,
      tipo,
      ativo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as Parameters<typeof addDoc>[1])
      .then(() => toast.success("Material adicionado."))
      .catch(() => toast.error("Erro ao adicionar material."));
  }, []);

  const updateMaterial = useCallback(
    (id: string, patch: Partial<MaterialInput>) => {
      const update: Record<string, unknown> = {
        ...patch,
        updatedAt: serverTimestamp(),
      };
      if (patch.tipo) {
        update.tipo = applyAutoPrefix(
          patch.tipo.trim().toUpperCase(),
          patch.categoria ?? "PADRAO",
        );
      }
      void updateDoc(catalogDoc(id), update)
        .then(() => toast.success("Material atualizado."))
        .catch(() => toast.error("Erro ao atualizar material."));
    },
    [],
  );

  const setActive = useCallback((id: string, ativo: boolean) => {
    void updateDoc(catalogDoc(id), { ativo, updatedAt: serverTimestamp() })
      .then(() =>
        toast.success(ativo ? "Material reativado." : "Material desativado."),
      )
      .catch(() => toast.error("Erro ao alterar status do material."));
  }, []);

  return { addMaterial, updateMaterial, setActive };
}
