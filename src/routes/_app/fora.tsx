import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/shared/components/EmConstrucao";

export const Route = createFileRoute("/_app/fora")({
  component: () => <EmConstrucao label="Fora do Local (plano 009)" />,
});
