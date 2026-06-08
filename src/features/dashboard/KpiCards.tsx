import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";
import type { DashboardKpis } from "./types";

const nf = new Intl.NumberFormat("pt-BR");

function KpiCard({
  label,
  value,
  unit,
  note,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        highlight && "bg-primary text-primary-foreground border-primary",
      )}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-xs font-bold tracking-wider uppercase",
              highlight
                ? "text-primary-foreground/80"
                : "text-muted-foreground",
            )}
          >
            {label}
          </p>
          {note && (
            <span
              className={cn(
                "shrink-0 text-[10px]",
                highlight
                  ? "text-primary-foreground/60"
                  : "text-muted-foreground",
              )}
            >
              {note}
            </span>
          )}
        </div>
        <p className="mt-1 text-4xl font-black tracking-tight">
          {value}{" "}
          <span
            className={cn(
              "text-lg font-normal",
              highlight
                ? "text-primary-foreground/80"
                : "text-muted-foreground",
            )}
          >
            {unit}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

export function KpiCards({ kpis }: { kpis: DashboardKpis }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiCard
        label="Stock Total (Bruto)"
        value={nf.format(Math.round(kpis.stockTotalKg))}
        unit="kg"
      />
      <KpiCard
        label="Volume de Paletes"
        value={nf.format(kpis.volumePaletes)}
        unit="paletes"
        note="*exclui os sacos"
      />
      <KpiCard
        label="Tipos de Item (com saldo)"
        value={nf.format(kpis.tiposComSaldo)}
        unit="itens"
        highlight
      />
    </div>
  );
}
