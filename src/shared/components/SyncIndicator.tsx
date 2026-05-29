import { cn } from "@/shared/lib/utils";

export type SyncStatus = "online" | "syncing" | "offline";

interface SyncIndicatorProps {
  status?: SyncStatus;
  className?: string;
}

const CONFIG: Record<SyncStatus, { dot: string; label: string }> = {
  online: { dot: "bg-success", label: "NUVEM ATIVA" },
  syncing: { dot: "bg-warning animate-pulse", label: "SINCRONIZANDO…" },
  offline: { dot: "bg-muted-foreground", label: "OFFLINE" },
};

export function SyncIndicator({
  status = "online",
  className,
}: SyncIndicatorProps) {
  const { dot, label } = CONFIG[status];

  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
      <span className="text-header-foreground/70 text-[10px] font-semibold tracking-wider uppercase">
        {label}
      </span>
    </span>
  );
}
