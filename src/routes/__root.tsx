import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { AuthContextValue } from "@/features/auth/types";
import { AuthSplash } from "@/features/auth/AuthSplash";
import { useAuth } from "@/features/auth/useAuth";

interface RouterContext {
  auth: AuthContextValue;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  // Leitura reativa via React Context — `Route.useRouteContext()` é snapshot
  // do TanStack Router e não re-renderiza quando o AuthProvider atualiza.
  const auth = useAuth();
  if (auth.status === "loading") return <AuthSplash />;
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </>
  );
}
