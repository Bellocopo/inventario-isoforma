export type CorridorArea = "direito" | "esquerdo";

export interface CorridorCount {
  area: CorridorArea; // id do doc ("direito" | "esquerdo")
  lastCompleteOn: string | null; // "YYYY-MM-DD" local (BRT); null = nunca
}
