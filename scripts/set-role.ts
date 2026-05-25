import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [, , email, role = "admin"] = process.argv;
if (!email || !["admin", "reader"].includes(role)) {
  console.error("Uso: npm run set-role -- <email> <admin|reader>");
  process.exit(1);
}

if (!getApps().length) initializeApp({ credential: applicationDefault() });

const auth = getAuth();
const user = await auth.getUserByEmail(email);
const nextClaims = { ...(user.customClaims ?? {}), role };
await auth.setCustomUserClaims(user.uid, nextClaims);
console.log(`Role '${role}' aplicado em ${email} (uid: ${user.uid}).`);
console.log(
  "O usuário precisa relogar (ou app fazer getIdToken(true)) para ver a claim.",
);
