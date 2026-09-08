import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BarChart3, Factory, ShieldCheck, TimerOff, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ระบบสรุปข้อมูลการผลิต | Production Intelligence" },
      {
        name: "description",
        content:
          "รวมข้อมูลการผลิตจากทุกไลน์ไว้ที่เดียว ดู KPI ผลผลิต Plan vs Actual Downtime และของเสียได้ทันที พร้อมส่งออกรายงาน Excel",
      },
      { property: "og:title", content: "ระบบสรุปข้อมูลการผลิต" },
      {
        property: "og:description",
        content: "แดชบอร์ด KPI การผลิต Plan vs Actual Downtime และคุณภาพ พร้อมส่งออกรายงาน",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: BarChart3, title: "แดชบอร์ด KPI", desc: "ผลผลิต, Plan Achievement, Yield, Defect Rate ในหน้าเดียว" },
  { icon: Factory, title: "Plan vs Actual", desc: "เทียบแผนกับผลผลิตจริงรายวัน รายกะ รายไลน์ รายสินค้า" },
  { icon: TimerOff, title: "Downtime", desc: "สรุปเวลาหยุดเครื่อง แยกตามเครื่องจักรและสาเหตุ" },
  { icon: ShieldCheck, title: "คุณภาพ", desc: "ติดตามของเสีย Reject และ Top Defect ที่เกิดบ่อย" },
  { icon: Upload, title: "นำเข้า Excel/CSV", desc: "อัปโหลดข้อมูลการผลิตจากไฟล์ได้โดยตรง" },
  { icon: Activity, title: "สิทธิ์ตามบทบาท", desc: "ผู้บริหาร หัวหน้างาน ฝ่ายคุณภาพ เห็นและแก้ไขได้ตามสิทธิ์" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Factory className="size-5" />
          </div>
          <span className="font-semibold">ระบบสรุปข้อมูลการผลิต</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">เข้าสู่ระบบ</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
          Production Intelligence
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-bold text-balance md:text-5xl">
          เห็นภาพการผลิตทั้งโรงงาน ภายในหน้าจอเดียว
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          รวบรวมข้อมูลผลผลิต แผนการผลิต เวลาหยุดเครื่อง และของเสียจากทุกไลน์ สรุปเป็น KPI
          ที่ผู้บริหารและหัวหน้างานใช้ตัดสินใจได้ทันที ลดเวลาทำรายงานด้วยมือ
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">เริ่มใช้งาน</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/dashboard">ดูแดชบอร์ด</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel p-5">
              <f.icon className="size-5 text-accent" />
              <h2 className="mt-3 font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        ระบบสรุปข้อมูลการผลิต · เวอร์ชัน MVP
      </footer>
    </div>
  );
}
