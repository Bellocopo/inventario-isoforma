export const SACK_KG_THRESHOLD = 25;

export const isSaco = (kgUnit: number) => kgUnit <= SACK_KG_THRESHOLD;
export const isPalete = (kgUnit: number) => kgUnit > SACK_KG_THRESHOLD;

export const unitLabel = (kgUnit: number, plural = true) =>
  isSaco(kgUnit) ? (plural ? "SACOS" : "SACO") : plural ? "PALETES" : "PALETE";
