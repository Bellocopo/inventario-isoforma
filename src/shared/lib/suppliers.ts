export const SUPPLIERS = {
  none: { label: "Sem cor", bg: "#ffffff", fg: "#000000" },
  innova: { label: "Innova", bg: "#fca5a5", fg: "#000000" },
  amsty: { label: "AmSty", bg: "#d1d5db", fg: "#000000" },
  braskem: { label: "Braskem", bg: "#3b82f6", fg: "#ffffff" },
  essentia: { label: "Essentia", bg: "#facc15", fg: "#000000" },
  petrocuyo: { label: "Petrocuyo", bg: "#1e40af", fg: "#ffffff" },
  unigel: { label: "Unigel", bg: "#9333ea", fg: "#ffffff" },
  estyrenics: { label: "E.Styrenics", bg: "#16a34a", fg: "#ffffff" },
  masterbatch: { label: "Masterbatch", bg: "#f472b6", fg: "#ffffff" },
} as const;

export type SupplierId = keyof typeof SUPPLIERS;
export const SUPPLIER_IDS = Object.keys(SUPPLIERS) as SupplierId[];
