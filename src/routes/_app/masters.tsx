import { createFileRoute } from "@tanstack/react-router";
import { FreeAreaPage } from "@/features/storage/FreeAreaPage";

export const Route = createFileRoute("/_app/masters")({
  component: () => <FreeAreaPage area="masters" />,
});
