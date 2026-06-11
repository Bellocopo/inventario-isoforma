import { consolidate } from "@/features/dashboard/aggregate";
import { useAllStorage } from "@/features/storage/useStorage";
import { EmbalBadge } from "@/shared/components/EmbalBadge";
import { Button } from "@/shared/components/ui/button";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { exportPlanilhaXlsx } from "./exportExcel";
import { buildPlanilha } from "./planilha";
import type { PlanilhaRow } from "./types";

const nf = new Intl.NumberFormat("pt-BR");
const QTD_COLS = 10;

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDatePtBr(dateISO: string): string {
  const [y, m, d] = dateISO.split("-");
  return `${d}/${m}/${y}`;
}

function rowTint(row: PlanilhaRow): string {
  if (row.categoria === "MASTER") return "bg-[#fce4ec]";
  if (row.categoria === "ADITIVO") return "bg-[#ede7f6]";
  return "";
}

function PlanilhaSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="bg-muted h-8 w-64 animate-pulse rounded" />
      <div className="bg-card h-96 animate-pulse rounded-xl border" />
    </div>
  );
}

export function PlanilhaPage() {
  const { locations, loading } = useAllStorage();
  const data = useMemo(
    () => buildPlanilha(consolidate(locations)),
    [locations],
  );
  const dateISO = todayISO();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await exportPlanilhaXlsx(data, dateISO);
    } catch {
      toast.error("Erro ao gerar o Excel.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <PlanilhaSkeleton />;

  const isEmpty = data.rows.length === 0;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Planilha Amarela</h1>
          <p className="text-muted-foreground text-sm">
            Consolidado de fechamento — {formatDatePtBr(dateISO)}
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={isEmpty || exporting}
          className="bg-success text-success-foreground hover:bg-success/90 gap-2"
        >
          <Download className="size-4" />
          {exporting ? "Gerando..." : "Baixar Excel"}
        </Button>
      </div>

      {isEmpty ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Nenhum material com saldo para consolidar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#ffff00] text-black">
                <th className="border border-black/30 px-2 py-1.5 text-left font-bold">
                  TIPO
                </th>
                <th className="border border-black/30 px-2 py-1.5 font-bold">
                  EMBAL
                </th>
                <th className="border border-black/30 px-2 py-1.5 text-right font-bold">
                  KG
                </th>
                {Array.from({ length: QTD_COLS }, (_, i) => (
                  <th
                    key={i}
                    className="border border-black/30 px-1.5 py-1.5 text-center font-bold"
                  >
                    {i + 1}
                  </th>
                ))}
                <th className="border border-black/30 px-2 py-1.5 text-right font-bold">
                  TOTAL (UNID)
                </th>
                <th className="border border-black/30 px-2 py-1.5 text-right font-bold">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.tipo + row.embal} className={rowTint(row)}>
                  <td className="border border-black/20 px-2 py-1.5 font-medium">
                    <span className="flex items-center gap-1.5">
                      {row.categoria === "MASTER" && row.colorCode && (
                        <span
                          className="inline-block size-3 shrink-0 rounded-sm border border-black/10"
                          style={{ backgroundColor: row.colorCode }}
                        />
                      )}
                      <span>{row.tipo}</span>
                    </span>
                  </td>
                  <td className="border border-black/20 px-2 py-1.5 text-center">
                    <EmbalBadge type={row.embal} />
                  </td>
                  <td className="border border-black/20 px-2 py-1.5 text-right tabular-nums">
                    {nf.format(row.kgUnit)}
                  </td>
                  {row.qtds.map((q, i) => (
                    <td
                      key={i}
                      className="border border-black/20 px-1.5 py-1.5 text-center tabular-nums"
                    >
                      {q === null ? "" : nf.format(q)}
                    </td>
                  ))}
                  <td className="border border-black/20 px-2 py-1.5 text-right font-semibold tabular-nums">
                    {nf.format(row.totalUnid)}
                    {row.isSaco && (
                      <span className="text-muted-foreground"> scs</span>
                    )}
                  </td>
                  <td className="border border-black/20 px-2 py-1.5 text-right font-semibold tabular-nums">
                    {nf.format(Math.round(row.totalKg))}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#ffff00] font-bold text-black">
                <td
                  colSpan={3 + QTD_COLS}
                  className="border border-black/30 px-2 py-1.5 text-right"
                >
                  TOTAIS (paletes — exclui sacos)
                </td>
                <td className="border border-black/30 px-2 py-1.5 text-right tabular-nums">
                  {nf.format(data.totalUnidPaletes)}
                </td>
                <td className="border border-black/30 px-2 py-1.5 text-right tabular-nums">
                  {nf.format(Math.round(data.totalKg))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
