import { useQuery } from "@tanstack/react-query";

export type Filters = {
  from: string;
  to: string;
  shift: string;
  plantId: string;
  lineId: string;
  productId: string;
};

export const ALL = "all";

export function defaultFilters(days = 29): Filters {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);
  return {
    from: toISO(from),
    to: toISO(to),
    shift: ALL,
    plantId: ALL,
    lineId: ALL,
    productId: ALL,
  };
}

export function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function fmt(n: number, digits = 0) {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function thaiDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
  });
}

export type MasterData = {
  plants: { id: string; code: string; name: string }[];
  lines: { id: string; code: string; name: string; plant_id: string }[];
  machines: { id: string; code: string; name: string; line_id: string }[];
  products: { id: string; code: string; name: string; unit: string }[];
};

export function useMasterData() {
  return useQuery({
    queryKey: ["master"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<MasterData> => getLocalMasterData(),
  });
}

export type ProductionRow = {
  id: string;
  prod_date: string;
  shift: string;
  plant_id: string;
  line_id: string;
  machine_id: string | null;
  product_id: string;
  plan_qty: number;
  actual_qty: number;
  good_qty: number;
  defect_qty: number;
  reject_qty: number;
};

export function useProduction(f: Filters) {
  return useQuery({
    queryKey: ["production", f],
    queryFn: async (): Promise<ProductionRow[]> => listLocalProduction(f),
  });
}

export type DowntimeRow = {
  id: string;
  prod_date: string;
  line_id: string;
  machine_id: string | null;
  start_time: string;
  end_time: string;
  duration_min: number;
  category: string;
  cause: string | null;
  note: string | null;
};

export function useDowntime(f: Filters) {
  return useQuery({
    queryKey: ["downtime", f],
    queryFn: async (): Promise<DowntimeRow[]> => listLocalDowntime(f),
  });
}

export type DefectRow = {
  id: string;
  prod_date: string;
  line_id: string;
  product_id: string;
  defect_type: string;
  qty: number;
};

export function useDefects(f: Filters) {
  return useQuery({
    queryKey: ["defects", f],
    queryFn: async (): Promise<DefectRow[]> => listLocalDefects(f),
  });
}

export function summarize(rows: ProductionRow[]) {
  const plan = rows.reduce((s, r) => s + Number(r.plan_qty), 0);
  const actual = rows.reduce((s, r) => s + Number(r.actual_qty), 0);
  const good = rows.reduce((s, r) => s + Number(r.good_qty), 0);
  const defect = rows.reduce((s, r) => s + Number(r.defect_qty), 0);
  const reject = rows.reduce((s, r) => s + Number(r.reject_qty), 0);
  return {
    plan,
    actual,
    good,
    defect,
    reject,
    achievement: plan ? (actual / plan) * 100 : 0,
    yield: actual ? (good / actual) * 100 : 0,
    defectRate: actual ? (defect / actual) * 100 : 0,
    rejectRate: actual ? (reject / actual) * 100 : 0,
  };
}

export function groupBy<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

const DATA_STORAGE_KEY = "production-intelligence:data:v1";

type LocalDataset = MasterData & {
  production: ProductionRow[];
  downtime: DowntimeRow[];
  defects: DefectRow[];
};

type LocalStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type NewProductionRecord = Omit<ProductionRow, "id" | "good_qty" | "machine_id"> & {
  machine_id?: string | null;
};

export function getLocalMasterData(): MasterData {
  const { plants, lines, machines, products } = loadDataset();
  return { plants, lines, machines, products };
}

export function listLocalProduction(filters: Filters): ProductionRow[] {
  return loadDataset()
    .production.filter((row) => inDateRange(row.prod_date, filters))
    .filter((row) => filters.shift === ALL || row.shift === filters.shift)
    .filter((row) => filters.plantId === ALL || row.plant_id === filters.plantId)
    .filter((row) => filters.lineId === ALL || row.line_id === filters.lineId)
    .filter((row) => filters.productId === ALL || row.product_id === filters.productId)
    .sort(descendingDate)
    .slice(0, 5000);
}

export function listLocalDowntime(filters: Filters): DowntimeRow[] {
  return loadDataset()
    .downtime.filter((row) => inDateRange(row.prod_date, filters))
    .filter((row) => filters.lineId === ALL || row.line_id === filters.lineId)
    .sort(descendingDate)
    .slice(0, 5000);
}

export function listLocalDefects(filters: Filters): DefectRow[] {
  return loadDataset()
    .defects.filter((row) => inDateRange(row.prod_date, filters))
    .filter((row) => filters.lineId === ALL || row.line_id === filters.lineId)
    .filter((row) => filters.productId === ALL || row.product_id === filters.productId)
    .sort(descendingDate)
    .slice(0, 5000);
}

export function addLocalProductionRecord(record: NewProductionRecord): ProductionRow {
  const storage = getStorage();
  const dataset = loadDataset(storage);
  const actual = Number(record.actual_qty);
  const defect = Number(record.defect_qty);
  const reject = Number(record.reject_qty);
  const next: ProductionRow = {
    ...record,
    id: newLocalId("prod"),
    machine_id: record.machine_id ?? null,
    plan_qty: Number(record.plan_qty),
    actual_qty: actual,
    good_qty: Math.max(actual - defect - reject, 0),
    defect_qty: defect,
    reject_qty: reject,
  };
  dataset.production = [next, ...dataset.production];
  saveDataset(dataset, storage);
  return next;
}

function loadDataset(storage = getStorage()): LocalDataset {
  const stored = storage ? readDataset(storage) : null;
  if (stored) return stored;

  const seeded = createSeedDataset(new Date());
  if (storage) saveDataset(seeded, storage);
  return seeded;
}

function readDataset(storage: LocalStorageLike): LocalDataset | null {
  const raw = storage.getItem(DATA_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<LocalDataset>;
    if (
      !Array.isArray(parsed.plants) ||
      !Array.isArray(parsed.lines) ||
      !Array.isArray(parsed.machines) ||
      !Array.isArray(parsed.products) ||
      !Array.isArray(parsed.production) ||
      !Array.isArray(parsed.downtime) ||
      !Array.isArray(parsed.defects)
    ) {
      return null;
    }

    return {
      plants: parsed.plants,
      lines: parsed.lines,
      machines: parsed.machines,
      products: parsed.products,
      production: parsed.production.map((row) => ({
        ...row,
        plan_qty: Number(row.plan_qty),
        actual_qty: Number(row.actual_qty),
        good_qty: Number(row.good_qty),
        defect_qty: Number(row.defect_qty),
        reject_qty: Number(row.reject_qty),
      })),
      downtime: parsed.downtime.map((row) => ({ ...row, duration_min: Number(row.duration_min) })),
      defects: parsed.defects.map((row) => ({ ...row, qty: Number(row.qty) })),
    };
  } catch {
    return null;
  }
}

function saveDataset(dataset: LocalDataset, storage: LocalStorageLike | null) {
  if (!storage) return;
  storage.setItem(DATA_STORAGE_KEY, JSON.stringify(dataset));
}

function getStorage(): LocalStorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function inDateRange(date: string, filters: Filters) {
  return date >= filters.from && date <= filters.to;
}

function descendingDate<T extends { prod_date: string }>(a: T, b: T) {
  return b.prod_date.localeCompare(a.prod_date);
}

function createSeedDataset(today: Date): LocalDataset {
  const plants: MasterData["plants"] = [
    { id: "plant-pl1", code: "PL1", name: "โรงงานบางปู" },
    { id: "plant-pl2", code: "PL2", name: "โรงงานระยอง" },
  ];
  const lines: MasterData["lines"] = [
    { id: "line-a", plant_id: "plant-pl1", code: "LINE-A", name: "ไลน์ผลิต A" },
    { id: "line-b", plant_id: "plant-pl1", code: "LINE-B", name: "ไลน์ผลิต B" },
    { id: "line-c", plant_id: "plant-pl2", code: "LINE-C", name: "ไลน์ผลิต C" },
    { id: "line-d", plant_id: "plant-pl2", code: "LINE-D", name: "ไลน์ผลิต D" },
  ];
  const machines: MasterData["machines"] = [
    { id: "machine-a01", line_id: "line-a", code: "MC-A01", name: "เครื่องฉีด A01" },
    { id: "machine-a02", line_id: "line-a", code: "MC-A02", name: "เครื่องฉีด A02" },
    { id: "machine-b01", line_id: "line-b", code: "MC-B01", name: "เครื่องประกอบ B01" },
    { id: "machine-c01", line_id: "line-c", code: "MC-C01", name: "เครื่องบรรจุ C01" },
    { id: "machine-d01", line_id: "line-d", code: "MC-D01", name: "เครื่องบรรจุ D01" },
  ];
  const products: MasterData["products"] = [
    { id: "product-1001", code: "P-1001", name: "ฝาขวดพลาสติก 28mm", unit: "pcs" },
    { id: "product-1002", code: "P-1002", name: "ขวด PET 500ml", unit: "pcs" },
    { id: "product-1003", code: "P-1003", name: "กล่องบรรจุภัณฑ์ A", unit: "pcs" },
    { id: "product-1004", code: "P-1004", name: "ชิ้นส่วนพลาสติก B", unit: "pcs" },
  ];

  const production = createProductionRows(today, lines, machines, products);
  const downtime = createDowntimeRows(today, lines, machines);
  const defects = createDefectRows(production);

  return { plants, lines, machines, products, production, downtime, defects };
}

function createProductionRows(
  today: Date,
  lines: MasterData["lines"],
  machines: MasterData["machines"],
  products: MasterData["products"],
): ProductionRow[] {
  const rows: ProductionRow[] = [];

  for (let offset = -59; offset <= 0; offset += 1) {
    const date = toISO(addDays(today, offset));
    for (const shift of ["A", "B"]) {
      for (const line of lines) {
        const machine = machines.find((item) => item.line_id === line.id) ?? null;
        const product = pickByHash(products, `${date}-${shift}-${line.code}`);
        const actual = 8200 + (hashText(`${date}-${shift}-${line.code}`) % 2400);
        const defect = Math.round(
          actual * (0.01 + (hashText(`d-${date}-${shift}-${line.code}`) % 30) / 1000),
        );
        const reject = Math.round(
          actual * (0.003 + (hashText(`r-${date}-${shift}-${line.code}`) % 12) / 1000),
        );

        rows.push({
          id: `prod-${date}-${shift}-${line.code}`,
          prod_date: date,
          shift,
          plant_id: line.plant_id,
          line_id: line.id,
          machine_id: machine?.id ?? null,
          product_id: product.id,
          plan_qty: 10000,
          actual_qty: actual,
          good_qty: actual - defect - reject,
          defect_qty: defect,
          reject_qty: reject,
        });
      }
    }
  }

  return rows;
}

function createDowntimeRows(
  today: Date,
  lines: MasterData["lines"],
  machines: MasterData["machines"],
): DowntimeRow[] {
  const rows: DowntimeRow[] = [];
  const causes = [
    { category: "เครื่องจักรขัดข้อง", cause: "มอเตอร์สายพานขัดข้อง" },
    { category: "รอวัตถุดิบ", cause: "วัตถุดิบส่งล่าช้า" },
    { category: "เปลี่ยนรุ่นผลิต", cause: "Setup/Changeover" },
    { category: "ปัญหาคุณภาพ", cause: "ปรับตั้งค่าเครื่องใหม่" },
    { category: "ไฟฟ้าขัดข้อง", cause: "ไฟตกในสายการผลิต" },
  ];

  for (let offset = -59; offset <= 0; offset += 1) {
    const date = toISO(addDays(today, offset));
    for (const line of lines) {
      if (hashText(`has-${date}-${line.code}`) % 3 === 0) continue;

      const duration = 15 + (hashText(`dt-${date}-${line.code}`) % 90);
      const machine = machines.find((item) => item.line_id === line.id) ?? null;
      const issue = pickByHash(causes, `cat-${date}-${line.code}`);
      const start = new Date(`${date}T09:00:00`);

      rows.push({
        id: `down-${date}-${line.code}`,
        prod_date: date,
        line_id: line.id,
        machine_id: machine?.id ?? null,
        start_time: start.toISOString(),
        end_time: addMinutes(start, duration).toISOString(),
        duration_min: duration,
        category: issue.category,
        cause: issue.cause,
        note: null,
      });
    }
  }

  return rows;
}

function createDefectRows(production: ProductionRow[]): DefectRow[] {
  const defectTypes = [
    { defect_type: "รอยขีดข่วน", ratio: 0.35 },
    { defect_type: "สีไม่ได้มาตรฐาน", ratio: 0.25 },
    { defect_type: "ขนาดไม่ได้สเปค", ratio: 0.2 },
    { defect_type: "แตกร้าว", ratio: 0.12 },
    { defect_type: "ปนเปื้อน", ratio: 0.08 },
  ];

  return production.flatMap((record) =>
    defectTypes.map(({ defect_type, ratio }) => ({
      id: `defect-${record.id}-${defect_type}`,
      prod_date: record.prod_date,
      line_id: record.line_id,
      product_id: record.product_id,
      defect_type,
      qty: Math.max(Math.round(record.defect_qty * ratio), 1),
    })),
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function pickByHash<T>(items: readonly T[], key: string): T {
  const item = items[hashText(key) % items.length];
  if (!item) throw new Error("Seed data is empty");
  return item;
}

function hashText(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function newLocalId(prefix: string) {
  const random =
    typeof crypto === "undefined" ? Math.random().toString(36).slice(2) : crypto.randomUUID();
  return `${prefix}-${random}`;
}
