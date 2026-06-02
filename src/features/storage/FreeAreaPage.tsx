import { useState } from "react";
import { AddRow } from "@/shared/components/AddRow";
import { useRole } from "@/features/auth/useRole";
import { useStorageArea, useStorageMutations } from "./useStorage";
import { LocalCard } from "./LocalCard";
import type { Categoria, StorageArea } from "./types";

type FreeArea = "fora" | "masters" | "aditivos";
type FreeAreaVariant = "neutral" | "masters" | "aditivos";

interface AreaConfig {
  title: string;
  subtitle: string;
  categoria: Categoria | undefined;
  variant: FreeAreaVariant;
  addLabel: string;
}

const AREA_CONFIG: Record<FreeArea, AreaConfig> = {
  fora: {
    title: "Fora do Local",
    subtitle: "Materiais armazenados fora das ruas do galpão.",
    categoria: undefined,
    variant: "neutral",
    addLabel: "Adicionar local",
  },
  masters: {
    title: "Masters",
    subtitle: "Estoque de masters por local.",
    categoria: "MASTER",
    variant: "masters",
    addLabel: "Adicionar local",
  },
  aditivos: {
    title: "Aditivos",
    subtitle: "Estoque de aditivos por local.",
    categoria: "ADITIVO",
    variant: "aditivos",
    addLabel: "Adicionar local",
  },
};

function LocalCardSkeleton() {
  return (
    <div
      className="bg-card overflow-hidden rounded-xl border shadow-sm"
      style={{ borderLeftWidth: 4 }}
    >
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        <div className="bg-muted h-4 w-32 animate-pulse rounded" />
      </div>
      <div className="flex flex-col gap-1.5 px-3 pb-3">
        <div className="bg-muted h-8 w-full animate-pulse rounded-md" />
      </div>
    </div>
  );
}

interface FreeAreaPageProps {
  area: FreeArea;
}

export function FreeAreaPage({ area }: FreeAreaPageProps) {
  const { isAdmin } = useRole();
  const { locations, loading } = useStorageArea(area as StorageArea);
  const { createLocation } = useStorageMutations();
  const { title, subtitle, categoria, variant, addLabel } = AREA_CONFIG[area];

  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  function handleCreate() {
    const trimmed = newLabel.trim();
    if (trimmed) createLocation(area as StorageArea, trimmed);
    setNewLabel("");
    setAdding(false);
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LocalCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {locations.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {locations.map((loc) => (
                <LocalCard
                  key={loc.id}
                  location={loc}
                  categoria={categoria}
                  variant={variant}
                />
              ))}
            </div>
          )}

          {isAdmin && (
            <div>
              {adding ? (
                <input
                  autoFocus
                  placeholder="Nome do local"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    else if (e.key === "Escape") {
                      setNewLabel("");
                      setAdding(false);
                    }
                  }}
                  onBlur={() => {
                    setNewLabel("");
                    setAdding(false);
                  }}
                  className="border-input bg-background focus:ring-ring w-full rounded-xl border-2 border-dashed px-4 py-3 text-sm outline-none focus:ring-2"
                />
              ) : (
                <AddRow
                  label={addLabel}
                  variant={variant}
                  onClick={() => setAdding(true)}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
