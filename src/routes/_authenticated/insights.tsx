import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { getAiInsights } from "@/lib/insights.functions";
import { Sparkles, Loader2, Lightbulb, Target, Heart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({ meta: [{ title: "Insights — CarbonLens" }] }),
  component: Insights,
});

function Insights() {
  const fetchInsights = useServerFn(getAiInsights);
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: () => fetchInsights(),
    staleTime: 1000 * 60 * 30,
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">Personalized for your last 30 days.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-full border bg-card p-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Analyzing your footprint…</p>
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Couldn't load insights right now.</p>
          <Button className="mt-3 rounded-full" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : data ? (
        <div className="mt-5 space-y-4">
          {/* Headline */}
          <div className="rounded-3xl bg-gradient-to-br from-primary to-emerald-600 p-6 text-primary-foreground shadow-lg">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3 w-3" /> AI insight
            </div>
            <h2 className="text-xl font-bold leading-tight">{data.headline}</h2>
            <p className="mt-2 text-sm opacity-95">{data.reason}</p>
          </div>

          {/* Quick Wins */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
              <Lightbulb className="h-4 w-4 text-primary" /> Quick Wins
            </h3>
            <div className="space-y-2">
              {data.quickWins.map((q, i) => (
                <div key={i} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{q.title}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{q.how}</p>
                    </div>
                    <div className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground tabular-nums">
                      -{q.savings_kg} kg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Weekly recommendations */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
              <Target className="h-4 w-4 text-primary" /> This week, try
            </h3>
            <ul className="space-y-2 rounded-2xl border bg-card p-4">
              {data.weekly.map((w, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Encouragement */}
          <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/40 p-4">
            <div className="flex items-start gap-2">
              <Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm font-medium text-accent-foreground">{data.encouragement}</p>
            </div>
          </div>

          <Link to="/log">
            <Button className="mt-2 w-full rounded-full py-6">Log a new activity</Button>
          </Link>
        </div>
      ) : null}
    </AppShell>
  );
}
