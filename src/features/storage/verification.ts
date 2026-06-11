import { todayLocalISO } from "@/shared/lib/date";

export function isVerifiedToday(verifiedOn: string | null): boolean {
  return verifiedOn === todayLocalISO();
}
