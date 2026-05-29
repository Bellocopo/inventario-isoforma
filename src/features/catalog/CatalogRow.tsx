import { useState } from "react";
import { Eye, EyeOff, Pencil } from "lucide-react";

import { TableCell, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { EmbalBadge } from "@/shared/components/EmbalBadge";
import { SUPPLIERS } from "@/shared/lib/suppliers";
import { cn } from "@/shared/lib/utils";
import { useRole } from "@/features/auth/useRole";
import { useCatalogMutations } from "./useCatalog";
import { CatalogForm } from "./CatalogForm";
import type { Material } from "./types";

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

function ColorSwatch({ material }: { material: Material }) {
  if (material.categoria === "PADRAO" && material.fornecedor) {
    const s = SUPPLIERS[material.fornecedor];
    return (
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-4 w-4 shrink-0 rounded-sm border border-black/10"
          style={{ backgroundColor: s.bg }}
        />
        <span className="text-xs">{s.label}</span>
      </span>
    );
  }
  if (material.categoria === "MASTER" && material.colorCode) {
    return (
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-4 w-4 shrink-0 rounded-sm border border-black/10"
          style={{ backgroundColor: material.colorCode }}
        />
        <span className="font-mono text-xs">{material.colorCode}</span>
      </span>
    );
  }
  return <span className="text-muted-foreground text-xs">—</span>;
}

interface CatalogRowProps {
  material: Material;
}

export function CatalogRow({ material }: CatalogRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { isAdmin } = useRole();
  const { setActive } = useCatalogMutations();

  if (isEditing) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="p-2">
          <CatalogForm
            mode="edit"
            material={material}
            materialId={material.id}
            onDone={() => setIsEditing(false)}
          />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className={cn(!material.ativo && "opacity-50")}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{material.tipo}</span>
          {!material.ativo && (
            <Badge variant="outline" className="py-0 text-[10px]">
              inativo
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn("text-[10px]", CATEGORIA_STYLE[material.categoria])}
        >
          {CATEGORIA_LABEL[material.categoria]}
        </Badge>
      </TableCell>
      <TableCell>
        <EmbalBadge type={material.embal} />
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">
        {material.kg.toLocaleString("pt-BR")}
      </TableCell>
      <TableCell>
        <ColorSwatch material={material} />
      </TableCell>
      <TableCell className="text-right">
        {isAdmin && (
          <div className="flex justify-end gap-1">
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
      </TableCell>
    </TableRow>
  );
}
