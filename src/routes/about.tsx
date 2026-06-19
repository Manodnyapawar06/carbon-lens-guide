import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, Globe, Heart, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — CarbonLens" },
      { name: "description", content: "What a carbon footprint is, how CarbonLens helps you shrink yours, and why it matters." },
      { property: "og:title", content: "About CarbonLens" },
      { property: "og:description", content: "Personal climate action, made measurable." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          CarbonLens
        </Link>
        <Link to="/auth"><Button variant="ghost" className="rounded-full">Sign in</Button></Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-6">
        <h1 className="text-4xl font-bold tracking-tight">About CarbonLens</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Personal climate action, made measurable.
        </p>

        <section className="mt-10 space-y-8">
          <Block icon={<Globe className="h-5 w-5" />} title="What is a carbon footprint?">
            Your carbon footprint is the total greenhouse-gas emissions caused by your everyday
            choices — the food you eat, how you commute, how you heat or cool your home,
            and what you buy. It's measured in kilograms of CO₂-equivalent (kg CO₂e).
          </Block>

          <Block icon={<Leaf className="h-5 w-5" />} title="How CarbonLens helps">
            CarbonLens turns abstract climate impact into a simple number you can track.
            Log everyday activities in seconds, see your monthly footprint, get
            AI-personalized recommendations based on your habits, and build streaks
            and badges as you make sustainable choices stick.
          </Block>

          <Block icon={<TrendingDown className="h-5 w-5" />} title="Why reducing emissions matters">
            The average person emits ~4 tonnes of CO₂ each year. To stay within a safe
            climate budget we need to halve that by 2030. Individual action alone won't
            fix the climate crisis — but personal habits drive collective demand for
            cleaner systems, and every kilogram saved compounds.
          </Block>

          <Block icon={<Heart className="h-5 w-5" />} title="Built with care">
            CarbonLens uses science-backed emission factors and a privacy-first design.
            Your data stays yours. We focus on positive reinforcement instead of guilt —
            because lasting change comes from small wins, not shame.
          </Block>
        </section>

        <div className="mt-12 rounded-3xl bg-gradient-to-br from-primary to-emerald-600 p-8 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold">Ready to see your footprint?</h2>
          <p className="mt-2 opacity-95">Start tracking in under 30 seconds.</p>
          <Link to="/auth"><Button size="lg" variant="secondary" className="mt-5 rounded-full px-7">Get started — free</Button></Link>
        </div>
      </main>
    </div>
  );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-accent-foreground">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
