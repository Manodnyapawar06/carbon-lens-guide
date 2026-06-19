import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { CATEGORY_META, type Category } from "@/lib/emissions";
import { categoryTotals, type Activity } from "@/lib/scoring";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/trends")({
  head: () => ({ meta: [{ title: "Trends — CarbonLens" }] }),
  component: Trends,
});

function Trends() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities", "trends"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data, error } = await supabase
        .from("activities")
        .select("id,category,description,co2_kg,logged_at,quantity,unit")
        .gte("logged_at", since.toISOString().slice(0, 10))
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Activity[];
    },
  });

  const weekly = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      buckets[weekKey(d)] = 0;
    }
    for (const a of activities) {
      const k = weekKey(new Date(a.logged_at));
      if (k in buckets) buckets[k] += Number(a.co2_kg);
    }
    return Object.entries(buckets).map(([k, v]) => ({ week: k, co2: Math.round(v * 10) / 10 }));
  }, [activities]);

  const monthly = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      buckets[monthKey(d)] = 0;
    }
    for (const a of activities) {
      const k = monthKey(new Date(a.logged_at));
      if (k in buckets) buckets[k] += Number(a.co2_kg);
    }
    return Object.entries(buckets).map(([k, v]) => ({ month: k, co2: Math.round(v) }));
  }, [activities]);

  const totals = useMemo(() => categoryTotals(activities), [activities]);
  const pieData = (Object.keys(totals) as Category[])
    .map((c) => ({ name: CATEGORY_META[c].label, value: Math.round(totals[c] * 10) / 10, color: CATEGORY_META[c].color, key: c }))
    .filter((d) => d.value > 0);

  const totalAll = (Object.values(totals) as number[]).reduce((s, v) => s + v, 0);

  // 30-day rolling daily line
  const daily = useMemo(() => {
    const days: { day: string; co2: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const total = activities.filter((a) => a.logged_at === k).reduce((s, a) => s + Number(a.co2_kg), 0);
      days.push({ day: d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }), co2: Math.round(total * 10) / 10 });
    }
    return days;
  }, [activities]);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Trends</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your emissions over time.</p>

      {isLoading ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : totalAll === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-5 space-y-5">
          <Card title="Category breakdown" subtitle={`${totalAll.toFixed(1)} kg total (90d)`}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {pieData.map((d) => <Cell key={d.key} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`${v} kg CO₂`, "Emissions"]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Last 8 weeks">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    cursor={{ fill: "var(--muted)" }}
                    formatter={(v: number) => [`${v} kg CO₂`, "Week"]}
                  />
                  <Bar dataKey="co2" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Last 3 months">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    cursor={{ fill: "var(--muted)" }}
                    formatter={(v: number) => [`${v} kg CO₂`, "Month"]}
                  />
                  <Bar dataKey="co2" fill="var(--cat-food)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Daily (last 30 days)">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} interval={3} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`${v} kg CO₂`, "Day"]}
                  />
                  <Line type="monotone" dataKey="co2" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-2xl border border-dashed bg-card p-8 text-center">
      <div className="text-3xl">📊</div>
      <p className="mt-3 text-sm text-muted-foreground">Log a few activities to see your trends here.</p>
    </div>
  );
}

function weekKey(d: Date) {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = (day.getDay() + 6) % 7; // Monday start
  day.setDate(day.getDate() - diff);
  return day.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function monthKey(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}
