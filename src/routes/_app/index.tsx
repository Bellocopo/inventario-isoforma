import { createFileRoute } from "@tanstack/react-router";
import { Package2, Palette, FlaskConical } from "lucide-react";
import { useDashboard } from "@/features/dashboard/useDashboard";
import { byCategoria } from "@/features/dashboard/aggregate";
import { KpiCards } from "@/features/dashboard/KpiCards";
import { MaterialSearch } from "@/features/dashboard/MaterialSearch";
import { PosicaoSection } from "@/features/dashboard/PosicaoSection";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-card h-28 animate-pulse rounded-xl border"
          />
        ))}
      </div>
      <div className="bg-card h-32 animate-pulse rounded-xl border" />
      <div className="bg-card h-64 animate-pulse rounded-xl border" />
    </div>
  );
}

function DashboardPage() {
  const { locations, items, kpis, loading } = useDashboard();

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <KpiCards kpis={kpis} />

      <MaterialSearch locations={locations} />

      {items.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Nenhum material com saldo.
        </div>
      ) : (
        <>
          <PosicaoSection
            title="Posição de Resinas Padrão"
            icon={Package2}
            variant="neutral"
            items={byCategoria(items, "PADRAO")}
          />
          <PosicaoSection
            title="Posição de Masterbatches"
            icon={Palette}
            variant="masters"
            items={byCategoria(items, "MASTER")}
          />
          <PosicaoSection
            title="Posição de Aditivos"
            icon={FlaskConical}
            variant="aditivos"
            items={byCategoria(items, "ADITIVO")}
          />
        </>
      )}
    </div>
  );
}
