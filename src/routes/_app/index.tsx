import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Categoria } from "@/features/catalog/types";
import { useDashboard } from "@/features/dashboard/useDashboard";
import { CategoryCards } from "@/features/dashboard/CategoryCards";
import { CategoryDetails } from "@/features/dashboard/CategoryDetails";
import { MaterialSearch } from "@/features/dashboard/MaterialSearch";
import { StockSummaryBar } from "@/features/dashboard/StockSummaryBar";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="bg-card h-32 animate-pulse rounded-xl border" />
      <div className="bg-header h-16 animate-pulse rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-card h-36 animate-pulse rounded-xl border"
          />
        ))}
      </div>
      <div className="bg-card h-64 animate-pulse rounded-xl border" />
    </div>
  );
}

function DashboardPage() {
  const { locations, items, kpis, loading } = useDashboard();
  const [selected, setSelected] = useState<Categoria>("PADRAO");

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <MaterialSearch locations={locations} />

      <StockSummaryBar kpis={kpis} />

      <CategoryCards items={items} selected={selected} onSelect={setSelected} />

      <CategoryDetails categoria={selected} items={items} />
    </div>
  );
}
