/**
 * Seed do Firebase Emulator Suite (Auth + Firestore).
 *
 * Cria:
 *  - Usuários padrão (Auth)
 *  - Catálogo de materiais (dados reais do legacy/db.json)
 *  - Ruas Direito/Esquerdo com slots populados (dados reais do legacy/db.json)
 *  - Áreas livres Fora/Masters/Aditivos (locais dinâmicos do legacy/db.json)
 *
 * O mapeamento legacy → schema novo vive em scripts/lib/legacy.ts (canônico,
 * compartilhado com a migração real). Aqui só fazemos a escrita no emulador.
 *
 * Kardex começa vazio (sem histórico migrado).
 * Idempotente: docs já existentes são ignorados.
 * Pode ser rodado standalone: npm run seed:emu
 * Ou é invocado automaticamente pelo start-emu.ts.
 */

import net from "node:net";
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
import {
  parseLegacyDb,
  buildCatalogDocs,
  buildStorageLocationDocs,
} from "./lib/legacy.js";

// ── Config ───────────────────────────────────────────────────────────────────

const AUTH_PORT = 9099;
const PROJECT_ID = "inventario-isoforma";

// Deve ser definido ANTES da inicialização do SDK
process.env.FIREBASE_AUTH_EMULATOR_HOST = `localhost:${AUTH_PORT}`;
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

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

// ── Bootstrap ────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_JSON_PATH = join(__dirname, "../legacy/db.json");

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

// ── 2. Dados (catálogo + storage_locations) ──────────────────────────────────

const legacy = parseLegacyDb(DB_JSON_PATH);

console.log("\nSeed catálogo...");
let catCriadas = 0;
let catIgnoradas = 0;
for (const { id, data } of buildCatalogDocs(legacy)) {
  const ref = db.collection("catalog").doc(id);
  if ((await ref.get()).exists) {
    catIgnoradas++;
    continue;
  }
  await ref.set({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  catCriadas++;
}
console.log(`  ${catCriadas} criados, ${catIgnoradas} ignorados.`);

console.log("\nSeed storage_locations...");
let locCriadas = 0;
let locIgnoradas = 0;
for (const { id, data } of buildStorageLocationDocs(legacy)) {
  const ref = db.collection("storage_locations").doc(id);
  if ((await ref.get()).exists) {
    locIgnoradas++;
    continue;
  }
  await ref.set({
    ...data,
    updatedBy: "seed",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  locCriadas++;
}
console.log(`  ${locCriadas} locais criados (${locIgnoradas} ignorados).`);

console.log("\nSeed concluído.");
