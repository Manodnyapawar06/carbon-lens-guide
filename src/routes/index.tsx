import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CarbonLens — See your carbon, shrink your footprint" },
      { name: "description", content: "Log everyday actions and watch your monthly CO₂ drop. Personalized insights, streaks, and quick wins." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          CarbonLens
        </div>
        <Link to="/auth"><Button variant="ghost" className="rounded-full">Sign in</Button></Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10 sm:pt-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Your daily climate companion
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            See your carbon.<br />
            <span className="text-primary">Shrink your footprint.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Log everyday actions in seconds. CarbonLens turns them into a clear monthly CO₂ number — and shows you the easiest ways to bring it down.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="rounded-full px-7">Get started — free</Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            { icon: <BarChart3 className="h-5 w-5" />, title: "Track everything", body: "Cars, meals, AC, flights, shopping — all in one place with science-backed factors." },
            { icon: <Sparkles className="h-5 w-5" />, title: "Personalized tips", body: "Weekly AI insights based on your highest-emission category." },
            { icon: <Leaf className="h-5 w-5" />, title: "Build streaks", body: "Log daily, hit goals, earn badges. Make sustainability a habit." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-accent-foreground">
                {f.icon}
              </div>
              <div className="font-semibold">{f.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
