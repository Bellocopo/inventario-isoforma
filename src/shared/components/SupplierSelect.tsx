import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  SUPPLIERS,
  SUPPLIER_IDS,
  type SupplierId,
} from "@/shared/lib/suppliers";

interface SupplierSelectProps {
  value: SupplierId;
  onChange: (value: SupplierId) => void;
  disabled?: boolean;
}

export function SupplierSelect({
  value,
  onChange,
  disabled,
}: SupplierSelectProps) {
  const current = SUPPLIERS[value];

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as SupplierId)}
      disabled={disabled}
    >
      <SelectTrigger
        className="h-8 w-36 border-0 text-xs font-medium"
        style={{ backgroundColor: current.bg, color: current.fg }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPPLIER_IDS.map((id) => {
          const s = SUPPLIERS[id];
          return (
            <SelectItem key={id} value={id}>
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-sm border border-black/10"
                  style={{ backgroundColor: s.bg }}
                />
                {s.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
