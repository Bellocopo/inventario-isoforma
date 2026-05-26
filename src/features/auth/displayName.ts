import type { User } from "firebase/auth";

export function getDisplayName(user: User | null): string | null {
  if (!user) return null;
  if (user.displayName && user.displayName.trim()) return user.displayName;
  const email = user.email ?? "";
  const local = email.split("@")[0] ?? "";
  if (!local) return null;
  return local.charAt(0).toUpperCase() + local.slice(1);
}
