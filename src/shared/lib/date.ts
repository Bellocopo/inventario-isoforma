export function todayLocalISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// "YYYY-MM-DD" local → "dd/mm" (ou "dd/mm/yyyy" com { year: true }).
export function formatLocalISOToBr(
  iso: string,
  opts: { year?: boolean } = {},
): string {
  const [y, m, d] = iso.split("-");
  return opts.year ? `${d}/${m}/${y}` : `${d}/${m}`;
}
