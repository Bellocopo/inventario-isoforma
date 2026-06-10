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
  ChevronDown,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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

  const current = TABS.find((t) => isActive(t.to, t.exact)) ?? TABS[0];
  const CurrentIcon = current.icon;

  return (
    <nav className="bg-background border-border border-b">
      {/* Telas estreitas: dropdown com a rota atual */}
      <div className="xl:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger className="text-foreground hover:bg-muted flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium outline-none">
            <CurrentIcon className="text-primary size-4 shrink-0" />
            <span className="truncate">{current.label}</span>
            <ChevronDown className="text-muted-foreground ml-auto size-4 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)]"
          >
            {TABS.map(({ label, to, icon: Icon, exact }) => {
              const active = isActive(to, exact);
              return (
                <DropdownMenuItem key={to} asChild>
                  <Link
                    to={to as never}
                    className={cn(
                      "flex cursor-pointer items-center gap-2",
                      active && "text-primary font-medium",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {active && <Check className="size-4 shrink-0" />}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Telas largas: barra de abas horizontal */}
      <ul className="hidden gap-1 px-4 xl:flex" role="tablist">
        {TABS.map(({ label, to, icon: Icon, exact }) => {
          const active = isActive(to, exact);
          return (
            <li key={to} className="shrink-0" role="none">
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
