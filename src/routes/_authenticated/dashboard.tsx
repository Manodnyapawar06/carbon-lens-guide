import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { CATEGORY_META, AVG_INDIAN_MONTHLY, AVG_GLOBAL_MONTHLY, type Category } from "@/lib/emissions";
import { Button } from "@/components/ui/button";
import { PlusCircle, TrendingDown, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CarbonLens" }] }),
  component: Dashboard,
});

type Activity = {
  id: string; category: string; description: string;
  co2_kg: number; logged_at: string; quantity: number; unit: string | null;
};

function Dashboard() {
  const navigate = useNavigate();

  // Onboarding gate
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("onboarded").eq("id", u.user.id).maybeSingle();
      if (!p?.onboarded) navigate({ to: "/onboarding" });
    })();
  }, [navigate]);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities", "month"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from("activities")
        .select("id,category,description,co2_kg,logged_at,quantity,unit")
        .gte("logged_at", since.toISOString().slice(0, 10))
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Activity[];
    },
  });

  const totalMonth = useMemo(
    () => activities.reduce((s, a) => s + Number(a.co2_kg), 0),
    [activities],
  );

  const byCategory = useMemo(() => {
    const out: Record<Category, number> = { transport: 0, food: 0, energy: 0, travel: 0, shopping: 0 };
    for (const a of activities) {
      if (a.category in out) out[a.category as Category] += Number(a.co2_kg);
    }
    return out;
  }, [activities]);

  // Last 7 days bar chart
  const weekly = useMemo(() => {
    const days: { day: string; co2: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const total = activities
        .filter((a) => a.logged_at === key)
        .reduce((s, a) => s + Number(a.co2_kg), 0);
      days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), co2: Math.round(total * 10) / 10 });
    }
    return days;
  }, [activities]);

  const vsIndia = ((AVG_INDIAN_MONTHLY - totalMonth) / AVG_INDIAN_MONTHLY) * 100;
  const vsGlobal = ((AVG_GLOBAL_MONTHLY - totalMonth) / AVG_GLOBAL_MONTHLY) * 100;
  const recent = activities.slice(0, 5);

  return (
    <AppShell>
      <h1 className="text-sm font-medium text-muted-foreground">Your last 30 days</h1>

      {/* Hero summary */}
      <div className="mt-2 rounded-3xl bg-gradient-to-br from-primary to-emerald-600 p-6 text-primary-foreground shadow-lg">
        <div className="text-sm/none opacity-90">Total CO₂</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-5xl font-bold tabular-nums">{totalMonth.toFixed(1)}</span>
          <span className="text-lg opacity-90">kg</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge value={vsIndia} label="vs India avg" />
          <Badge value={vsGlobal} label="vs global avg" />
        </div>
      </div>

      <Link to="/log" className="mt-4 flex items-center justify-center gap-2 rounded-full bg-card border-2 border-dashed border-primary/40 px-4 py-4 text-sm font-medium text-primary hover:bg-primary-soft transition">
        <PlusCircle className="h-5 w-5" /> Log a new activity
      </Link>

      {/* Category breakdown */}
      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold">Breakdown by category</h2>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
            const meta = CATEGORY_META[c];
            const val = byCategory[c];
            const pct = totalMonth > 0 ? (val / totalMonth) * 100 : 0;
            return (
              <div key={c} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg">{meta.icon}</span>
                  <span className="text-xs font-medium text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{meta.label}</div>
                <div className="text-xl font-bold tabular-nums">{val.toFixed(1)}<span className="ml-1 text-xs font-normal text-muted-foreground">kg</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: meta.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weekly trend */}
      <section className="mt-6 rounded-2xl border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold">Last 7 days</h2>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                cursor={{ fill: "var(--muted)" }}
                formatter={(v: number) => [`${v} kg CO₂`, "Emissions"]}
              />
              <Bar dataKey="co2" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent activity</h2>
          <Link to="/log" className="text-xs text-primary font-medium">Add new</Link>
        </div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No activity yet. Log your first action to see your footprint.</p>
            <Link to="/log"><Button className="mt-3 rounded-full">Log activity</Button></Link>
          </div>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {recent.map((a) => {
              const meta = CATEGORY_META[a.category as Category];
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-lg">{meta?.icon ?? "•"}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.description}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.logged_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{Number(a.co2_kg).toFixed(1)} kg</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function Badge({ value, label }: { value: number; label: string }) {
  const better = value > 0;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
      {better ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
      <span className="font-semibold tabular-nums">{Math.abs(value).toFixed(0)}%</span>
      <span className="opacity-90">{better ? "less" : "more"} {label}</span>
    </div>
  );
}
