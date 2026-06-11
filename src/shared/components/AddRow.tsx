import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { Plus } from "lucide-react";

type AddRowVariant = "neutral" | "masters" | "aditivos";

interface AddRowProps {
  label?: string;
  variant?: AddRowVariant;
  onClick?: () => void;
  disabled?: boolean;
}

const VARIANT_CLASSES: Record<AddRowVariant, string> = {
  neutral: "border-border text-muted-foreground hover:bg-muted",
  masters:
    "border-brand-pink-foreground/30 text-brand-pink-foreground hover:bg-brand-pink/50",
  aditivos:
    "border-brand-purple-foreground/30 text-brand-purple-foreground hover:bg-brand-purple/50",
};

export function AddRow({
  label = "Adicionar",
  variant = "neutral",
  onClick,
  disabled,
}: AddRowProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full gap-2 rounded-xl border-2 border-dashed py-3",
        VARIANT_CLASSES[variant],
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Plus className="size-4" />
      {label}
    </Button>
  );
}
