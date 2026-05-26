import { useContext } from "react";
import { AuthCtx } from "./AuthProvider";

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth() fora de <AuthProvider>");
  return ctx;
}
