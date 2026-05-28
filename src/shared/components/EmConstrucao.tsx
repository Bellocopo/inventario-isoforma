import { Construction } from "lucide-react";

interface EmConstrucaoProps {
  label: string;
}

export function EmConstrucao({ label }: EmConstrucaoProps) {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-20">
      <Construction className="size-10" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs">Em construção</p>
    </div>
  );
}
