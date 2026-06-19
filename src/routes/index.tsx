import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, BarChart3, Sparkles, Trophy, TrendingDown, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CarbonLens — See your carbon, shrink your footprint" },
      { name: "description", content: "Log everyday actions, get AI insights, and watch your monthly CO₂ drop. Streaks, badges, and quick wins included." },
      { property: "og:title", content: "CarbonLens" },
      { property: "og:description", content: "Personal carbon footprint tracker with AI insights and gamified progress." },
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
        <div className="flex items-center gap-2">
          <Link to="/about"><Button variant="ghost" className="rounded-full">About</Button></Link>
          <Link to="/auth"><Button variant="ghost" className="rounded-full">Sign in</Button></Link>
        </div>
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
            Log everyday actions in seconds. CarbonLens turns them into a clear monthly CO₂ number,
            personalized AI insights, and quick wins you can act on today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="rounded-full px-7">Get started — free</Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="outline" className="rounded-full px-7">Learn more</Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            { icon: <BarChart3 className="h-5 w-5" />, title: "Track everything", body: "Cars, meals, AC, flights, shopping — all in one place with science-backed factors." },
            { icon: <Sparkles className="h-5 w-5" />, title: "AI insights", body: "Personalized weekly recommendations based on your highest-emission category." },
            { icon: <Target className="h-5 w-5" />, title: "Set goals", body: "Pick a monthly target and watch a forecast project where you'll land." },
            { icon: <TrendingDown className="h-5 w-5" />, title: "See trends", body: "Pie, line, and bar charts make your progress impossible to miss." },
            { icon: <Trophy className="h-5 w-5" />, title: "Earn badges", body: "Streaks, milestones, and a 0–100 sustainability score gamify the journey." },
            { icon: <Leaf className="h-5 w-5" />, title: "Build habits", body: "Quick wins, encouragement, and daily streaks turn intent into action." },
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

        <div className="mt-20 rounded-3xl bg-gradient-to-br from-primary to-emerald-600 p-10 text-center text-primary-foreground shadow-lg">
          <h2 className="text-3xl font-bold">Small swaps. Big impact.</h2>
          <p className="mt-3 mx-auto max-w-xl opacity-95">
            The average person emits ~4 tonnes of CO₂ a year. CarbonLens helps you find the easiest cuts and stick with them.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="mt-6 rounded-full px-7">Start tracking</Button>
          </Link>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground">
          <div>© CarbonLens — built for a cooler planet 🌍</div>
          <div className="flex gap-4">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
