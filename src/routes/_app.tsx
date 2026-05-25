import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <span className="font-semibold">Inventário Isoforma</span>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
