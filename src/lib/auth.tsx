import { useEffect, useState } from "react";
import {
  getLocalSession,
  subscribeLocalAuth,
  type AppRole,
  type LocalSession,
} from "@/lib/local-auth";

export type { AppRole } from "@/lib/local-auth";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "ผู้ดูแลระบบ",
  manager: "ผู้จัดการฝ่ายผลิต",
  supervisor: "หัวหน้างาน",
  quality: "ฝ่ายคุณภาพ",
  viewer: "ผู้ชม",
};

export function useSession() {
  const [session, setSession] = useState<LocalSession | null>(() => getLocalSession());

  useEffect(() => {
    setSession(getLocalSession());
    return subscribeLocalAuth(() => setSession(getLocalSession()));
  }, []);

  return { session, loading: false };
}

export function useCurrentUser() {
  const { session, loading } = useSession();
  const user = session?.user;

  const roles = user?.roles ?? [];
  return {
    session,
    loading,
    email: user?.email ?? "",
    name: user?.full_name ?? user?.email.split("@")[0] ?? "",
    roles,
    hasRole: (r: AppRole) => roles.includes(r),
    canEdit: roles.some((r) => r === "admin" || r === "manager" || r === "supervisor"),
    canEditQuality: roles.some(
      (r) => r === "admin" || r === "manager" || r === "supervisor" || r === "quality",
    ),
    isAdmin: roles.includes("admin"),
  };
}
