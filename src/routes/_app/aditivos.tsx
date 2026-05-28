import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/shared/components/EmConstrucao";

export const Route = createFileRoute("/_app/aditivos")({
  component: () => <EmConstrucao label="Aditivos (plano 009)" />,
});
