import { Eye, EyeOff, Pencil, Search } from "lucide-react";
import { useState } from "react";

import { useRole } from "@/features/auth/useRole";
import { EmbalBadge } from "@/shared/components/EmbalBadge";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { SUPPLIERS } from "@/shared/lib/suppliers";
import { cn } from "@/shared/lib/utils";
import { CatalogForm } from "./CatalogForm";
import { CatalogRow } from "./CatalogRow";
import type { Material } from "./types";
import { useCatalog, useCatalogMutations } from "./useCatalog";

const CATEGORIA_STYLE: Record<Material["categoria"], string> = {
  PADRAO: "bg-primary/10 text-primary border-primary/20",
  MASTER:
    "bg-brand-pink text-brand-pink-foreground border-brand-pink-foreground/20",
  ADITIVO:
    "bg-brand-purple text-brand-purple-foreground border-brand-purple-foreground/20",
};

const CATEGORIA_LABEL: Record<Material["categoria"], string> = {
  PADRAO: "Padrão",
  MASTER: "Master",
  ADITIVO: "Aditivo",
};

function MobileCard({ material }: { material: Material }) {
  const [isEditing, setIsEditing] = useState(false);
  const { isAdmin } = useRole();
  const { setActive } = useCatalogMutations();

  if (isEditing) {
    return (
      <div className="p-2">
        <CatalogForm
          mode="edit"
          material={material}
          materialId={material.id}
          onDone={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-card space-y-2 rounded-xl border p-3",
        !material.ativo && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium">{material.tipo}</span>
          {!material.ativo && (
            <Badge variant="outline" className="py-0 text-[10px]">
              inativo
            </Badge>
          )}
        </div>
        {isAdmin && (
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsEditing(true)}
              title="Editar"
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void setActive(material.id, !material.ativo)}
              title={material.ativo ? "Desativar" : "Reativar"}
            >
              {material.ativo ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn("text-[10px]", CATEGORIA_STYLE[material.categoria])}
        >
          {CATEGORIA_LABEL[material.categoria]}
        </Badge>
        <EmbalBadge type={material.embal} />
        <span className="text-muted-foreground text-xs tabular-nums">
          {material.kg.toLocaleString("pt-BR")} kg
        </span>
        {material.categoria === "PADRAO" && material.fornecedor && (
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-black/10"
              style={{ backgroundColor: SUPPLIERS[material.fornecedor].bg }}
            />
            <span className="text-xs">
              {SUPPLIERS[material.fornecedor].label}
            </span>
          </span>
        )}
        {material.categoria === "MASTER" && material.colorCode && (
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-black/10"
              style={{ backgroundColor: material.colorCode }}
            />
            <span className="font-mono text-xs">{material.colorCode}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function CatalogList() {
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<
    Material["categoria"] | "TODAS"
  >("TODAS");
  const [includeInactive, setIncludeInactive] = useState(false);

  const { materials, loading } = useCatalog({ includeInactive });

  const filtered = materials.filter((m) => {
    const matchesText = m.tipo.toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      categoriaFilter === "TODAS" || m.categoria === categoriaFilter;
    return matchesText && matchesCat;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[160px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por tipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select
          value={categoriaFilter}
          onValueChange={(v) => setCategoriaFilter(v as typeof categoriaFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas</SelectItem>
            <SelectItem value="PADRAO">Padrão</SelectItem>
            <SelectItem value="MASTER">Master</SelectItem>
            <SelectItem value="ADITIVO">Aditivo</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="show-inactive"
            checked={includeInactive}
            onCheckedChange={setIncludeInactive}
          />
          <Label htmlFor="show-inactive" className="cursor-pointer text-sm">
            Mostrar inativos
          </Label>
        </div>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Carregando…</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhum material encontrado.
        </p>
      )}

      {/* Desktop */}
      {!loading && filtered.length > 0 && (
        <div className="hidden overflow-hidden rounded-xl border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Embal</TableHead>
                <TableHead className="text-right">KG</TableHead>
                <TableHead>Cor / Fornecedor</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <CatalogRow key={m.id} material={m} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2 md:hidden">
          {filtered.map((m) => (
            <MobileCard key={m.id} material={m} />
          ))}
        </div>
      )}
    </div>
  );
}
