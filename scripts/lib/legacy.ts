/**
 * Mapeamento canônico legacy/db.json → schema novo do Firestore.
 *
 * Funções puras, sem I/O de Firestore: leem o db.json e produzem
 * `{ id, data }` (sem `serverTimestamp`, que o writer injeta).
 *
 * Compartilhado por:
 *  - scripts/seed-emulator.ts          (seed do emulador, skip-if-exists)
 *  - scripts/migrate-legacy-to-firestore.ts (migração real, purge+recriar)
 */

import { readFileSync } from "node:fs";

// ── Tipos ──────────────────────────────────────────────────────────────────

export type SupplierId =
  | "none"
  | "innova"
  | "amsty"
  | "braskem"
  | "essentia"
  | "petrocuyo"
  | "unigel"
  | "estyrenics"
  | "masterbatch";
export type Categoria = "PADRAO" | "MASTER" | "ADITIVO";
export type Embal = "SC" | "BB";

export interface LegacyCatalogItem {
  tipo: string;
  embal: Embal;
  kg: number;
  colorCode?: string | null;
  categoria?: Categoria;
}

export interface LegacySlots {
  resina1?: string;
  resina2?: string;
  resina3?: string;
  resina4?: string;
  q1?: string;
  q2?: string;
  q3?: string;
  q4?: string;
}

export interface LegacyRua extends LegacySlots {
  rua: string;
  color: string;
}

export interface LegacyFreeItem extends LegacySlots {
  id: number | string;
  local: string;
}

export interface LegacyDb {
  catalogo: LegacyCatalogItem[];
  direito: LegacyRua[];
  esquerdo: LegacyRua[];
  fora: LegacyFreeItem[];
  masters: LegacyFreeItem[];
  aditivos: LegacyFreeItem[];
}

export interface DocSpec {
  id: string;
  data: Record<string, unknown>;
}

// ── Constantes ───────────────────────────────────────────────────────────────

// Ruas fixas (ordem do legado), espelhadas em Direito e Esquerdo.
export const RUAS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "A1",
  "B1",
  "C1",
  "D1",
  "E1",
  "F1",
];

export const FIXED_AREAS = ["direito", "esquerdo"] as const;
export const FREE_AREAS = ["fora", "masters", "aditivos"] as const;

const VALID_SUPPLIER_IDS = new Set<string>([
  "none",
  "innova",
  "amsty",
  "braskem",
  "essentia",
  "petrocuyo",
  "unigel",
  "estyrenics",
  "masterbatch",
]);

// ── Parsing ──────────────────────────────────────────────────────────────────

export function parseLegacyDb(path: string): LegacyDb {
  const raw = readFileSync(path, "utf-8").trim();
  // O arquivo é um export do Firestore com wrapper inválido:
  //   { <doc> },\n  "targetIds": [4]\n}
  // Extraímos só o objeto do documento.
  const fixed = raw.replace(/,\s*\n\s*"targetIds"[\s\S]*$/, "");
  const doc = JSON.parse(fixed) as {
    fields: Record<string, { stringValue: string }>;
  };
  return {
    catalogo: JSON.parse(
      doc.fields.catalogo.stringValue,
    ) as LegacyCatalogItem[],
    direito: JSON.parse(doc.fields.direito.stringValue) as LegacyRua[],
    esquerdo: JSON.parse(doc.fields.esquerdo.stringValue) as LegacyRua[],
    fora: JSON.parse(doc.fields.fora.stringValue) as LegacyFreeItem[],
    masters: JSON.parse(doc.fields.masters.stringValue) as LegacyFreeItem[],
    aditivos: JSON.parse(doc.fields.aditivos.stringValue) as LegacyFreeItem[],
  };
}

// ── Helpers puros ──────────────────────────────────────────────────────────────

function toSupplierId(color: string): SupplierId {
  return VALID_SUPPLIER_IDS.has(color) ? (color as SupplierId) : "none";
}

export function inferCategoria(item: LegacyCatalogItem): Categoria {
  if (item.categoria) return item.categoria;
  const t = item.tipo.toUpperCase();
  if (t.startsWith("MASTER")) return "MASTER";
  if (t.startsWith("ADITIVO")) return "ADITIVO";
  return "PADRAO";
}

export function catalogDocId(tipo: string, embal: string): string {
  return (
    tipo
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") +
    "_" +
    embal.toLowerCase()
  );
}

// Mapa "tipo|embal" → SupplierId, derivado das cores das ruas (Direito/Esquerdo).
export function buildSupplierMap(ruas: LegacyRua[]): Map<string, SupplierId> {
  const map = new Map<string, SupplierId>();
  for (const rua of ruas) {
    const supplierId = toSupplierId(rua.color);
    for (let i = 1; i <= 4; i++) {
      const resina = rua[`resina${i}` as keyof LegacySlots];
      if (resina) map.set(resina, supplierId);
    }
  }
  return map;
}

function buildSlots(
  src: LegacySlots,
  catalog: LegacyCatalogItem[],
  catalogIdMap: Map<string, string>,
  supplierMap: Map<string, SupplierId>,
): object[] {
  const slots: object[] = [];
  for (let i = 1; i <= 4; i++) {
    const resina = src[`resina${i}` as keyof LegacySlots];
    const qStr = src[`q${i}` as keyof LegacySlots];
    if (!resina || !qStr) continue;

    const qty = parseInt(qStr, 10);
    if (isNaN(qty) || qty <= 0) continue;

    const materialId = catalogIdMap.get(resina);
    if (!materialId) continue;

    const [tipo, embal] = resina.split("|") as [string, Embal];
    const catalogItem = catalog.find(
      (c) => c.tipo === tipo && c.embal === embal,
    );
    if (!catalogItem) continue;

    const categoria = inferCategoria(catalogItem);
    slots.push({
      materialId,
      materialSnapshot: {
        tipo,
        embal,
        kgUnit: catalogItem.kg,
        categoria,
        fornecedor:
          categoria === "PADRAO" ? (supplierMap.get(resina) ?? null) : null,
        colorCode: catalogItem.colorCode ?? null,
      },
      quantidade: qty,
    });
  }
  return slots;
}

// ── Builders ─────────────────────────────────────────────────────────────────

function buildCatalogIdMap(catalog: LegacyCatalogItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of catalog) {
    map.set(`${item.tipo}|${item.embal}`, catalogDocId(item.tipo, item.embal));
  }
  return map;
}

export function buildCatalogDocs(legacy: LegacyDb): DocSpec[] {
  const supplierMap = buildSupplierMap([...legacy.direito, ...legacy.esquerdo]);
  return legacy.catalogo.map((item) => {
    const key = `${item.tipo}|${item.embal}`;
    const categoria = inferCategoria(item);
    return {
      id: catalogDocId(item.tipo, item.embal),
      data: {
        tipo: item.tipo,
        embal: item.embal,
        kg: item.kg,
        categoria,
        colorCode: item.colorCode ?? null,
        fornecedor:
          categoria === "PADRAO" ? (supplierMap.get(key) ?? null) : null,
        ativo: true,
      },
    };
  });
}

export function buildStorageLocationDocs(legacy: LegacyDb): DocSpec[] {
  const supplierMap = buildSupplierMap([...legacy.direito, ...legacy.esquerdo]);
  const catalogIdMap = buildCatalogIdMap(legacy.catalogo);
  const docs: DocSpec[] = [];

  // Direito / Esquerdo: ruas fixas (RUAS) — vazias se ausentes no db.json.
  for (const area of FIXED_AREAS) {
    const ruaData = area === "direito" ? legacy.direito : legacy.esquerdo;
    for (let i = 0; i < RUAS.length; i++) {
      const rua = RUAS[i];
      const legacyRua = ruaData.find((r) => r.rua === rua);
      docs.push({
        id: `${area}_${rua}`,
        data: {
          area,
          rua,
          label: `${area === "direito" ? "Direito" : "Esquerdo"} ${rua}`,
          ordem: i,
          slots: legacyRua
            ? buildSlots(legacyRua, legacy.catalogo, catalogIdMap, supplierMap)
            : [],
        },
      });
    }
  }

  // Fora / Masters / Aditivos: locais dinâmicos com auto-ID determinístico.
  const freeItems: Record<(typeof FREE_AREAS)[number], LegacyFreeItem[]> = {
    fora: legacy.fora,
    masters: legacy.masters,
    aditivos: legacy.aditivos,
  };
  for (const area of FREE_AREAS) {
    const items = freeItems[area];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      docs.push({
        id: `${area}_${item.id}`,
        data: {
          area,
          rua: null,
          label: item.local.trim(),
          ordem: i,
          slots: buildSlots(item, legacy.catalogo, catalogIdMap, supplierMap),
        },
      });
    }
  }

  return docs;
}

// Integridade referencial: confere que cada resinaN (com qty>0) existe no catálogo.
export function validateRefs(legacy: LegacyDb): {
  resolved: number;
  missing: string[];
} {
  const catalogIdMap = buildCatalogIdMap(legacy.catalogo);
  const missing = new Set<string>();
  let resolved = 0;

  const sources: LegacySlots[] = [
    ...legacy.direito,
    ...legacy.esquerdo,
    ...legacy.fora,
    ...legacy.masters,
    ...legacy.aditivos,
  ];

  for (const src of sources) {
    for (let i = 1; i <= 4; i++) {
      const resina = src[`resina${i}` as keyof LegacySlots];
      const qStr = src[`q${i}` as keyof LegacySlots];
      if (!resina || !qStr) continue;
      const qty = parseInt(qStr, 10);
      if (isNaN(qty) || qty <= 0) continue;
      if (catalogIdMap.has(resina)) resolved++;
      else missing.add(resina);
    }
  }

  return { resolved, missing: [...missing] };
}
