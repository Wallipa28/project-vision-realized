import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { FilterBar } from "@/components/FilterBar";
import { ExportMenu } from "@/components/ExportMenu";
import { KpiCard } from "@/components/KpiCard";
import {
  defaultFilters,
  fmt,
  groupBy,
  summarize,
  thaiDate,
  useDefects,
  useDowntime,
  useMasterData,
  useProduction,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "แดชบอร์ดภาพรวมการผลิต | ระบบสรุปข้อมูลการผลิต" },
      { name: "description", content: "สรุป KPI การผลิต ผลผลิตรวม Plan vs Actual Yield และ Downtime" },
      { property: "og:title", content: "แดชบอร์ดภาพรวมการผลิต" },
      { property: "og:description", content: "สรุป KPI การผลิตแบบรวมศูนย์" },
    ],
  }),
  component: DashboardPage,
});

const CHART = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function DashboardPage() {
  const [filters, setFilters] = useState(defaultFilters());
  const master = useMasterData();
  const prod = useProduction(filters);
  const down = useDowntime(filters);
  const defects = useDefects(filters);

  const rows = prod.data ?? [];
  const k = summarize(rows);
  const lineName = (id: string) => master.data?.lines.find((l) => l.id === id)?.name ?? "-";

  const trend = useMemo(() => {
    const g = groupBy(rows, (r) => r.prod_date);
    return [...g.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, list]) => {
        const s = summarize(list);
        return {
          date: thaiDate(date),
          plan: s.plan,
          actual: s.actual,
          yield: Number(s.yield.toFixed(1)),
        };
      });
  }, [rows]);

  const byLine = useMemo(() => {
    const g = groupBy(rows, (r) => r.line_id);
    return [...g.entries()].map(([id, list]) => {
      const s = summarize(list);
      return { name: lineName(id), plan: s.plan, actual: s.actual };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, master.data]);

  const topIssues = useMemo(() => {
    const g = groupBy(down.data ?? [], (r) => r.cause ?? r.category);
    return [...g.entries()]
      .map(([cause, list]) => ({
        cause,
        minutes: list.reduce((s, r) => s + r.duration_min, 0),
        count: list.length,
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);
  }, [down.data]);

  const defectMix = useMemo(() => {
    const g = groupBy(defects.data ?? [], (r) => r.defect_type);
    return [...g.entries()]
      .map(([type, list]) => ({ name: type, value: list.reduce((s, r) => s + Number(r.qty), 0) }))
      .sort((a, b) => b.value - a.value);
  }, [defects.data]);

  const totalDown = (down.data ?? []).reduce((s, r) => s + r.duration_min, 0);

  const exportRows = trend.map((t) => ({
    วันที่: t.date,
    แผนการผลิต: t.plan,
    ผลผลิตจริง: t.actual,
    "Yield (%)": t.yield,
  }));

  return (
    <AppShell
      title="แดชบอร์ดภาพรวมการผลิต"
      description="สรุป KPI หลักของทุกไลน์ตามช่วงเวลาที่เลือก"
      actions={<ExportMenu rows={exportRows} fileName="สรุปภาพรวมการผลิต" />}
    >
      <FilterBar filters={filters} onChange={setFilters} master={master.data} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="ผลผลิตรวม" value={fmt(k.actual)} unit="ชิ้น" hint={`แผน ${fmt(k.plan)} ชิ้น`} />
        <KpiCard
          label="Plan Achievement"
          value={fmt(k.achievement, 1)}
          unit="%"
          tone={k.achievement >= 95 ? "good" : k.achievement >= 85 ? "warn" : "bad"}
        />
        <KpiCard
          label="Yield"
          value={fmt(k.yield, 1)}
          unit="%"
          tone={k.yield >= 97 ? "good" : k.yield >= 94 ? "warn" : "bad"}
          hint={`ของดี ${fmt(k.good)} ชิ้น`}
        />
        <KpiCard
          label="Defect Rate"
          value={fmt(k.defectRate, 2)}
          unit="%"
          tone={k.defectRate <= 2 ? "good" : k.defectRate <= 3.5 ? "warn" : "bad"}
          hint={`ของเสีย ${fmt(k.defect)} ชิ้น`}
        />
        <KpiCard label="Reject" value={fmt(k.reject)} unit="ชิ้น" hint={`${fmt(k.rejectRate, 2)}% ของผลผลิต`} />
        <KpiCard
          label="Downtime รวม"
          value={fmt(Math.round(totalDown / 60))}
          unit="ชม."
          tone={totalDown / 60 > 100 ? "bad" : "neutral"}
          hint={`${fmt(down.data?.length ?? 0)} เหตุการณ์`}
        />
        <KpiCard label="จำนวนบันทึกการผลิต" value={fmt(rows.length)} unit="รายการ" />
        <KpiCard label="ไลน์ที่มีการผลิต" value={fmt(new Set(rows.map((r) => r.line_id)).size)} unit="ไลน์" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="panel p-4 xl:col-span-2">
          <h2 className="mb-4 font-semibold">แนวโน้มผลผลิตเทียบแผน</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" fontSize={11} tickLine={false} />
              <YAxis fontSize={11} tickLine={false} width={70} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="actual"
                name="ผลผลิตจริง"
                stroke="var(--color-chart-1)"
                fill="var(--color-chart-1)"
                fillOpacity={0.15}
              />
              <Line
                type="monotone"
                dataKey="plan"
                name="แผนการผลิต"
                stroke="var(--color-chart-2)"
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="panel p-4">
          <h2 className="mb-4 font-semibold">Top 5 ปัญหาที่ทำให้หยุดผลิต</h2>
          <ul className="space-y-3">
            {topIssues.map((i, idx) => (
              <li key={i.cause} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded bg-secondary text-xs font-semibold">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{i.cause}</p>
                  <p className="text-xs text-muted-foreground">{i.count} ครั้ง</p>
                </div>
                <span className="num text-sm font-semibold">{fmt(i.minutes)} นาที</span>
              </li>
            ))}
            {!topIssues.length && <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="panel p-4">
          <h2 className="mb-4 font-semibold">ผลผลิตรายไลน์ (เทียบแผน)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byLine}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" fontSize={11} tickLine={false} />
              <YAxis fontSize={11} tickLine={false} width={70} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                }}
              />
              <Legend />
              <Bar dataKey="plan" name="แผน" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="ผลจริง" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel p-4">
          <h2 className="mb-4 font-semibold">สัดส่วนของเสียตามประเภท</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={defectMix} dataKey="value" nameKey="name" outerRadius={100} label>
                {defectMix.map((_, i) => (
                  <Cell key={i} fill={CHART[i % CHART.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel p-4">
        <h2 className="mb-4 font-semibold">แนวโน้ม Yield รายวัน</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" fontSize={11} tickLine={false} />
            <YAxis domain={[80, 100]} fontSize={11} tickLine={false} width={50} unit="%" />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey="yield"
              name="Yield (%)"
              stroke="var(--color-chart-3)"
              fill="var(--color-chart-3)"
              fillOpacity={0.18}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AppShell>
  );
}
