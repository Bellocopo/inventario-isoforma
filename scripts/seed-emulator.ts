/**
 * Seed do Firebase Auth Emulator.
 *
 * Cria usuários padrão para desenvolvimento local.
 * Pode ser rodado standalone (espera o emulador ficar pronto):
 *   npm run seed:emu
 *
 * Ou é invocado automaticamente pelo start-emu.ts.
 */

import net from "node:net";
import {
  getApps,
  initializeApp,
  type App,
  type Credential,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const AUTH_PORT = 9099;
const PROJECT_ID = "inventario-isoforma";

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

// Deve ser definido ANTES dos imports do firebase-admin
process.env.FIREBASE_AUTH_EMULATOR_HOST = `localhost:${AUTH_PORT}`;

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

// Fake credential: o emulador não valida tokens
const fakeCredential: Credential = {
  getAccessToken() {
    return Promise.resolve({
      access_token: "emulator-fake-token",
      expires_in: 3600,
    });
  },
};

console.log("Aguardando Auth Emulator...");
await waitForPort(AUTH_PORT);
console.log("Auth Emulator pronto. Aplicando seed...\n");

const app: App =
  getApps()[0] ??
  initializeApp({ credential: fakeCredential, projectId: PROJECT_ID });

const auth = getAuth(app);

for (const { email, password, displayName, role } of SEED_USERS) {
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    console.log(`  skip  ${email} (já existe)`);
  } catch {
    const created = await auth.createUser({ email, password, displayName });
    uid = created.uid;
    console.log(`  criar ${email}`);
  }
  await auth.setCustomUserClaims(uid, { role });
  console.log(`  claim ${email} → role=${role}`);
}

console.log("\nSeed concluído.");
