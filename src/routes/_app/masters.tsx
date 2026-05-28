import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/shared/components/EmConstrucao";

export const Route = createFileRoute("/_app/masters")({
  component: () => <EmConstrucao label="Masters (plano 009)" />,
});
