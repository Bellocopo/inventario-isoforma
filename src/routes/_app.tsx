import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/features/auth/useAuth";

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
  const { displayName, signOutNow } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-semibold">Inventário Isoforma</span>
        <div className="flex items-center gap-4">
          {displayName && (
            <span className="text-sm text-gray-600">{displayName}</span>
          )}
          <button
            onClick={signOutNow}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sair
          </button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
