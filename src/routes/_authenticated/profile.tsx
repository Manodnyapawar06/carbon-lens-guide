import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Flame, Trophy } from "lucide-react";
import { achievements, streaks, sustainabilityScore, scoreBand, type Activity } from "@/lib/scoring";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — CarbonLens" }] }),
  component: Profile,
});

const FIELDS: { key: keyof Form; label: string; options?: { v: string; label: string }[] }[] = [
  { key: "display_name", label: "Display name" },
  { key: "location", label: "Location" },
  { key: "diet", label: "Diet", options: [
    { v: "vegan", label: "Vegan" },
    { v: "vegetarian", label: "Vegetarian" },
    { v: "pescatarian", label: "Pescatarian" },
    { v: "omnivore", label: "Omnivore" },
    { v: "heavy_meat", label: "Heavy meat eater" },
  ] },
  { key: "transport", label: "Main transport", options: [
    { v: "walk_bike", label: "Walk / cycle" },
    { v: "public", label: "Public transport" },
    { v: "car", label: "Personal car" },
    { v: "motorbike", label: "Motorbike" },
    { v: "mixed", label: "Mixed" },
  ] },
  { key: "energy", label: "Home energy", options: [
    { v: "grid", label: "Standard grid" },
    { v: "renewable", label: "Renewable / solar" },
    { v: "mixed", label: "Mixed" },
    { v: "unknown", label: "Not sure" },
  ] },
  { key: "flight_frequency", label: "Flight frequency", options: [
    { v: "never", label: "Never" },
    { v: "rare", label: "1–2 / year" },
    { v: "regular", label: "3–6 / year" },
    { v: "frequent", label: "Monthly+" },
  ] },
];

type Form = {
  display_name: string; location: string; diet: string;
  transport: string; energy: string; flight_frequency: string;
  monthly_goal_kg: number;
};

function Profile() {
  const [form, setForm] = useState<Form>({
    display_name: "", location: "", diet: "", transport: "",
    energy: "", flight_frequency: "", monthly_goal_kg: 150,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (data) {
        setForm({
          display_name: data.display_name ?? "",
          location: data.location ?? "",
          diet: data.diet ?? "",
          transport: data.transport ?? "",
          energy: data.energy ?? "",
          flight_frequency: data.flight_frequency ?? "",
          monthly_goal_kg: Number(data.monthly_goal_kg ?? 150),
        });
      }
      setLoading(false);
    })();
  }, []);

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id,category,description,co2_kg,logged_at,quantity,unit")
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Activity[];
    },
  });

  const monthCO2 = useMemo(() => {
    const since = new Date(); since.setDate(since.getDate() - 30);
    const key = since.toISOString().slice(0, 10);
    return activities.filter((a) => a.logged_at >= key).reduce((s, a) => s + Number(a.co2_kg), 0);
  }, [activities]);

  const { score } = useMemo(() => sustainabilityScore(form, monthCO2), [form, monthCO2]);
  const band = scoreBand(score);
  const st = useMemo(() => streaks(activities), [activities]);
  const ach = useMemo(() => achievements(activities, score), [activities, score]);
  const unlocked = ach.filter((a) => a.unlocked).length;

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").update(form).eq("id", u.user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  }

  if (loading) {
    return <AppShell><div className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div></AppShell>;
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">{email}</p>

      {/* Score & streaks summary */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-card p-3 text-center">
          <div className="text-2xl">{band.emoji}</div>
          <div className="mt-1 text-xl font-bold tabular-nums" style={{ color: band.color }}>{score}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Score</div>
        </div>
        <div className="rounded-2xl border bg-card p-3 text-center">
          <Flame className="mx-auto h-6 w-6 text-orange-500" />
          <div className="mt-1 text-xl font-bold tabular-nums">{st.current}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Day streak</div>
        </div>
        <div className="rounded-2xl border bg-card p-3 text-center">
          <Trophy className="mx-auto h-6 w-6 text-amber-500" />
          <div className="mt-1 text-xl font-bold tabular-nums">{unlocked}/{ach.length}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Badges</div>
        </div>
      </div>

      {/* Achievements */}
      <section className="mt-6">
        <h2 className="mb-2 text-base font-semibold">Achievements</h2>
        <div className="grid grid-cols-3 gap-3">
          {ach.map((a) => (
            <div
              key={a.key}
              className={`rounded-2xl border p-3 text-center transition ${
                a.unlocked ? "bg-card" : "bg-muted/40 opacity-50"
              }`}
              title={a.description}
            >
              <div className={`text-2xl ${a.unlocked ? "" : "grayscale"}`}>{a.icon}</div>
              <div className="mt-1 text-[11px] font-semibold leading-tight">{a.label}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{a.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Editable profile */}
      <h2 className="mt-8 mb-2 text-base font-semibold">Your details</h2>
      <div className="space-y-5 rounded-2xl border bg-card p-5">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <Label>{f.label}</Label>
            {f.options ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {f.options.map((o) => {
                  const active = form[f.key] === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setForm({ ...form, [f.key]: o.v })}
                      className={`rounded-full border-2 px-3 py-1.5 text-sm transition ${
                        active ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <Input
                className="mt-1 rounded-xl"
                value={form[f.key] as string}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            )}
          </div>
        ))}

        <div>
          <Label>Monthly CO₂ goal (kg)</Label>
          <Input
            className="mt-1 rounded-xl"
            type="number"
            min={0}
            value={form.monthly_goal_kg}
            onChange={(e) => setForm({ ...form, monthly_goal_kg: parseFloat(e.target.value) || 0 })}
          />
          <p className="mt-1 text-xs text-muted-foreground">Used to track your monthly goal progress on the dashboard.</p>
        </div>

        <Button onClick={save} disabled={saving} className="w-full rounded-full py-6">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </AppShell>
  );
}
