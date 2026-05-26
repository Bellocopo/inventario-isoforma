import { Loader2 } from "lucide-react";

export function AuthSplash() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        Inventário Isoforma
      </h1>
      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
    </div>
  );
}
