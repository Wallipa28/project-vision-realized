import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { FilterBar } from "@/components/FilterBar";
import { ExportMenu } from "@/components/ExportMenu";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { defaultFilters, fmt, summarize, toISO, useMasterData, useProduction } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/production")({
  head: () => ({
    meta: [
      { title: "รายงานการผลิต Plan vs Actual | ระบบสรุปข้อมูลการผลิต" },
      { name: "description", content: "รายงานผลผลิตรายวัน รายกะ รายไลน์ เทียบแผนการผลิตจริง" },
      { property: "og:title", content: "รายงานการผลิต Plan vs Actual" },
      { property: "og:description", content: "ผลผลิตรายวัน รายกะ รายไลน์ เทียบแผน" },
    ],
  }),
  component: ProductionPage,
});

function ProductionPage() {
  const [filters, setFilters] = useState(defaultFilters());
  const master = useMasterData();
  const prod = useProduction(filters);
  const { canEdit } = useCurrentUser();
  const rows = prod.data ?? [];
  const k = summarize(rows);

  const name = (list: { id: string; name: string }[] | undefined, id: string | null) =>
    list?.find((x) => x.id === id)?.name ?? "-";

  const tableRows = useMemo(
    () =>
      rows.map((r) => ({
        วันที่: r.prod_date,
        กะ: r.shift,
        ไลน์ผลิต: name(master.data?.lines, r.line_id),
        เครื่องจักร: name(master.data?.machines, r.machine_id),
        สินค้า: name(master.data?.products, r.product_id),
        แผน: Number(r.plan_qty),
        ผลจริง: Number(r.actual_qty),
        ของดี: Number(r.good_qty),
        ของเสีย: Number(r.defect_qty),
        Reject: Number(r.reject_qty),
        "บรรลุแผน (%)": Number(r.plan_qty)
          ? Number(((Number(r.actual_qty) / Number(r.plan_qty)) * 100).toFixed(1))
          : 0,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, master.data],
  );

  return (
    <AppShell
      title="รายงานการผลิต (Plan vs Actual)"
      description="ผลผลิตจริงเทียบแผน แยกตามวัน กะ ไลน์ และสินค้า"
      actions={
        <>
          {canEdit && <NewRecordDialog />}
          <ExportMenu rows={tableRows} fileName="รายงานการผลิต" />
        </>
      }
    >
      <FilterBar filters={filters} onChange={setFilters} master={master.data} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="แผนการผลิตรวม" value={fmt(k.plan)} unit="ชิ้น" />
        <KpiCard label="ผลผลิตจริงรวม" value={fmt(k.actual)} unit="ชิ้น" />
        <KpiCard
          label="บรรลุแผน"
          value={fmt(k.achievement, 1)}
          unit="%"
          tone={k.achievement >= 95 ? "good" : k.achievement >= 85 ? "warn" : "bad"}
        />
        <KpiCard label="ส่วนต่างจากแผน" value={fmt(k.actual - k.plan)} unit="ชิ้น" tone={k.actual >= k.plan ? "good" : "bad"} />
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">รายละเอียดการผลิต</h2>
          <span className="text-xs text-muted-foreground">{fmt(rows.length)} รายการ</span>
        </div>
        <div className="max-h-[32rem] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead>กะ</TableHead>
                <TableHead>ไลน์</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead className="text-right">แผน</TableHead>
                <TableHead className="text-right">ผลจริง</TableHead>
                <TableHead className="text-right">ของดี</TableHead>
                <TableHead className="text-right">ของเสีย</TableHead>
                <TableHead className="text-right">Reject</TableHead>
                <TableHead className="text-right">บรรลุแผน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prod.isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    กำลังโหลดข้อมูล...
                  </TableCell>
                </TableRow>
              )}
              {!prod.isLoading && !rows.length && (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    ไม่พบข้อมูลตามตัวกรองที่เลือก
                  </TableCell>
                </TableRow>
              )}
              {rows.slice(0, 500).map((r) => {
                const ach = Number(r.plan_qty) ? (Number(r.actual_qty) / Number(r.plan_qty)) * 100 : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="num">{r.prod_date}</TableCell>
                    <TableCell>{r.shift}</TableCell>
                    <TableCell>{name(master.data?.lines, r.line_id)}</TableCell>
                    <TableCell>{name(master.data?.products, r.product_id)}</TableCell>
                    <TableCell className="num text-right">{fmt(Number(r.plan_qty))}</TableCell>
                    <TableCell className="num text-right">{fmt(Number(r.actual_qty))}</TableCell>
                    <TableCell className="num text-right">{fmt(Number(r.good_qty))}</TableCell>
                    <TableCell className="num text-right">{fmt(Number(r.defect_qty))}</TableCell>
                    <TableCell className="num text-right">{fmt(Number(r.reject_qty))}</TableCell>
                    <TableCell
                      className={`num text-right font-medium ${ach >= 95 ? "text-success" : ach >= 85 ? "text-warning" : "text-destructive"}`}
                    >
                      {fmt(ach, 1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {rows.length > 500 && (
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">
            แสดง 500 รายการแรก · ส่งออกไฟล์เพื่อดูทั้งหมด
          </p>
        )}
      </div>
    </AppShell>
  );
}

function NewRecordDialog() {
  const master = useMasterData();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    prod_date: toISO(new Date()),
    shift: "A",
    line_id: "",
    product_id: "",
    plan_qty: "0",
    actual_qty: "0",
    defect_qty: "0",
    reject_qty: "0",
  });

  const save = useMutation({
    mutationFn: async () => {
      const line = master.data?.lines.find((l) => l.id === form.line_id);
      if (!line || !form.product_id) throw new Error("กรุณาเลือกไลน์ผลิตและสินค้า");
      const actual = Number(form.actual_qty);
      const defect = Number(form.defect_qty);
      const reject = Number(form.reject_qty);
      const { error } = await supabase.from("production_records").insert({
        prod_date: form.prod_date,
        shift: form.shift,
        plant_id: line.plant_id,
        line_id: line.id,
        product_id: form.product_id,
        plan_qty: Number(form.plan_qty),
        actual_qty: actual,
        good_qty: Math.max(actual - defect - reject, 0),
        defect_qty: defect,
        reject_qty: reject,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("บันทึกข้อมูลการผลิตแล้ว");
      queryClient.invalidateQueries({ queryKey: ["production"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> บันทึกข้อมูล
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกข้อมูลการผลิต</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>วันที่ผลิต</Label>
            <Input type="date" value={form.prod_date} onChange={(e) => set({ prod_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>กะ</Label>
            <Select value={form.shift} onValueChange={(v) => set({ shift: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">กะ A</SelectItem>
                <SelectItem value="B">กะ B</SelectItem>
                <SelectItem value="C">กะ C</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ไลน์ผลิต</Label>
            <Select value={form.line_id} onValueChange={(v) => set({ line_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกไลน์" />
              </SelectTrigger>
              <SelectContent>
                {(master.data?.lines ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>สินค้า</Label>
            <Select value={form.product_id} onValueChange={(v) => set({ product_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกสินค้า" />
              </SelectTrigger>
              <SelectContent>
                {(master.data?.products ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>แผนการผลิต</Label>
            <Input type="number" value={form.plan_qty} onChange={(e) => set({ plan_qty: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>ผลผลิตจริง</Label>
            <Input type="number" value={form.actual_qty} onChange={(e) => set({ actual_qty: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>ของเสีย</Label>
            <Input type="number" value={form.defect_qty} onChange={(e) => set({ defect_qty: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Reject</Label>
            <Input type="number" value={form.reject_qty} onChange={(e) => set({ reject_qty: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
