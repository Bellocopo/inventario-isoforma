import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/shared/components/EmConstrucao";

export const Route = createFileRoute("/_app/kardex")({
  component: () => <EmConstrucao label="Kardex (plano 010)" />,
});
