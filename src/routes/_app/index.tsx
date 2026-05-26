import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, ClipboardList, Package, Warehouse } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});

const NAV_CARDS = [
  {
    icon: Package,
    label: "Catálogo",
    description: "Resinas, masters e aditivos",
  },
  {
    icon: Warehouse,
    label: "Estoque",
    description: "Locais e quantidades por rua",
  },
  {
    icon: ClipboardList,
    label: "Áreas livres",
    description: "Fora, Masters, Aditivos",
  },
  {
    icon: BarChart3,
    label: "Kardex",
    description: "Histórico de movimentações",
  },
];

function DashboardPage() {
  const { displayName } = useAuth();
  return (
    <div>
      <p className="mb-6 text-lg">Olá, {displayName}.</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {NAV_CARDS.map(({ icon: Icon, label, description }) => (
          <div
            key={label}
            className="flex flex-col gap-2 rounded-lg border p-4"
          >
            <Icon className="h-6 w-6 text-gray-500" />
            <span className="font-medium">{label}</span>
            <span className="text-sm text-gray-500">{description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
