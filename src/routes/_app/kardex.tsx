import { createFileRoute } from "@tanstack/react-router";
import { KardexPage } from "@/features/kardex/KardexPage";

export const Route = createFileRoute("/_app/kardex")({
  component: KardexPage,
});
