import { useAuth } from "./useAuth";

export function useRole() {
  const { role } = useAuth();
  return { role, isAdmin: role === "admin", isReader: role === "reader" };
}
