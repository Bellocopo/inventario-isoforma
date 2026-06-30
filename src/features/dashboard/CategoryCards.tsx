import type { Categoria } from "@/features/catalog/types";
import { cn } from "@/shared/lib/utils";
import { categorySummary } from "./aggregate";
import { CATEGORIES } from "./categories";
import type { ConsolidatedItem } from "./types";

const nf = new Intl.NumberFormat("pt-BR");

export function CategoryCards({
  items,
  selected,
  onSelect,
}: {
  items: ConsolidatedItem[];
  selected: Categoria;
  onSelect: (categoria: Categoria) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CATEGORIES.map((cat) => {
        const summary = categorySummary(items, cat.id);
        const isSel = selected === cat.id;
        const Icon = cat.icon;

        return (
          <button
            key={cat.id}
            type="button"
            aria-pressed={isSel}
            onClick={() => onSelect(cat.id)}
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
              isSel ? `${cat.solid} shadow-sm` : "bg-card hover:bg-accent/40",
            )}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg",
                  isSel ? "bg-white/20 text-white" : cat.iconIdle,
                )}
              >
                <Icon className="size-5" />
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                  isSel ? "bg-white/20 text-white" : cat.tagIdle,
                )}
              >
                {nf.format(summary.tipos)} tipos
              </span>
            </div>
            <div>
              <p
                className={cn(
                  "text-xs font-bold tracking-wider uppercase",
                  isSel ? "text-white/80" : "text-muted-foreground",
                )}
              >
                {cat.label}
              </p>
              <p className="text-3xl font-black tracking-tight">
                {nf.format(Math.round(summary.totalKg))}{" "}
                <span
                  className={cn(
                    "text-base font-normal",
                    isSel ? "text-white/70" : "text-muted-foreground",
                  )}
                >
                  kg
                </span>
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  isSel ? "text-white/70" : "text-muted-foreground",
                )}
              >
                {cat.subtitle(summary)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
