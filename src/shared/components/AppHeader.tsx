import { LogOut } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Logo } from "./Logo";
import { SyncIndicator } from "./SyncIndicator";
import { ModeToggle } from "@/features/theme/ModeToggle";
import { useAuth } from "@/features/auth/useAuth";
import { useSyncStatus } from "@/shared/hooks/useSyncStatus";

export function AppHeader() {
  const { displayName, signOutNow } = useAuth();
  const syncStatus = useSyncStatus();

  return (
    <header className="bg-header text-header-foreground">
      {/* Desktop */}
      <div className="hidden h-14 items-center gap-4 px-4 sm:flex">
        <Logo />
        <SyncIndicator status={syncStatus} />
        <div className="flex-1" />
        <ModeToggle />
        <span className="text-header-foreground/80 text-sm font-medium">
          {displayName}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-header-foreground gap-1.5 hover:bg-white/10"
          onClick={() => void signOutNow()}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-1.5 px-3 py-2 sm:hidden">
        <div className="flex items-center justify-between">
          <Logo compact />
          <SyncIndicator status={syncStatus} />
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <span className="text-header-foreground/80 flex-1 truncate text-xs font-medium">
            {displayName}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-header-foreground hover:bg-white/10"
            onClick={() => void signOutNow()}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
