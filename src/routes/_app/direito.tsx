import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/shared/components/EmConstrucao";

export const Route = createFileRoute("/_app/direito")({
  component: () => <EmConstrucao label="Lado Direito (plano 008)" />,
});
