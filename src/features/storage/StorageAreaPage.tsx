import { RuaCard } from "./RuaCard";
import type { StorageArea } from "./types";
import { useStorageArea } from "./useStorage";
import { isVerifiedToday } from "./verification";

const AREA_LABELS: Record<
  "direito" | "esquerdo",
  { title: string; subtitle: string }
> = {
  direito: {
    title: "Lado Direito",
    subtitle: "Ruas A-Z e A1-F1 do lado direito do galpão.",
  },
  esquerdo: {
    title: "Lado Esquerdo",
    subtitle: "Ruas A-Z e A1-F1 do lado esquerdo do galpão.",
  },
};

function RuaCardSkeleton() {
  return (
    <div
      className="bg-card overflow-hidden rounded-xl border shadow-sm"
      style={{ borderLeftWidth: 4 }}
    >
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        <div className="bg-muted h-12 w-12 animate-pulse rounded-lg" />
        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      </div>
      <div className="flex flex-col gap-1.5 px-3 pb-3">
        <div className="bg-muted h-8 w-full animate-pulse rounded-md" />
      </div>
    </div>
  );
}

interface StorageAreaPageProps {
  area: "direito" | "esquerdo";
}

export function StorageAreaPage({ area }: StorageAreaPageProps) {
  const { locations, loading } = useStorageArea(area as StorageArea);
  const { title, subtitle } = AREA_LABELS[area];

  const total = locations.length;
  const conferidas = locations.filter((l) =>
    isVerifiedToday(l.verifiedOn),
  ).length;
  const allDone = total > 0 && conferidas === total;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
        {!loading && total > 0 && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold${allDone ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-muted text-muted-foreground"}`}
          >
            {conferidas}/{total} conferidas hoje
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <RuaCardSkeleton key={i} />
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Nenhuma rua encontrada. Rode{" "}
          <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
            npm run seed:emu
          </code>{" "}
          para criar as ruas.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {locations.map((loc) => (
            <RuaCard key={loc.id} location={loc} />
          ))}
        </div>
      )}
    </div>
  );
}
