import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Leaf, Home, PlusCircle, User, LogOut, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const tabs = [
    { to: "/dashboard", icon: Home, label: "Home" },
    { to: "/insights", icon: Sparkles, label: "Insights" },
    { to: "/log", icon: PlusCircle, label: "Log" },
    { to: "/trends", icon: TrendingUp, label: "Trends" },
    { to: "/profile", icon: User, label: "Profile" },
  ] as const;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-5 py-4 backdrop-blur">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          CarbonLens
        </Link>
        <button onClick={signOut} className="text-muted-foreground hover:text-foreground" aria-label="Sign out">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 px-5 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl border-t bg-background/95 backdrop-blur">
        <div className="grid grid-cols-5">
          {tabs.map((t) => {
            const active = pathname === t.to;
            const Icon = t.icon;
            const isLog = t.to === "/log";
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 transition ${active ? "scale-110" : ""} ${isLog && !active ? "text-primary" : ""}`} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
