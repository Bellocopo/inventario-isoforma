/**
 * CLI de gerenciamento de usuários (Firebase Auth + custom claims).
 *
 * Cobre o que o console do Firebase não oferece — sobretudo os papéis
 * (custom claim `role`), que só são editáveis via Admin SDK.
 *
 * Alvo padrão: PROJETO REAL (exige GOOGLE_APPLICATION_CREDENTIALS apontando
 * para a service account). Use --emulator para o Auth emulator local.
 *
 * Uso: npm run users -- <comando> [args] [--emulator]
 *
 *   list                                   lista todos os usuários
 *   get <email>                            detalhes de um usuário
 *   create <email> <senha> [--name <nome>] [--role <admin|reader>]
 *   set-role <email> <admin|reader|none>   define/remove o papel
 *   password <email> <novaSenha>           redefine a senha
 *   disable <email>                        desativa o login
 *   enable <email>                         reativa o login
 *   delete <email> [--yes]                 apaga o usuário (real exige --yes)
 *
 * Após set-role/create-com-role, o usuário precisa relogar (ou o app chamar
 * getIdToken(true)) para a claim entrar em vigor.
 */

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { existsSync } from "node:fs";

const PROJECT_ID = "inventario-isoforma";
const ROLES = ["admin", "reader"] as const;
type Role = (typeof ROLES)[number];

// ── Parse de argumentos ───────────────────────────────────────────────────────

const raw = process.argv.slice(2);
const BOOLEAN_FLAGS = new Set(["emulator", "yes"]);
const flags: Record<string, string | boolean> = {};
const pos: string[] = [];
for (let i = 0; i < raw.length; i++) {
  const a = raw[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    if (BOOLEAN_FLAGS.has(key)) {
      flags[key] = true;
      continue;
    }
    const next = raw[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  } else {
    pos.push(a);
  }
}

const command = pos[0];
const emulator = flags.emulator === true;

function usage(): never {
  console.log(
    [
      "Uso: npm run users -- <comando> [args] [--emulator]",
      "",
      "  list                                   lista todos os usuários",
      "  get <email>                            detalhes de um usuário",
      "  create <email> <senha> [--name <nome>] [--role <admin|reader>]",
      "  set-role <email> <admin|reader|none>   define/remove o papel",
      "  password <email> <novaSenha>           redefine a senha",
      "  disable <email>                        desativa o login",
      "  enable <email>                         reativa o login",
      "  delete <email> [--yes]                 apaga o usuário",
      "",
      "Alvo padrão: PROJETO REAL (GOOGLE_APPLICATION_CREDENTIALS). --emulator usa o local.",
    ].join("\n"),
  );
  process.exit(0);
}

if (!command || command === "help" || flags.help) usage();

// ── Init do alvo ───────────────────────────────────────────────────────────────

if (emulator) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
} else {
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

if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}
const auth = getAuth();

// ── Helpers ────────────────────────────────────────────────────────────────────

function roleOf(u: UserRecord): string {
  return (u.customClaims?.role as string | undefined) ?? "—";
}

function requireRole(v: string | undefined): Role {
  if (v !== undefined && (ROLES as readonly string[]).includes(v)) {
    return v as Role;
  }
  console.error(`Papel inválido: '${v ?? ""}'. Use admin ou reader.`);
  process.exit(1);
}

function requireArg(v: string | undefined, name: string): string {
  if (!v) {
    console.error(
      `Argumento faltando: <${name}>. Rode 'npm run users -- help'.`,
    );
    process.exit(1);
  }
  return v;
}

function printUser(u: UserRecord): void {
  console.log(`email:      ${u.email ?? "—"}`);
  console.log(`uid:        ${u.uid}`);
  console.log(`papel:      ${roleOf(u)}`);
  console.log(`nome:       ${u.displayName ?? "—"}`);
  console.log(`status:     ${u.disabled ? "DESATIVADO" : "ativo"}`);
  console.log(`criado em:  ${u.metadata.creationTime}`);
}

// ── Comandos ───────────────────────────────────────────────────────────────────

try {
  switch (command) {
    case "list": {
      const rows: UserRecord[] = [];
      let pageToken: string | undefined;
      do {
        const res = await auth.listUsers(1000, pageToken);
        rows.push(...res.users);
        pageToken = res.pageToken;
      } while (pageToken);

      if (rows.length === 0) {
        console.log("Nenhum usuário.");
        break;
      }
      const emailW = Math.max(5, ...rows.map((u) => (u.email ?? "—").length));
      const header = `${"EMAIL".padEnd(emailW)}  ${"PAPEL".padEnd(7)}  STATUS`;
      console.log(header);
      console.log("-".repeat(header.length));
      for (const u of rows) {
        const status = u.disabled ? "DESATIVADO" : "ativo";
        console.log(
          `${(u.email ?? "—").padEnd(emailW)}  ${roleOf(u).padEnd(7)}  ${status}`,
        );
      }
      console.log(`\n${rows.length} usuário(s).`);
      break;
    }

    case "get": {
      const email = requireArg(pos[1], "email");
      printUser(await auth.getUserByEmail(email));
      break;
    }

    case "create": {
      const email = requireArg(pos[1], "email");
      const password = requireArg(pos[2], "senha");
      const displayName =
        typeof flags.name === "string" ? flags.name : undefined;
      const user = await auth.createUser({ email, password, displayName });
      if (typeof flags.role === "string") {
        await auth.setCustomUserClaims(user.uid, {
          role: requireRole(flags.role),
        });
      }
      console.log(`Usuário criado: ${email} (uid: ${user.uid}).`);
      if (flags.role) console.log(`Papel '${String(flags.role)}' aplicado.`);
      break;
    }

    case "set-role": {
      const email = requireArg(pos[1], "email");
      const target = requireArg(pos[2], "admin|reader|none");
      const user = await auth.getUserByEmail(email);
      const claims: Record<string, unknown> = { ...(user.customClaims ?? {}) };
      if (target === "none") {
        delete claims.role;
        await auth.setCustomUserClaims(user.uid, claims);
        console.log(`Papel removido de ${email}.`);
      } else {
        claims.role = requireRole(target);
        await auth.setCustomUserClaims(user.uid, claims);
        console.log(`Papel '${target}' aplicado em ${email}.`);
      }
      console.log("O usuário precisa relogar para a claim entrar em vigor.");
      break;
    }

    case "password": {
      const email = requireArg(pos[1], "email");
      const newPassword = requireArg(pos[2], "novaSenha");
      const user = await auth.getUserByEmail(email);
      await auth.updateUser(user.uid, { password: newPassword });
      console.log(`Senha redefinida para ${email}.`);
      break;
    }

    case "disable":
    case "enable": {
      const email = requireArg(pos[1], "email");
      const disabled = command === "disable";
      const user = await auth.getUserByEmail(email);
      await auth.updateUser(user.uid, { disabled });
      console.log(`${email} ${disabled ? "desativado" : "reativado"}.`);
      break;
    }

    case "delete": {
      const email = requireArg(pos[1], "email");
      if (!emulator && flags.yes !== true) {
        console.error(
          `Apagar '${email}' no PROJETO REAL exige --yes para confirmar. Abortado.`,
        );
        process.exit(1);
      }
      const user = await auth.getUserByEmail(email);
      await auth.deleteUser(user.uid);
      console.log(`Usuário apagado: ${email}.`);
      break;
    }

    default:
      console.error(`Comando desconhecido: '${command}'.`);
      usage();
  }
} catch (err) {
  console.error(`Erro: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
