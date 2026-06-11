import { AppHeader } from "@/shared/components/AppHeader";
import { AppTabs } from "@/shared/components/AppTabs";
import { Toaster } from "@/shared/components/ui/sonner";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    if (context.auth.status === "signed-out") {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader />
      <AppTabs />
      <main className="flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
