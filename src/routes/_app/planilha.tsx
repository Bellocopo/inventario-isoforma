import { createFileRoute } from "@tanstack/react-router";
import { PlanilhaPage } from "@/features/reports/PlanilhaPage";

export const Route = createFileRoute("/_app/planilha")({
  component: PlanilhaPage,
});
