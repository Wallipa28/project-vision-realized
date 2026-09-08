import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getLocalSession } from "@/lib/local-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    const session = getLocalSession();
    if (!session) throw redirect({ to: "/auth" });
    return { user: session.user };
  },
  component: () => <Outlet />,
});
