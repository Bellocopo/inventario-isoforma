/**
 * Seed do Firebase Emulator Suite (Auth + Firestore).
 *
 * Cria:
 *  - Usuários padrão (Auth)
 *  - Catálogo de materiais (dados reais do legacy/db.json)
 *  - Ruas Direito/Esquerdo com slots populados (dados reais do legacy/db.json)
 *
 * Idempotente: docs já existentes são ignorados.
 * Pode ser rodado standalone: npm run seed:emu
 * Ou é invocado automaticamente pelo start-emu.ts.
 */

import net from "node:net";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applicationDefault,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// ── Config ───────────────────────────────────────────────────────────────────

const AUTH_PORT = 9099;
const PROJECT_ID = "inventario-isoforma";

// Deve ser definido ANTES da inicialização do SDK
process.env.FIREBASE_AUTH_EMULATOR_HOST = `localhost:${AUTH_PORT}`;
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

// ── Types (inline — scripts/ não importa de src/) ────────────────────────────

type SupplierId =
  | "none"
  | "innova"
  | "amsty"
  | "braskem"
  | "essentia"
  | "petrocuyo"
  | "unigel"
  | "estyrenics"
  | "masterbatch";
type Categoria = "PADRAO" | "MASTER" | "ADITIVO";
type Embal = "SC" | "BB";

interface LegacyCatalogItem {
  tipo: string;
  embal: Embal;
  kg: number;
  colorCode?: string | null;
  categoria?: Categoria;
}

interface LegacyRua {
  rua: string;
  color: string;
  resina1?: string;
  resina2?: string;
  resina3?: string;
  resina4?: string;
  q1?: string;
  q2?: string;
  q3?: string;
  q4?: string;
}

// ── Seed de usuários ─────────────────────────────────────────────────────────

const SEED_USERS: {
  email: string;
  password: string;
  displayName: string;
  role: "admin" | "reader";
}[] = [
  {
    email: "admin@isoforma.local",
    password: "admin123",
    displayName: "Admin",
    role: "admin",
  },
  {
    email: "viewer@isoforma.local",
    password: "viewer123",
    displayName: "Viewer",
    role: "reader",
  },
];

// ── Ruas fixas (ordem do legado) ─────────────────────────────────────────────

const RUAS = [
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
  "X",
  "Y",
  "Z",
  "A1",
  "B1",
  "C1",
  "D1",
  "E1",
  "F1",
  "G1",
];

const AREAS = ["direito", "esquerdo"] as const;

// ── Ler legacy/db.json ───────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseLegacyDb() {
  const raw = readFileSync(
    join(__dirname, "../legacy/db.json"),
    "utf-8",
  ).trim();
  // O arquivo é um export do Firestore com wrapper inválido:
  // { <doc> },\n  "targetIds": [4]\n}
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
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function toSupplierId(color: string): SupplierId {
  return VALID_SUPPLIER_IDS.has(color) ? (color as SupplierId) : "none";
}

function inferCategoria(item: LegacyCatalogItem): Categoria {
  if (item.categoria) return item.categoria;
  const t = item.tipo.toUpperCase();
  if (t.startsWith("MASTER")) return "MASTER";
  if (t.startsWith("ADITIVO")) return "ADITIVO";
  return "PADRAO";
}

function catalogDocId(tipo: string, embal: string): string {
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

// ── Bootstrap ────────────────────────────────────────────────────────────────

async function waitForPort(port: number, timeout = 30_000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await new Promise<boolean>((resolve) => {
      const socket = net.connect({ port, host: "localhost" }, () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
    });
    if (ready) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Auth emulator (porta ${port}) não ficou pronto em ${timeout}ms`,
  );
}

console.log("Aguardando Auth Emulator...");
await waitForPort(AUTH_PORT);
console.log("Auth Emulator pronto. Aplicando seed...\n");

const app: App =
  getApps()[0] ??
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });

const auth = getAuth(app);
const db = getFirestore(app);

// ── 1. Usuários ──────────────────────────────────────────────────────────────

console.log("Seed usuários...");
for (const { email, password, displayName, role } of SEED_USERS) {
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    console.log(`  skip  ${email}`);
  } catch {
    const created = await auth.createUser({ email, password, displayName });
    uid = created.uid;
    console.log(`  criar ${email}`);
  }
  await auth.setCustomUserClaims(uid, { role });
}

// ── 2. Catálogo ──────────────────────────────────────────────────────────────

console.log("\nSeed catálogo...");
const {
  catalogo,
  direito: direitoRuas,
  esquerdo: esquerdoRuas,
} = parseLegacyDb();

// Mapa "tipo|embal" → SupplierId (derivado das cores das ruas)
const supplierMap = new Map<string, SupplierId>();
for (const rua of [...direitoRuas, ...esquerdoRuas]) {
  const supplierId = toSupplierId(rua.color);
  for (let i = 1; i <= 4; i++) {
    const resina = rua[`resina${i}` as keyof LegacyRua] as string | undefined;
    if (resina) supplierMap.set(resina, supplierId);
  }
}

// Mapa "tipo|embal" → docId (para resolver slots)
const catalogIdMap = new Map<string, string>();
let catCriadas = 0;
let catIgnoradas = 0;

for (const item of catalogo) {
  const key = `${item.tipo}|${item.embal}`;
  const docId = catalogDocId(item.tipo, item.embal);
  catalogIdMap.set(key, docId);

  const ref = db.collection("catalog").doc(docId);
  if ((await ref.get()).exists) {
    catIgnoradas++;
    continue;
  }

  const categoria = inferCategoria(item);
  await ref.set({
    tipo: item.tipo,
    embal: item.embal,
    kg: item.kg,
    categoria,
    colorCode: item.colorCode ?? null,
    fornecedor: categoria === "PADRAO" ? (supplierMap.get(key) ?? null) : null,
    ativo: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  catCriadas++;
}
console.log(`  ${catCriadas} criados, ${catIgnoradas} ignorados.`);

// ── 3. Storage locations ─────────────────────────────────────────────────────

console.log("\nSeed storage_locations...");

function buildSlots(rua: LegacyRua): object[] {
  const slots: object[] = [];
  for (let i = 1; i <= 4; i++) {
    const resina = rua[`resina${i}` as keyof LegacyRua] as string | undefined;
    const qStr = rua[`q${i}` as keyof LegacyRua] as string | undefined;
    if (!resina || !qStr) continue;

    const qty = parseInt(qStr, 10);
    if (isNaN(qty) || qty <= 0) continue;

    const materialId = catalogIdMap.get(resina);
    if (!materialId) {
      console.warn(`  warn  material não mapeado: ${resina}`);
      continue;
    }

    const [tipo, embal] = resina.split("|") as [string, Embal];
    const catalogItem = catalogo.find(
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

let locCriadas = 0;
let locIgnoradas = 0;

for (const area of AREAS) {
  const ruaData = area === "direito" ? direitoRuas : esquerdoRuas;

  for (let i = 0; i < RUAS.length; i++) {
    const rua = RUAS[i];
    const id = `${area}_${rua}`;
    const ref = db.collection("storage_locations").doc(id);

    if ((await ref.get()).exists) {
      locIgnoradas++;
      continue;
    }

    const legacyRua = ruaData.find((r) => r.rua === rua);
    const slots = legacyRua ? buildSlots(legacyRua) : [];

    await ref.set({
      area,
      rua,
      label: `${area === "direito" ? "Direito" : "Esquerdo"} ${rua}`,
      ordem: i,
      slots,
      updatedBy: "seed",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    locCriadas++;
  }
}
console.log(`  ${locCriadas} ruas criadas (${locIgnoradas} ignoradas).`);
console.log("\nSeed concluído.");
