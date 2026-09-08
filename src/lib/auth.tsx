import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "supervisor" | "quality" | "viewer";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "ผู้ดูแลระบบ",
  manager: "ผู้จัดการฝ่ายผลิต",
  supervisor: "หัวหน้างาน",
  quality: "ฝ่ายคุณภาพ",
  viewer: "ผู้ชม",
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function useCurrentUser() {
  const { session, loading } = useSession();
  const userId = session?.user.id;

  const profile = useQuery({
    queryKey: ["me", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      return {
        profile: prof,
        roles: (roles ?? []).map((r) => r.role as AppRole),
      };
    },
  });

  const roles = profile.data?.roles ?? [];
  return {
    session,
    loading: loading || profile.isLoading,
    email: session?.user.email ?? "",
    name: profile.data?.profile?.full_name ?? session?.user.email?.split("@")[0] ?? "",
    roles,
    hasRole: (r: AppRole) => roles.includes(r),
    canEdit: roles.some((r) => r === "admin" || r === "manager" || r === "supervisor"),
    canEditQuality: roles.some(
      (r) => r === "admin" || r === "manager" || r === "supervisor" || r === "quality",
    ),
    isAdmin: roles.includes("admin"),
  };
}
