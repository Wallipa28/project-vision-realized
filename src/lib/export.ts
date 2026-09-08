import * as XLSX from "xlsx";

export function exportRows(rows: Record<string, unknown>[], fileName: string, format: "xlsx" | "csv") {
  const ws = XLSX.utils.json_to_sheet(rows);
  if (format === "csv") {
    const csv = "\uFEFF" + XLSX.utils.sheet_to_csv(ws);
    download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${fileName}.csv`);
    return;
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "รายงาน");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${fileName}.xlsx`,
  );
}

export function printReport() {
  window.print();
}

export async function readSpreadsheet(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const sheet = wb.Sheets[first];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
