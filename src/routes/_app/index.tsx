import { createFileRoute } from "@tanstack/react-router";
import { Package2, Search } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { EmbalBadge } from "@/shared/components/EmbalBadge";
import { cn } from "@/shared/lib/utils";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});

const MOCK_RESINAS = [
  {
    name: "825-E",
    embal: "SC",
    cap: "1500KG/UNIDADE",
    kg: "762.000",
    paletes: 508,
  },
  {
    name: "U-8875",
    embal: "BB",
    cap: "1250KG/UNIDADE",
    kg: "172.500",
    paletes: 138,
  },
  {
    name: "870 E OFF",
    embal: "SC",
    cap: "1500KG/UNIDADE",
    kg: "120.000",
    paletes: 80,
  },
  {
    name: "GPPS – WP – HIPS",
    embal: "SC",
    cap: "1500KG/UNIDADE",
    kg: "97.500",
    paletes: 65,
  },
  {
    name: "535",
    embal: "SC",
    cap: "1500KG/UNIDADE",
    kg: "90.000",
    paletes: 60,
  },
  {
    name: "R-350-L",
    embal: "SC",
    cap: "1500KG/UNIDADE",
    kg: "75.000",
    paletes: 50,
  },
  {
    name: "KED-6270",
    embal: "SC",
    cap: "1500KG/UNIDADE",
    kg: "57.000",
    paletes: 38,
  },
  {
    name: "152 E.STYRENICS",
    embal: "SC",
    cap: "1500KG/UNIDADE",
    kg: "40.500",
    paletes: 27,
  },
] as const;

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

function MaterialRow({
  name,
  embal,
  cap,
  kg,
  paletes,
  className,
}: (typeof MOCK_RESINAS)[number] & { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-4 py-3.5",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-bold">{name}</span>
          <EmbalBadge type={embal} />
        </div>
        <p className="text-muted-foreground mt-0.5 text-[11px] tracking-wide uppercase">
          Capacidade: {cap}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-lg font-black tracking-tight">
          {kg}{" "}
          <span className="text-muted-foreground text-xs font-normal">KG</span>
        </p>
        <Badge className="bg-primary text-primary-foreground mt-1 px-2 py-0.5 text-[10px]">
          {paletes} PALETES
        </Badge>
      </div>
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Stock Total (Bruto)" value="1.710.450" unit="kg" />
        <KpiCard
          label="Volume de Paletes"
          value="1183"
          unit="paletes"
          note="*exclui os sacos"
        />
        <KpiCard
          label="Tipos de Item (com saldo)"
          value="36"
          unit="itens"
          highlight
        />
      </div>

      {/* Localizar material */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Search className="size-4" />
            Localizar Material no Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select disabled>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="-- Vazia --" />
            </SelectTrigger>
            <SelectContent />
          </Select>
        </CardContent>
      </Card>

      {/* Posição de resinas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
            <Package2 className="size-4" />
            Posição de Resinas Padrão
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {MOCK_RESINAS.map((item, i) => (
              <MaterialRow
                key={item.name}
                {...item}
                className={cn(
                  "border-b",
                  // remove bottom border on last row (single col) or last 2 items (2-col)
                  i === MOCK_RESINAS.length - 1 && "border-b-0",
                  i === MOCK_RESINAS.length - 2 && "sm:border-b-0",
                  // right border on left column in 2-col layout
                  i % 2 === 0 && "sm:border-r",
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
