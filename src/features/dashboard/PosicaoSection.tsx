import { EmbalBadge } from "@/shared/components/EmbalBadge";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { unitLabel } from "@/shared/lib/business";
import { SUPPLIERS } from "@/shared/lib/suppliers";
import { cn } from "@/shared/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ConsolidatedItem } from "./types";

type PosicaoVariant = "neutral" | "masters" | "aditivos";

const nf = new Intl.NumberFormat("pt-BR");

const TITLE_CLASSES: Record<PosicaoVariant, string> = {
  neutral: "",
  masters: "text-brand-pink-foreground",
  aditivos: "text-brand-purple-foreground",
};

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

export function PosicaoSection({
  title,
  icon: Icon,
  variant,
  items,
}: {
  title: string;
  icon: LucideIcon;
  variant: PosicaoVariant;
  items: ConsolidatedItem[];
}) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle
          className={cn(
            "flex items-center gap-2 text-sm font-bold tracking-wider uppercase",
            TITLE_CLASSES[variant],
          )}
        >
          <Icon className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {items.map((item, i) => (
            <MaterialRow
              key={item.materialId}
              item={item}
              className={cn(
                "border-b",
                i === items.length - 1 && "border-b-0",
                i === items.length - 2 && "sm:border-b-0",
                i % 2 === 0 && "sm:border-r",
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
