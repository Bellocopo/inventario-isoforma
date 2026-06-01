import { createFileRoute } from "@tanstack/react-router";
import { StorageAreaPage } from "@/features/storage/StorageAreaPage";

export const Route = createFileRoute("/_app/esquerdo")({
  component: () => <StorageAreaPage area="esquerdo" />,
});
