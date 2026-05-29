import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Menu,
  MapPin,
  Droplet,
  FlaskConical,
  Clipboard,
  LayoutGrid,
  BookMarked,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const TABS = [
  { label: "Painel", to: "/", icon: BarChart3, exact: true },
  { label: "Lado Direito", to: "/direito", icon: Menu, exact: false },
  { label: "Lado Esquerdo", to: "/esquerdo", icon: Menu, exact: false },
  { label: "Fora do Local", to: "/fora", icon: MapPin, exact: false },
  { label: "Masters", to: "/masters", icon: Droplet, exact: false },
  { label: "Aditivos", to: "/aditivos", icon: FlaskConical, exact: false },
  { label: "Kardex", to: "/kardex", icon: Clipboard, exact: false },
  { label: "Planilha", to: "/planilha", icon: LayoutGrid, exact: false },
  { label: "Catálogo", to: "/catalogo", icon: BookMarked, exact: false },
] as const;

export function AppTabs() {
  const { location } = useRouterState();

  function isActive(to: string, exact: boolean) {
    if (exact) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(to + "/");
  }

  return (
    <nav className="bg-background border-border border-b">
      <ul
        className="flex snap-x snap-mandatory scrollbar-none gap-1 overflow-x-auto px-2 sm:px-4"
        role="tablist"
      >
        {TABS.map(({ label, to, icon: Icon, exact }) => {
          const active = isActive(to, exact);
          return (
            <li key={to} className="shrink-0 snap-start" role="none">
              <Link
                to={to as never}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground hover:border-border border-transparent",
                )}
                role="tab"
                aria-selected={active}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
