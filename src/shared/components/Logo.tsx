import { Box } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface LogoProps {
  compact?: boolean;
  className?: string;
}

export function Logo({ compact = false, className }: LogoProps) {
  if (compact) {
    return (
      <span className={cn("flex items-center", className)}>
        <Box className="text-success size-7" strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Box className="text-success size-7" strokeWidth={2.5} />
      <span className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight">
          <span className="text-success">iso</span>
          <span className="text-header-foreground">forma</span>
        </span>
        <span className="text-header-foreground/60 text-[10px] font-semibold tracking-widest uppercase">
          Inventário
        </span>
      </span>
    </span>
  );
}
