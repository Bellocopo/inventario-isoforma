import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/shared/components/EmConstrucao";

export const Route = createFileRoute("/_app/esquerdo")({
  component: () => <EmConstrucao label="Lado Esquerdo (plano 008)" />,
});
