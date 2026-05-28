import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/shared/components/EmConstrucao";

export const Route = createFileRoute("/_app/planilha")({
  component: () => <EmConstrucao label="Planilha Amarela (plano 012)" />,
});
