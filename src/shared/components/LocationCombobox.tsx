import { useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { orderBy, query } from "firebase/firestore";
import { cn } from "@/shared/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { useFirestoreCollection } from "@/shared/hooks/useFirestoreCollection";
import { storageCollection } from "@/features/storage/firestore";

interface LocationComboboxProps {
  value: string | null;
  onSelect: (locationId: string | null) => void;
  placeholder?: string;
}

export function LocationCombobox({
  value,
  onSelect,
  placeholder = "Todos os locais",
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);

  const locationsQuery = useMemo(
    () => query(storageCollection, orderBy("label")),
    [],
  );
  const { data: locations } = useFirestoreCollection(locationsQuery);

  const selected = useMemo(
    () => locations.find((l) => l.id === value) ?? null,
    [locations, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className={cn(
            "border-input bg-background flex h-9 w-full items-center justify-between gap-1 rounded-md border px-3 py-1 text-sm shadow-sm",
            "hover:bg-accent focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar local..." />
          <CommandList>
            <CommandEmpty>Nenhum local encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="todos"
                onSelect={() => {
                  onSelect(null);
                  setOpen(false);
                }}
              >
                <span className="text-muted-foreground">{placeholder}</span>
                {value === null && <CheckIcon className="ml-auto size-4" />}
              </CommandItem>
              {locations.map((loc) => (
                <CommandItem
                  key={loc.id}
                  value={loc.label}
                  onSelect={() => {
                    onSelect(loc.id);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{loc.label}</span>
                  {value === loc.id && (
                    <CheckIcon className="ml-auto size-4 shrink-0" />
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
