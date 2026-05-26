import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { AuthContextValue } from "@/features/auth/types";
import { AuthSplash } from "@/features/auth/AuthSplash";

interface RouterContext {
  auth: AuthContextValue;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  const { auth } = Route.useRouteContext();
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
