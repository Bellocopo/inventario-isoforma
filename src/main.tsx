import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./features/auth/AuthProvider";
import type { AuthContextValue } from "./features/auth/types";
import { useAuth } from "./features/auth/useAuth";
import { ThemeProvider } from "./features/theme/theme-provider";
import { routeTree } from "./routeTree.gen";
import "./styles/globals.css";

const router = createRouter({
  routeTree,
  // sob GitHub Pages o app vive em /inventario-isoforma/; em dev, na raiz.
  // BASE_URL vem do `base` do Vite (com barra final, removida aqui).
  basepath: import.meta.env.BASE_URL.replace(/\/$/, ""),
  // contexto preenchido em runtime pelo InnerRouter via RouterProvider
  context: { auth: undefined as unknown as AuthContextValue },
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function InnerRouter() {
  const auth = useAuth();
  // Quando o status do auth muda (loading → signed-in/out), invalida o
  // router para que os `beforeLoad` das rotas re-rodem com o context novo.
  useEffect(() => {
    void router.invalidate();
  }, [auth.status]);
  return <RouterProvider router={router} context={{ auth }} />;
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root não encontrado");
createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="inventario-theme">
      <AuthProvider>
        <InnerRouter />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
