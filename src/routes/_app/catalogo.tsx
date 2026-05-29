import { createFileRoute } from "@tanstack/react-router";
import { CatalogForm } from "@/features/catalog/CatalogForm";
import { CatalogList } from "@/features/catalog/CatalogList";
import { useRole } from "@/features/auth/useRole";

function CatalogoPage() {
  const { isAdmin } = useRole();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          Catálogo de Materiais
        </h1>
        <p className="text-muted-foreground text-sm">
          Resinas, masters e aditivos cadastrados.
        </p>
      </div>

      {isAdmin && <CatalogForm mode="add" />}

      <CatalogList />
    </div>
  );
}

export const Route = createFileRoute("/_app/catalogo")({
  component: CatalogoPage,
});
