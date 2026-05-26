import type { User } from "firebase/auth";

export type Role = "admin" | "reader";

export type AuthStatus = "loading" | "signed-in" | "signed-out";

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  role: Role | null;
  displayName: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOutNow: () => Promise<void>;
};
