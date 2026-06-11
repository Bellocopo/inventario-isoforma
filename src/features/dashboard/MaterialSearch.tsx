import type { Material } from "@/features/catalog/types";
import type { StorageLocation } from "@/features/storage/types";
import { MaterialCombobox } from "@/shared/components/MaterialCombobox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { unitLabel } from "@/shared/lib/business";
import { Search } from "lucide-react";
import { useState } from "react";
import { findLocations } from "./aggregate";

export function MaterialSearch({
  locations,
}: {
  locations: StorageLocation[];
}) {
  const [material, setMaterial] = useState<Material | null>(null);

  const results = material ? findLocations(locations, material.id) : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <Search className="size-4" />
          Localizar Material no Estoque
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <MaterialCombobox
          value={material?.id ?? null}
          onSelect={(m) => setMaterial(m)}
        />

        {material &&
          (results.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Nenhuma quantidade encontrada.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {results.map((loc, i) => (
                <div
                  key={`${loc.area}-${loc.label}-${i}`}
                  className="bg-muted/40 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {loc.label}
                    </p>
                    <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
                      {loc.source}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums">{loc.qtd}</p>
                    <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
                      {unitLabel(material.kg)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
