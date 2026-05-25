import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Package, Warehouse } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: DashboardPlaceholder,
});

function DashboardPlaceholder() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard (em construção)</h1>
      <div className="mt-4 flex gap-4">
        <Package size={24} />
        <Warehouse size={24} />
        <BarChart3 size={24} />
      </div>
    </div>
  );
}
