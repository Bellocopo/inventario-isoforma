/**
 * Migração legacy/db.json → Firestore (projeto REAL ou emulador).
 *
 * Estratégia: purge + recriar `catalog` e `storage_locations` (o db.json é a
 * fonte da verdade na validação). `kardex` NUNCA é tocado.
 *
 * Mapeamento canônico em scripts/lib/legacy.ts (compartilhado com o seed).
 *
 * Args:
 *   (nenhum)     dry-run: imprime resumo, não escreve   [default seguro]
 *   --commit     escreve de fato
 *   --yes        confirma escrita em projeto REAL (exigido junto com --commit)
 *   --emulator   mira o emulador local (127.0.0.1:8080) em vez do projeto real
 *
 * Credenciais (projeto real): GOOGLE_APPLICATION_CREDENTIALS=secrets/service-account.json
 *
 * Exemplos:
 *   npm run migrate                      # dry-run no projeto real
 *   npm run migrate -- --emulator --commit
 *   npm run migrate -- --commit --yes    # escreve no projeto real
 */

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applicationDefault,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";
import {
  parseLegacyDb,
  buildCatalogDocs,
  buildStorageLocationDocs,
  validateRefs,
  type DocSpec,
} from "./lib/legacy.js";

const PROJECT_ID = "inventario-isoforma";
const BATCH_LIMIT = 500;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_JSON_PATH = join(__dirname, "../legacy/db.json");

// ── Args ─────────────────────────────────────────────────────────────────────

const args = new Set(process.argv.slice(2));
const emulator = args.has("--emulator");
const commit = args.has("--commit");
const yes = args.has("--yes");
const dryRun = !commit;

// ── Init alvo ────────────────────────────────────────────────────────────────

if (emulator) {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
} else {
  // Alvo REAL exige a service account explícita. `applicationDefault()` só
  // resolve a credencial preguiçosamente (na 1ª operação de Firestore), então
  // sem este guard a falta de credencial só estouraria lá no purge/write.
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !existsSync(credPath)) {
    console.error(
      "Alvo PROJETO REAL exige a credencial da service account.\n" +
        "  Defina GOOGLE_APPLICATION_CREDENTIALS apontando para o JSON da\n" +
        "  service account (ex.: secrets/service-account.json), ou use --emulator.",
    );
    process.exit(1);
  }
}

const app: App =
  getApps()[0] ??
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db: Firestore = getFirestore(app);

// ── Helpers de escrita ───────────────────────────────────────────────────────

async function purgeCollection(name: string): Promise<number> {
  const refs = await db.collection(name).listDocuments();
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const ref of refs.slice(i, i + BATCH_LIMIT)) batch.delete(ref);
    await batch.commit();
  }
  return refs.length;
}

async function writeDocs(name: string, docs: DocSpec[]): Promise<void> {
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const { id, data } of docs.slice(i, i + BATCH_LIMIT)) {
      batch.set(db.collection(name).doc(id), {
        ...data,
        updatedBy: "migration",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

// ── Fluxo ────────────────────────────────────────────────────────────────────

console.log("== Migração legacy/db.json → Firestore ==");
console.log(`  projectId: ${PROJECT_ID}`);
console.log(
  `  alvo:      ${emulator ? "EMULADOR (127.0.0.1:8080)" : "PROJETO REAL"}`,
);
console.log(
  `  modo:      ${dryRun ? "DRY-RUN (nada será escrito)" : "COMMIT"}`,
);

const legacy = parseLegacyDb(DB_JSON_PATH);
const catalogDocs = buildCatalogDocs(legacy);
const storageDocs = buildStorageLocationDocs(legacy);
const refs = validateRefs(legacy);

console.log("\nResumo:");
console.log(`  catalog:           ${catalogDocs.length} docs`);
console.log(`  storage_locations: ${storageDocs.length} docs`);
console.log(`  refs resolvidas:   ${refs.resolved}`);
console.log(`  refs ausentes:     ${refs.missing.length}`);
for (const m of refs.missing) console.log(`    - ${m}`);

// Guard: projeto real + commit exige --yes
if (!emulator && commit && !yes) {
  console.error(
    "\nAlvo REAL + --commit exige --yes para confirmar a escrita. Abortado.",
  );
  process.exit(1);
}

if (dryRun) {
  console.log("\nDRY-RUN — nada foi escrito. Use --commit para aplicar.");
  process.exit(0);
}

console.log("\nPurge (catalog + storage_locations; kardex intocado)...");
const delCat = await purgeCollection("catalog");
const delLoc = await purgeCollection("storage_locations");
console.log(
  `  catalog: ${delCat} apagados; storage_locations: ${delLoc} apagados.`,
);

console.log("\nWrite...");
await writeDocs("catalog", catalogDocs);
await writeDocs("storage_locations", storageDocs);
console.log(
  `  catalog: ${catalogDocs.length} escritos; storage_locations: ${storageDocs.length} escritos.`,
);

console.log("\nMigração concluída.");
