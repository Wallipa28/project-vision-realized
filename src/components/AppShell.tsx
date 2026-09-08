import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Factory,
  ShieldCheck,
  TimerOff,
  Upload,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useCurrentUser, ROLE_LABEL } from "@/lib/auth";
import { signOutLocal } from "@/lib/local-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "ภาพรวมผู้บริหาร", icon: LayoutDashboard },
  { to: "/production", label: "รายงานการผลิต", icon: Factory },
  { to: "/downtime", label: "Downtime", icon: TimerOff },
  { to: "/quality", label: "คุณภาพ / ของเสีย", icon: ShieldCheck },
  { to: "/import", label: "นำเข้าข้อมูล", icon: Upload },
  { to: "/users", label: "ผู้ใช้งานและสิทธิ์", icon: Users, adminOnly: true },
] as const;

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { name, email, roles, isAdmin } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOutLocal();
    navigate({ to: "/auth", replace: true });
  }

  const items = NAV.filter((n) => !("adminOnly" in n && n.adminOnly) || isAdmin);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:flex lg:translate-x-0",
          open ? "flex translate-x-0" : "hidden -translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
          <div className="grid size-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Factory className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">ระบบสรุปการผลิต</p>
            <p className="text-xs opacity-70">Production Intelligence</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4 text-sm">
          <p className="font-medium">{name}</p>
          <p className="truncate text-xs opacity-70">{email}</p>
          <p className="mt-1 text-xs opacity-70">
            สิทธิ์: {roles.map((r) => ROLE_LABEL[r]).join(", ") || "-"}
          </p>
          <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={signOut}>
            <LogOut className="size-4" /> ออกจากระบบ
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="เมนู"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
        <main className="min-w-0 flex-1 space-y-6 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
