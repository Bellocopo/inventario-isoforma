import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

type EmbalType = "SC" | "BB";

interface EmbalBadgeProps {
  type: EmbalType;
  className?: string;
}

export function EmbalBadge({ type, className }: EmbalBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2 py-0.5 text-[10px] font-semibold uppercase",
        className,
      )}
    >
      {type}
    </Badge>
  );
}
