import { cn } from "@/shared/lib/utils";

interface RoadBadgeProps {
  letter: string;
  className?: string;
}

export function RoadBadge({ letter, className }: RoadBadgeProps) {
  return (
    <span
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-xl font-bold text-white dark:bg-slate-950",
        className,
      )}
    >
      {letter}
    </span>
  );
}
