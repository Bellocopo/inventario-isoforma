import type { Categoria } from "@/features/catalog/types";
import { EmbalBadge } from "@/shared/components/EmbalBadge";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { unitLabel } from "@/shared/lib/business";
import { SUPPLIERS } from "@/shared/lib/suppliers";
import { cn } from "@/shared/lib/utils";
import { byCategoria } from "./aggregate";
import { CATEGORY_BY_ID } from "./categories";
import type { ConsolidatedItem } from "./types";

const nf = new Intl.NumberFormat("pt-BR");

function swatchColor(item: ConsolidatedItem): string {
  if (item.colorCode) return item.colorCode;
  return SUPPLIERS[item.fornecedor ?? "none"].bg;
}

function MaterialRow({
  item,
  className,
}: {
  item: ConsolidatedItem;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-4 py-3.5",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-block size-3 shrink-0 rounded-sm border border-black/10"
            style={{ backgroundColor: swatchColor(item) }}
          />
          <span className="text-sm font-bold">{item.tipo}</span>
          <EmbalBadge type={item.embal} />
        </div>
        <p className="text-muted-foreground mt-0.5 text-[11px] tracking-wide uppercase">
          Capacidade: {nf.format(item.kgUnit)} kg/unidade
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-lg font-black tracking-tight">
          {nf.format(Math.round(item.totalKg))}{" "}
          <span className="text-muted-foreground text-xs font-normal">KG</span>
        </p>
        <Badge className="bg-primary text-primary-foreground mt-1 px-2 py-0.5 text-[10px]">
          {nf.format(item.totalQtd)} {unitLabel(item.kgUnit)}
        </Badge>
      </div>
    </div>
  );
}

export function CategoryDetails({
  categoria,
  items,
}: {
  categoria: Categoria;
  items: ConsolidatedItem[];
}) {
  const cat = CATEGORY_BY_ID[categoria];
  const Icon = cat.icon;
  const rows = byCategoria(items, categoria);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3 text-sm font-bold tracking-wider uppercase",
          cat.headerBg,
          cat.headerText,
        )}
      >
        <Icon className="size-4" />
        Detalhes: {cat.label}
      </div>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">
            Nenhum item nesta categoria.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {rows.map((item, i) => (
              <MaterialRow
                key={item.materialId}
                item={item}
                className={cn(
                  "border-b",
                  i === rows.length - 1 && "border-b-0",
                  i === rows.length - 2 && "sm:border-b-0",
                  i % 2 === 0 && "sm:border-r",
                )}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
