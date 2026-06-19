import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_META, PRESETS, calcCO2, type Category, type Preset } from "@/lib/emissions";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({ meta: [{ title: "Log activity — CarbonLens" }] }),
  component: LogPage,
});

const CATS: Category[] = ["transport", "food", "energy", "travel", "shopping"];

function LogPage() {
  const qc = useQueryClient();
  const [cat, setCat] = useState<Category>("transport");
  const [selected, setSelected] = useState<Preset | null>(null);
  const [qty, setQty] = useState<number>(1);

  const filteredPresets = useMemo(() => PRESETS.filter((p) => p.category === cat), [cat]);

  const { data: recent = [] } = useQuery({
    queryKey: ["activities", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id,category,description,co2_kg,logged_at,quantity,unit")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const logMut = useMutation({
    mutationFn: async ({ preset, quantity }: { preset: Preset; quantity: number }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const co2 = calcCO2(preset, quantity);
      const { error } = await supabase.from("activities").insert({
        user_id: u.user.id,
        category: preset.category,
        activity_key: preset.key,
        description: `${preset.label}${quantity !== 1 ? ` (${quantity} ${preset.unit})` : ""}`,
        quantity,
        unit: preset.unit,
        co2_kg: co2,
      });
      if (error) throw error;
      return co2;
    },
    onSuccess: (co2) => {
      toast.success(`Logged +${co2.toFixed(1)} kg CO₂`);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to log"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });

  function pick(p: Preset) {
    setSelected(p);
    setQty(p.defaultQty);
  }

  const previewCO2 = selected ? calcCO2(selected, qty || 0) : 0;

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Log an activity</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pick what you did today and we'll calculate the CO₂.</p>

      {/* Category tabs */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {CATS.map((c) => {
          const active = cat === c;
          const meta = CATEGORY_META[c];
          return (
            <button
              key={c}
              onClick={() => { setCat(c); setSelected(null); }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span>{meta.icon}</span> {meta.label}
            </button>
          );
        })}
      </div>

      {/* Presets */}
      <div className="mt-4 grid gap-2">
        {filteredPresets.map((p) => {
          const active = selected?.key === p.key;
          return (
            <button
              key={p.key}
              onClick={() => pick(p)}
              className={`flex items-center justify-between rounded-2xl border-2 bg-card px-4 py-3 text-left transition ${
                active ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"
              }`}
            >
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-muted-foreground">
                  ~{p.factor} kg CO₂ / {p.unit}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quantity & submit */}
      {selected && (
        <div className="mt-5 rounded-2xl border bg-card p-4">
          <div className="mb-2 text-sm font-medium">{selected.label}</div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              step="any"
              value={qty}
              onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
              className="w-28 rounded-xl"
            />
            <span className="text-sm text-muted-foreground">{selected.unit}</span>
            <div className="ml-auto text-right">
              <div className="text-xs text-muted-foreground">CO₂</div>
              <div className="text-lg font-bold tabular-nums">{previewCO2.toFixed(2)} kg</div>
            </div>
          </div>
          <Button
            onClick={() => logMut.mutate({ preset: selected, quantity: qty })}
            disabled={logMut.isPending || qty <= 0}
            className="mt-4 w-full rounded-full py-6"
          >
            {logMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add to today
          </Button>
        </div>
      )}

      {/* Recent logs */}
      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold">Recent logs</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {recent.map((a) => {
              const meta = CATEGORY_META[a.category as Category];
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-lg">
                    {meta?.icon ?? "•"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.logged_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{Number(a.co2_kg).toFixed(1)} kg</div>
                  <button
                    onClick={() => deleteMut.mutate(a.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
