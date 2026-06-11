import type { Categoria, Material } from "@/features/catalog/types";
import { useCatalog } from "@/features/catalog/useCatalog";
import { EmbalBadge } from "@/shared/components/EmbalBadge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { SUPPLIERS } from "@/shared/lib/suppliers";
import { cn } from "@/shared/lib/utils";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useMemo, useState } from "react";

interface MaterialComboboxProps {
  value: string | null;
  onSelect: (material: Material | null) => void;
  disabled?: boolean;
  categoria?: Categoria;
}

function swatchColor(material: Material): string {
  if (material.categoria === "MASTER") return material.colorCode ?? "#f472b6";
  if (material.categoria === "ADITIVO") return "#a855f7";
  return SUPPLIERS[material.fornecedor ?? "none"].bg;
}

export function MaterialCombobox({
  value,
  onSelect,
  disabled = false,
  categoria,
}: MaterialComboboxProps) {
  const [open, setOpen] = useState(false);
  const { materials } = useCatalog();

  const filtered = useMemo(
    () =>
      categoria
        ? (materials ?? []).filter((m) => m.categoria === categoria)
        : (materials ?? []),
    [materials, categoria],
  );

  const selected = useMemo(
    () => filtered.find((m) => m.id === value) ?? null,
    [filtered, value],
  );

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            "border-input bg-background flex h-8 w-full items-center justify-between gap-1 rounded-md border px-2 py-1 text-sm shadow-sm",
            "hover:bg-accent focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            {selected && (
              <span
                className="inline-block size-3 shrink-0 rounded-sm border border-black/10"
                style={{ backgroundColor: swatchColor(selected) }}
              />
            )}
            <span className="truncate">
              {selected ? selected.tipo : "— Vazia —"}
            </span>
          </span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar material..." />
          <CommandList>
            <CommandEmpty>Nenhum material encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="vazia"
                onSelect={() => {
                  onSelect(null);
                  setOpen(false);
                }}
              >
                <span className="text-muted-foreground">— Vazia —</span>
                {value === null && <CheckIcon className="ml-auto size-4" />}
              </CommandItem>
              {filtered.map((material) => (
                <CommandItem
                  key={material.id}
                  value={`${material.tipo} ${material.embal}`}
                  onSelect={() => {
                    onSelect(material);
                    setOpen(false);
                  }}
                >
                  <span
                    className="inline-block size-3 shrink-0 rounded-sm border border-black/10"
                    style={{ backgroundColor: swatchColor(material) }}
                  />
                  <span className="truncate">{material.tipo}</span>
                  <EmbalBadge
                    type={material.embal}
                    className="mr-1 ml-auto shrink-0"
                  />
                  {value === material.id && (
                    <CheckIcon className="size-4 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
