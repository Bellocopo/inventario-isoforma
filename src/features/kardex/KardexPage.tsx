import { useMemo, useState } from "react";
import { Trash2, X } from "lucide-react";
import { useRole } from "@/features/auth/useRole";
import { MaterialCombobox } from "@/shared/components/MaterialCombobox";
import { LocationCombobox } from "@/shared/components/LocationCombobox";
import { EmbalBadge } from "@/shared/components/EmbalBadge";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/components/ui/pagination";
import { useKardex, useKardexMutations } from "./useKardex";
import type { KardexEntry, KardexFilters, KardexTipo } from "./types";
import type { Material } from "@/features/catalog/types";

const PAGE_SIZES = [25, 50, 100] as const;
type PageSize = (typeof PAGE_SIZES)[number];

function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatKg(kg: number): string {
  return (
    Math.abs(kg).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }) + " kg"
  );
}

function TipoBadge({ tipo }: { tipo: KardexTipo }) {
  if (tipo === "ENTRADA")
    return (
      <Badge className="bg-success text-success-foreground">ENTRADA</Badge>
    );
  return <Badge variant="destructive">SAÍDA</Badge>;
}

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <div className="bg-muted h-4 animate-pulse rounded" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

interface KardexRowProps {
  entry: KardexEntry;
  isAdmin: boolean;
  onDelete: () => void;
}

function KardexRow({ entry, isAdmin, onDelete }: KardexRowProps) {
  return (
    <TableRow>
      <TableCell className="text-xs whitespace-nowrap tabular-nums">
        {formatDateTime(entry.timestamp)}
      </TableCell>
      <TableCell>
        <TipoBadge tipo={entry.tipo} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm">
            {entry.materialSnapshot.tipo}
          </span>
          <EmbalBadge
            type={entry.materialSnapshot.embal}
            className="shrink-0"
          />
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <span className="text-sm">{entry.qtd}</span>
        <span className="text-muted-foreground ml-1 text-xs">
          {formatKg(entry.kgTotal)}
        </span>
      </TableCell>
      <TableCell className="text-sm">{entry.locationLabel}</TableCell>
      <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
        {entry.userDisplay}
      </TableCell>
      {isAdmin && (
        <TableCell>
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive p-1 transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </TableCell>
      )}
    </TableRow>
  );
}

export function KardexPage() {
  const { isAdmin } = useRole();

  const [filters, setFilters] = useState<KardexFilters>({});
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { entries, loading, page, totalPages, goNext, goPrev, hasNext } =
    useKardex({ filters, pageSize });
  const { deleteEntry } = useKardexMutations();

  const { entradaKg, saidaKg } = useMemo(() => {
    let entradaKg = 0;
    let saidaKg = 0;
    for (const e of entries) {
      if (e.tipo === "ENTRADA") entradaKg += e.kgTotal;
      else saidaKg += e.kgTotal;
    }
    return { entradaKg, saidaKg };
  }, [entries]);

  const balance = entradaKg - saidaKg;
  const hasFilters =
    filters.materialId !== undefined ||
    filters.locationId !== undefined ||
    filters.tipo !== undefined;

  const colCount = isAdmin ? 7 : 6;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Kardex</h1>
        <p className="text-muted-foreground text-sm">
          Histórico de movimentações de estoque.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="py-4">
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Entradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-success text-lg font-bold tabular-nums">
              +{formatKg(entradaKg)}
            </p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Saídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive text-lg font-bold tabular-nums">
              -{formatKg(saidaKg)}
            </p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Balanço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-lg font-bold tabular-nums ${balance >= 0 ? "text-success" : "text-destructive"}`}
            >
              {balance >= 0 ? "+" : "-"}
              {formatKg(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-56">
          <MaterialCombobox
            value={filters.materialId ?? null}
            onSelect={(m: Material | null) =>
              setFilters((prev) => ({ ...prev, materialId: m?.id }))
            }
          />
        </div>

        <div className="w-full sm:w-48">
          <LocationCombobox
            value={filters.locationId ?? null}
            onSelect={(id) =>
              setFilters((prev) => ({ ...prev, locationId: id ?? undefined }))
            }
          />
        </div>

        <Select
          value={filters.tipo ?? "all"}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              tipo: v === "all" ? undefined : (v as KardexTipo),
            }))
          }
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ENTRADA">ENTRADA</SelectItem>
            <SelectItem value="SAIDA">SAÍDA</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({})}
            className="gap-1.5"
          >
            <X className="size-3.5" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Qtd / Peso</TableHead>
              <TableHead>Local</TableHead>
              <TableHead className="hidden md:table-cell">Usuário</TableHead>
              {isAdmin && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={5} cols={colCount} />
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  Nenhuma movimentação registrada.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <KardexRow
                  key={entry.id}
                  entry={entry}
                  isAdmin={isAdmin}
                  onDelete={() => setDeleteTargetId(entry.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            Linhas por página
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v) as PageSize)}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-muted-foreground text-sm">
          Página {page} de {totalPages}
        </span>

        <Pagination className="w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => {
                  e.preventDefault();
                  goPrev();
                }}
                aria-disabled={page <= 1}
                className={
                  page <= 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={(e) => {
                  e.preventDefault();
                  goNext();
                }}
                aria-disabled={!hasNext}
                className={
                  !hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entrada</AlertDialogTitle>
            <AlertDialogDescription>
              Esta entrada será permanentemente removida do Kardex.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTargetId) deleteEntry(deleteTargetId);
                setDeleteTargetId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
