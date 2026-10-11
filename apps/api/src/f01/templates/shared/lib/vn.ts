// Vietnamese formatting and CSV export helpers for generated shop apps.
// Self-contained on purpose: tests import this file directly with node --test.

export type CsvColumn<Row> = { key: keyof Row & string; label: string };

/** 1250000 -> "1.250.000 ₫". Rounds to whole đồng. */
export function formatVND(amount: number): string {
  if (!Number.isFinite(amount) || Math.abs(amount) > Number.MAX_SAFE_INTEGER) throw new RangeError("Số tiền không hợp lệ");
  const rounded = Math.round(Math.abs(amount));
  const digits = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (amount < 0 && rounded !== 0 ? "-" : "") + digits + " ₫";
}

/** Date, timestamp or ISO string -> "dd/mm/yyyy" in local time; "" when invalid. */
export function formatDate(value: Date | string | number): string {
  let date: Date;
  const dateOnly = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (dateOnly) {
    // JS parses "YYYY-MM-DD" as UTC midnight; treat it as a local calendar date instead.
    date = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    if (date.getMonth() !== Number(dateOnly[2]) - 1 || date.getDate() !== Number(dateOnly[3])) return "";
  } else {
    date = value instanceof Date ? value : new Date(value);
  }
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? formatDate(value) : String(value);
  // Stop spreadsheet apps from running text cells as formulas.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV with a UTF-8 BOM so Excel shows Vietnamese correctly. */
export function toCSV<Row extends Record<string, unknown>>(rows: readonly Row[], columns: readonly CsvColumn<Row>[]): string {
  const lines = [columns.map((column) => csvCell(column.label)).join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column.key])).join(","));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

/** Browser only: saves the CSV text as a file. */
export function downloadCSV(filename: string, csv: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : filename + ".csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
