import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/shared/lib/firebase";
import { getDisplayName } from "./displayName";
import type { AuthContextValue, AuthStatus, Role } from "./types";

export const AuthCtx = createContext<AuthContextValue | null>(null);

function readRole(claims: Record<string, unknown>): Role | null {
  const r = claims.role;
  return r === "admin" || r === "reader" ? r : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let cancelled = false;

    const apply = async (u: User | null) => {
      if (cancelled) return;
      if (!u) {
        setUser(null);
        setRole(null);
        setStatus("signed-out");
        return;
      }
      const tokenResult = await u.getIdTokenResult();
      if (cancelled) return;
      setUser(u);
      setRole(readRole(tokenResult.claims));
      setStatus("signed-in");
    };

    // authStateReady() resolve quando a persistência foi lida. É um caminho
    // garantido para o estado inicial mesmo se o callback do
    // onAuthStateChanged for perdido no double-mount do StrictMode.
    void auth.authStateReady().then(() => apply(auth.currentUser));

    const unsubscribe = onAuthStateChanged(auth, apply);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      role,
      displayName: getDisplayName(user),
      async signIn(email, password) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        // força refresh para ler claim recém-aplicada por set-role entre sessões
        const tokenResult = await cred.user.getIdTokenResult(true);
        setUser(cred.user);
        setRole(readRole(tokenResult.claims));
        setStatus("signed-in");
      },
      async signOutNow() {
        await signOut(auth);
        // o listener acima zera estado
      },
    }),
    [status, user, role],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
