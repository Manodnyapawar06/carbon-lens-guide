import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Leaf } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — CarbonLens" }] }),
  component: Onboarding,
});

type Answers = {
  location: string;
  diet: string;
  transport: string;
  energy: string;
  flight_frequency: string;
};

const STEPS = [
  {
    key: "location" as const,
    title: "Where do you live?",
    subtitle: "We'll compare your footprint to your region's average.",
    type: "text" as const,
    placeholder: "e.g. Bangalore, India",
  },
  {
    key: "diet" as const,
    title: "What's your diet?",
    subtitle: "Food is one of the biggest emission categories.",
    type: "choice" as const,
    options: [
      { v: "vegan", label: "🌱 Vegan" },
      { v: "vegetarian", label: "🥬 Vegetarian" },
      { v: "pescatarian", label: "🐟 Pescatarian" },
      { v: "omnivore", label: "🍗 Omnivore" },
      { v: "heavy_meat", label: "🥩 Heavy meat eater" },
    ],
  },
  {
    key: "transport" as const,
    title: "How do you mostly get around?",
    type: "choice" as const,
    options: [
      { v: "walk_bike", label: "🚶 Walk / cycle" },
      { v: "public", label: "🚌 Public transport" },
      { v: "car", label: "🚗 Personal car" },
      { v: "motorbike", label: "🏍️ Motorbike" },
      { v: "mixed", label: "🔀 Mix of everything" },
    ],
  },
  {
    key: "energy" as const,
    title: "Home energy source",
    type: "choice" as const,
    options: [
      { v: "grid", label: "⚡ Standard grid" },
      { v: "renewable", label: "🌞 Renewable / solar" },
      { v: "mixed", label: "🔀 Mixed" },
      { v: "unknown", label: "🤷 Not sure" },
    ],
  },
  {
    key: "flight_frequency" as const,
    title: "How often do you fly?",
    type: "choice" as const,
    options: [
      { v: "never", label: "🚫 Never" },
      { v: "rare", label: "✈️ 1–2 trips/year" },
      { v: "regular", label: "🛫 3–6 trips/year" },
      { v: "frequent", label: "🌍 Monthly or more" },
    ],
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    location: "", diet: "", transport: "", energy: "", flight_frequency: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("onboarded").eq("id", data.user.id).maybeSingle();
      if (p?.onboarded) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const current = STEPS[step];
  const value = answers[current.key];
  const canNext = !!value;

  async function finish() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").update({
      ...answers,
      onboarded: true,
      monthly_goal_kg: 150,
    }).eq("id", u.user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("You're all set! Let's log your first action.");
    navigate({ to: "/dashboard" });
  }

  function next() {
    if (step === STEPS.length - 1) finish();
    else setStep(step + 1);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-md flex-col px-6 py-8">
        <div className="mb-6 flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          CarbonLens
        </div>

        <div className="mb-6 flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <h1 className="text-2xl font-bold tracking-tight">{current.title}</h1>
        {current.subtitle && <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>}

        <div className="mt-6 space-y-3">
          {current.type === "text" ? (
            <>
              <Label htmlFor="ans" className="sr-only">{current.title}</Label>
              <Input
                id="ans"
                placeholder={current.placeholder}
                value={value}
                onChange={(e) => setAnswers({ ...answers, [current.key]: e.target.value })}
                className="rounded-xl py-6 text-base"
                autoFocus
              />
            </>
          ) : (
            current.options.map((opt) => {
              const active = value === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setAnswers({ ...answers, [current.key]: opt.v })}
                  className={`flex w-full items-center justify-between rounded-2xl border-2 px-4 py-4 text-left text-base font-medium transition ${
                    active ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"
                  }`}
                >
                  <span>{opt.label}</span>
                  {active && <span className="text-primary">✓</span>}
                </button>
              );
            })
          )}
        </div>

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="rounded-full" onClick={() => setStep(step - 1)}>Back</Button>
          )}
          <Button onClick={next} disabled={!canNext || busy} className="flex-1 rounded-full py-6 text-base">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === STEPS.length - 1 ? "Finish" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
