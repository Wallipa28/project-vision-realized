import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    queryFn: async (): Promise<MasterData> => {
      const [plants, lines, machines, products] = await Promise.all([
        supabase.from("plants").select("id,code,name").order("code"),
        supabase.from("production_lines").select("id,code,name,plant_id").order("code"),
        supabase.from("machines").select("id,code,name,line_id").order("code"),
        supabase.from("products").select("id,code,name,unit").order("code"),
      ]);
      return {
        plants: plants.data ?? [],
        lines: lines.data ?? [],
        machines: machines.data ?? [],
        products: products.data ?? [],
      };
    },
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
    queryFn: async (): Promise<ProductionRow[]> => {
      let q = supabase
        .from("production_records")
        .select(
          "id,prod_date,shift,plant_id,line_id,machine_id,product_id,plan_qty,actual_qty,good_qty,defect_qty,reject_qty",
        )
        .gte("prod_date", f.from)
        .lte("prod_date", f.to)
        .order("prod_date", { ascending: false })
        .limit(5000);
      if (f.shift !== ALL) q = q.eq("shift", f.shift);
      if (f.plantId !== ALL) q = q.eq("plant_id", f.plantId);
      if (f.lineId !== ALL) q = q.eq("line_id", f.lineId);
      if (f.productId !== ALL) q = q.eq("product_id", f.productId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProductionRow[];
    },
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
    queryFn: async (): Promise<DowntimeRow[]> => {
      let q = supabase
        .from("downtime_records")
        .select("id,prod_date,line_id,machine_id,start_time,end_time,duration_min,category,cause,note")
        .gte("prod_date", f.from)
        .lte("prod_date", f.to)
        .order("prod_date", { ascending: false })
        .limit(5000);
      if (f.lineId !== ALL) q = q.eq("line_id", f.lineId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DowntimeRow[];
    },
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
    queryFn: async (): Promise<DefectRow[]> => {
      let q = supabase
        .from("defect_records")
        .select("id,prod_date,line_id,product_id,defect_type,qty")
        .gte("prod_date", f.from)
        .lte("prod_date", f.to)
        .order("prod_date", { ascending: false })
        .limit(5000);
      if (f.lineId !== ALL) q = q.eq("line_id", f.lineId);
      if (f.productId !== ALL) q = q.eq("product_id", f.productId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DefectRow[];
    },
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
