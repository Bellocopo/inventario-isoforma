import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import { AuthProvider } from "./features/auth/AuthProvider";
import { useAuth } from "./features/auth/useAuth";
import type { AuthContextValue } from "./features/auth/types";
import "./styles/globals.css";

const router = createRouter({
  routeTree,
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
  return <RouterProvider router={router} context={{ auth }} />;
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root não encontrado");
createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <InnerRouter />
    </AuthProvider>
  </StrictMode>,
);
