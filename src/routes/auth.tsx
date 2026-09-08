import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Factory, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getLocalSession, signInLocal, signUpLocal } from "@/lib/local-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ | ระบบสรุปข้อมูลการผลิต" },
      { name: "description", content: "เข้าสู่ระบบเพื่อดูแดชบอร์ดและรายงานการผลิตของโรงงาน" },
      { property: "og:title", content: "เข้าสู่ระบบ | ระบบสรุปข้อมูลการผลิต" },
      { property: "og:description", content: "เข้าสู่ระบบเพื่อดูแดชบอร์ดและรายงานการผลิต" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (getLocalSession()) navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInLocal(email);
    setLoading(false);
    if (error) {
      toast.error("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { session, error } = await signUpLocal(email, fullName);
    setLoading(false);
    if (error) {
      toast.error("สมัครใช้งานไม่สำเร็จ: " + error.message);
      return;
    }
    if (session) {
      toast.success("สมัครสำเร็จ ข้อมูลบัญชีถูกเก็บใน Local Storage แล้ว");
      navigate({ to: "/dashboard", replace: true });
      return;
    }
  }

  async function demoSignIn() {
    setLoading(true);
    const { error } = await signInLocal("demo@local.test");
    setLoading(false);
    if (error) {
      toast.error("เข้าสู่ระบบ Local ไม่สำเร็จ");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Factory className="size-5" />
          </div>
          <span className="font-semibold">ระบบสรุปข้อมูลการผลิต</span>
        </div>
        <div>
          <h2 className="text-3xl leading-snug font-bold text-balance">
            ข้อมูลการผลิตทุกไลน์ สรุปพร้อมใช้ทุกเช้า
          </h2>
          <p className="mt-3 max-w-md text-sm opacity-75">
            ติดตามผลผลิต เป้าหมาย Yield ของเสีย และเวลาหยุดเครื่อง แบบรวมศูนย์
          </p>
        </div>
        <p className="text-xs opacity-60">ข้อมูลและบัญชีเก็บเฉพาะในเบราว์เซอร์นี้</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold">ยินดีต้อนรับ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            โหมด Local Storage สำหรับใช้งานก่อนเชื่อมต่อฐานข้อมูลจริง
          </p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">เข้าสู่ระบบ</TabsTrigger>
              <TabsTrigger value="signup">สมัครใช้งาน</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />} เข้าสู่ระบบ
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2">อีเมล</Label>
                  <Input
                    id="email2"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />} สมัครใช้งาน
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> หรือ{" "}
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={demoSignIn} disabled={loading}>
            เข้าใช้งานโหมด Local ทันที
          </Button>
        </div>
      </div>
    </div>
  );
}
