import { ALL, defaultFilters, type Filters, type MasterData } from "@/lib/data";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw } from "lucide-react";

export function FilterBar({
  filters,
  onChange,
  master,
  showShift = true,
  showProduct = true,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  master?: MasterData;
  showShift?: boolean;
  showProduct?: boolean;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const lines = (master?.lines ?? []).filter(
    (l) => filters.plantId === ALL || l.plant_id === filters.plantId,
  );

  return (
    <div className="panel flex flex-wrap items-end gap-4 p-6">
      <Field label="ตั้งแต่วันที่">
        <Input
          type="date"
          value={filters.from}
          onChange={(e) => set({ from: e.target.value })}
          className="w-40"
        />
      </Field>
      <Field label="ถึงวันที่">
        <Input
          type="date"
          value={filters.to}
          onChange={(e) => set({ to: e.target.value })}
          className="w-40"
        />
      </Field>

      {showShift && (
        <Field label="กะการผลิต">
          <Select value={filters.shift} onValueChange={(v) => set({ shift: v })}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ทุกกะ</SelectItem>
              <SelectItem value="A">กะ A</SelectItem>
              <SelectItem value="B">กะ B</SelectItem>
              <SelectItem value="C">กะ C</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field label="โรงงาน">
        <Select value={filters.plantId} onValueChange={(v) => set({ plantId: v, lineId: ALL })}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>ทุกโรงงาน</SelectItem>
            {(master?.plants ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="ไลน์ผลิต">
        <Select value={filters.lineId} onValueChange={(v) => set({ lineId: v })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>ทุกไลน์</SelectItem>
            {lines.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {showProduct && (
        <Field label="สินค้า">
          <Select value={filters.productId} onValueChange={(v) => set({ productId: v })}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ทุกสินค้า</SelectItem>
              {(master?.products ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Button variant="ghost" size="sm" onClick={() => onChange(defaultFilters())}>
        <RotateCcw className="size-4" /> ล้างตัวกรอง
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-primary">{label}</Label>
      {children}
    </div>
  );
}
