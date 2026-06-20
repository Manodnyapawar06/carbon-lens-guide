import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { CATEGORY_META, AVG_INDIAN_MONTHLY, AVG_GLOBAL_MONTHLY, type Category } from "@/lib/emissions";
import { sustainabilityScore, scoreBand, topCategory, forecast, streaks, type Activity } from "@/lib/scoring";
import { getAiInsights } from "@/lib/insights.functions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlusCircle, TrendingDown, TrendingUp, Flame, Sparkles, Target, Trophy, Info, CheckCircle2, AlertCircle } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CarbonLens" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile && !profile.onboarded) navigate({ to: "/onboarding" });
  }, [profile, navigate]);

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

  const totalMonth = useMemo(() => activities.reduce((s, a) => s + Number(a.co2_kg), 0), [activities]);

  const byCategory = useMemo(() => {
    const out: Record<Category, number> = { transport: 0, food: 0, energy: 0, travel: 0, shopping: 0 };
    for (const a of activities) {
      if (a.category in out) out[a.category as Category] += Number(a.co2_kg);
    }
    return out;
  }, [activities]);

  const pieData = (Object.keys(byCategory) as Category[])
    .map((c) => ({ name: CATEGORY_META[c].label, value: Math.round(byCategory[c] * 10) / 10, color: CATEGORY_META[c].color, key: c }))
    .filter((d) => d.value > 0);

  const weekly = useMemo(() => {
    const days: { day: string; co2: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const total = activities.filter((a) => a.logged_at === key).reduce((s, a) => s + Number(a.co2_kg), 0);
      days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), co2: Math.round(total * 10) / 10 });
    }
    return days;
  }, [activities]);

  const vsIndia = ((AVG_INDIAN_MONTHLY - totalMonth) / AVG_INDIAN_MONTHLY) * 100;
  const vsGlobal = ((AVG_GLOBAL_MONTHLY - totalMonth) / AVG_GLOBAL_MONTHLY) * 100;
  const recent = activities.slice(0, 5);

  const { score } = useMemo(() => sustainabilityScore(profile ?? {}, totalMonth), [profile, totalMonth]);
  const band = scoreBand(score);
  const top = topCategory(activities);
  const st = streaks(activities);
  const goal = Number(profile?.monthly_goal_kg ?? 0);

  // Pull AI quick-win savings (cached) to feed the "improved projection"
  const fetchInsights = useServerFn(getAiInsights);
  const { data: ai } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: () => fetchInsights(),
    staleTime: 1000 * 60 * 30,
    enabled: activities.length >= 3,
  });
  const potentialSavings = useMemo(
    () => (ai?.quickWins ?? []).reduce((s, q) => s + (Number(q.savings_kg) || 0), 0),
    [ai],
  );

  const fc = useMemo(
    () => forecast(activities, profile?.monthly_goal_kg, potentialSavings),
    [activities, profile?.monthly_goal_kg, potentialSavings],
  );
  const goalProgress = goal > 0 ? Math.min(100, (fc.current / goal) * 100) : 0;
  const goalOnTrack = goal > 0 && !fc.insufficientData ? fc.projected <= goal : false;

  // Visualization: cap bar widths relative to the max of goal/projection
  const maxBar = Math.max(fc.goal, fc.projected, fc.improvedProjection, 1);
  const barPct = (v: number) => Math.max(2, Math.round((v / maxBar) * 100));


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

      {/* Score + streak */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link to="/insights" className="rounded-2xl border bg-card p-4 hover:border-primary/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sustainability Score</span>
            <span className="text-base">{band.emoji}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums" style={{ color: band.color }}>{score}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          <div className="mt-2 text-xs font-medium" style={{ color: band.color }}>{band.label}</div>
          <Progress value={score} className="mt-2 h-1.5" />
        </Link>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Logging streak</span>
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums">{st.current}</span>
            <span className="text-xs text-muted-foreground">day{st.current === 1 ? "" : "s"}</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Longest: {st.longest} days</div>
          <div className="mt-2 text-xs text-muted-foreground">Active days: {st.totalDays}</div>
        </div>
      </div>

      <Link to="/log" className="mt-4 flex items-center justify-center gap-2 rounded-full bg-card border-2 border-dashed border-primary/40 px-4 py-4 text-sm font-medium text-primary hover:bg-primary-soft transition">
        <PlusCircle className="h-5 w-5" /> Log a new activity
      </Link>

      {/* Goal progress */}
      {goal > 0 && (
        <section className="mt-6 rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Target className="h-4 w-4 text-primary" /> Monthly goal</h2>
            <span className={`text-xs font-bold ${goalOnTrack ? "text-primary" : "text-destructive"}`}>
              {goalOnTrack ? "On track" : "Off track"}
            </span>
          </div>
          <div className="mt-2 text-sm tabular-nums">
            <span className="font-bold">{totalMonth.toFixed(0)}</span>
            <span className="text-muted-foreground"> / {goal} kg used</span>
          </div>
          <Progress value={goalProgress} className="mt-2 h-2" />
          {totalMonth >= goal ? (
            <p className="mt-2 text-xs text-destructive">You've passed your goal — see Insights for quick wins.</p>
          ) : goalProgress > 80 ? (
            <p className="mt-2 text-xs text-muted-foreground">You're close to your limit — pace yourself.</p>
          ) : (
            <p className="mt-2 text-xs text-primary">🎉 Great pace — keep it up!</p>
          )}
        </section>
      )}

      {/* Forecast */}
      <section className="mt-6 rounded-2xl border bg-card p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Impact forecast</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Stat label="Current" value={fc.current} hint="kg this month" />
          <Stat label="Projected" value={fc.projected} hint="kg by month end" />
          <Stat label="Reduction" value={fc.reduction} hint="kg if you hit goal" highlight />
        </div>
      </section>

      {/* Top category + opportunity */}
      {top.value > 0 && (
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Top emission category
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl">{top.meta.icon}</span>
              <div>
                <div className="text-base font-semibold">{top.meta.label}</div>
                <div className="text-xs text-muted-foreground tabular-nums">{top.value.toFixed(1)} kg · {top.pct.toFixed(0)}%</div>
              </div>
            </div>
          </div>
          <Link to="/insights" className="rounded-2xl border bg-card p-4 hover:border-primary/40 transition">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" /> Biggest opportunity
            </div>
            <div className="mt-2 text-sm font-semibold">Cut {top.meta.label.toLowerCase()} this week</div>
            <div className="mt-1 text-xs text-muted-foreground">Tap for AI quick wins →</div>
          </Link>
        </section>
      )}

      {/* Category breakdown + pie */}
      {pieData.length > 0 && (
        <section className="mt-6 rounded-2xl border bg-card p-4">
          <h2 className="mb-2 text-base font-semibold">Breakdown by category</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {pieData.map((d) => <Cell key={d.key} fill={d.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v} kg CO₂`, "Emissions"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {pieData.map((d) => (
              <div key={d.key} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="ml-auto font-semibold tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

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

function Stat({ label, value, hint, highlight }: { label: string; value: number; hint: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-primary-soft" : "bg-muted/50"}`}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
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
