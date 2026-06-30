import type { DashboardKpis } from "./types";

const nf = new Intl.NumberFormat("pt-BR");

function Total({
  label,
  value,
  unit,
  align,
}: {
  label: string;
  value: string;
  unit: string;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="text-header-foreground/60 text-[10px] font-bold tracking-wider uppercase">
        {label}
      </p>
      <p className="text-header-foreground text-2xl font-black tracking-tight">
        {value}{" "}
        <span className="text-header-foreground/60 text-sm font-normal">
          {unit}
        </span>
      </p>
    </div>
  );
}

export function StockSummaryBar({ kpis }: { kpis: DashboardKpis }) {
  return (
    <div className="bg-header flex items-center justify-between gap-4 rounded-xl px-5 py-3">
      <Total
        label="Estoque Total Global"
        value={nf.format(Math.round(kpis.stockTotalKg))}
        unit="kg"
        align="left"
      />
      <div className="bg-header-foreground/15 h-8 w-px shrink-0" />
      <Total
        label="Volume Total"
        value={nf.format(kpis.volumePaletes)}
        unit="paletes"
        align="right"
      />
    </div>
  );
}
