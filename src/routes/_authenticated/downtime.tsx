import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { FilterBar } from "@/components/FilterBar";
import { ExportMenu } from "@/components/ExportMenu";
import { KpiCard } from "@/components/KpiCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { defaultFilters, fmt, groupBy, useDowntime, useMasterData } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/downtime")({
  head: () => ({
    meta: [
      { title: "รายงาน Downtime | ระบบสรุปข้อมูลการผลิต" },
      { name: "description", content: "สรุปเวลาหยุดเครื่องแยกตามเครื่องจักร ไลน์ผลิต และสาเหตุ" },
      { property: "og:title", content: "รายงาน Downtime" },
      { property: "og:description", content: "เวลาหยุดเครื่องแยกตามเครื่องจักรและสาเหตุ" },
    ],
  }),
  component: DowntimePage,
});

function DowntimePage() {
  const [filters, setFilters] = useState(defaultFilters());
  const master = useMasterData();
  const down = useDowntime(filters);
  const rows = down.data ?? [];

  const name = (list: { id: string; name: string }[] | undefined, id: string | null) =>
    list?.find((x) => x.id === id)?.name ?? "-";

  const total = rows.reduce((s, r) => s + r.duration_min, 0);
  const mttr = rows.length ? total / rows.length : 0;

  const byCause = useMemo(() => {
    const g = groupBy(rows, (r) => r.category);
    return [...g.entries()]
      .map(([category, list]) => ({
        category,
        minutes: list.reduce((s, r) => s + r.duration_min, 0),
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [rows]);

  const byMachine = useMemo(() => {
    const g = groupBy(rows, (r) => r.machine_id ?? "-");
    return [...g.entries()]
      .map(([id, list]) => ({
        machine: name(master.data?.machines, id),
        minutes: list.reduce((s, r) => s + r.duration_min, 0),
        count: list.length,
      }))
      .sort((a, b) => b.minutes - a.minutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, master.data]);

  const exportData = rows.map((r) => ({
    วันที่: r.prod_date,
    ไลน์ผลิต: name(master.data?.lines, r.line_id),
    เครื่องจักร: name(master.data?.machines, r.machine_id),
    เวลาเริ่ม: new Date(r.start_time).toLocaleString("th-TH"),
    เวลาสิ้นสุด: new Date(r.end_time).toLocaleString("th-TH"),
    "ระยะเวลา (นาที)": r.duration_min,
    ประเภทปัญหา: r.category,
    สาเหตุ: r.cause ?? "",
  }));

  return (
    <AppShell
      title="รายงาน Downtime"
      description="เวลาหยุดเครื่องแยกตามเครื่องจักร ไลน์ผลิต และสาเหตุ"
      actions={<ExportMenu rows={exportData} fileName="รายงาน Downtime" />}
    >
      <FilterBar filters={filters} onChange={setFilters} master={master.data} showShift={false} showProduct={false} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Downtime รวม" value={fmt(Math.round(total / 60))} unit="ชม." hint={`${fmt(total)} นาที`} />
        <KpiCard label="จำนวนเหตุการณ์" value={fmt(rows.length)} unit="ครั้ง" />
        <KpiCard label="MTTR เฉลี่ย" value={fmt(mttr, 1)} unit="นาที/ครั้ง" tone={mttr > 60 ? "bad" : "neutral"} />
        <KpiCard
          label="สาเหตุอันดับ 1"
          value={byCause[0]?.category ?? "-"}
          hint={byCause[0] ? `${fmt(byCause[0].minutes)} นาที` : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="panel p-4">
          <h2 className="mb-4 font-semibold">Downtime ตามประเภทปัญหา</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byCause} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="category" fontSize={11} width={120} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="minutes" name="นาที" fill="var(--color-chart-4)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel p-4">
          <h2 className="mb-4 font-semibold">Downtime รายเครื่องจักร</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byMachine}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="machine" fontSize={11} />
              <YAxis fontSize={11} width={60} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="minutes" name="นาที" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">รายการ Downtime</h2>
          <span className="text-xs text-muted-foreground">{fmt(rows.length)} รายการ</span>
        </div>
        <div className="max-h-[28rem] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead>ไลน์</TableHead>
                <TableHead>เครื่องจักร</TableHead>
                <TableHead>ประเภทปัญหา</TableHead>
                <TableHead>สาเหตุ</TableHead>
                <TableHead className="text-right">นาที</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    ไม่พบข้อมูล Downtime ในช่วงเวลาที่เลือก
                  </TableCell>
                </TableRow>
              )}
              {rows.slice(0, 500).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="num">{r.prod_date}</TableCell>
                  <TableCell>{name(master.data?.lines, r.line_id)}</TableCell>
                  <TableCell>{name(master.data?.machines, r.machine_id)}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell className="text-muted-foreground">{r.cause}</TableCell>
                  <TableCell className="num text-right font-medium">{fmt(r.duration_min)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
