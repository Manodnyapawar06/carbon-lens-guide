import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
    return <AppShell><div className="py-10 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">{email}</p>

      <div className="mt-6 space-y-5 rounded-2xl border bg-card p-5">
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
        </div>

        <Button onClick={save} disabled={saving} className="w-full rounded-full py-6">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </AppShell>
  );
}
