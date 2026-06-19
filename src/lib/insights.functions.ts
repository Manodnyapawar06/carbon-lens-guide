import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InsightsResult = {
  headline: string;
  reason: string;
  weekly: string[];
  quickWins: { title: string; savings_kg: number; how: string }[];
  encouragement: string;
};

export const getAiInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InsightsResult> => {
    const { supabase, userId } = context;

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [{ data: acts }, { data: profile }] = await Promise.all([
      supabase
        .from("activities")
        .select("category,description,co2_kg,logged_at")
        .eq("user_id", userId)
        .gte("logged_at", since.toISOString().slice(0, 10)),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);

    const activities = acts ?? [];
    const totals: Record<string, number> = {};
    for (const a of activities) {
      totals[a.category] = (totals[a.category] ?? 0) + Number(a.co2_kg);
    }
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    const topCat = top?.[0] ?? "transport";
    const topPct = top && total > 0 ? Math.round((top[1] / total) * 100) : 0;

    const fallback: InsightsResult = {
      headline: total === 0
        ? "Start logging to unlock personalized insights"
        : `${capitalize(topCat)} is your top emission source (${topPct}%)`,
      reason: total === 0
        ? "Once you log a few activities we can recommend the biggest wins for you."
        : `Over the last 30 days, ${topCat} drove ${topPct}% of your ${Math.round(total)} kg CO₂.`,
      weekly: defaultWeekly(topCat),
      quickWins: defaultQuickWins(topCat),
      encouragement: total < 100 ? "You're well below the average — keep it up! 🌟" : "Small swaps compound. You've got this. 💚",
    };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey || activities.length === 0) return fallback;

    try {
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const { generateText, Output } = await import("ai");
      const { z } = await import("zod");
      const gateway = createLovableAiGatewayProvider(apiKey);

      const prompt = `User profile: diet=${profile?.diet ?? "unknown"}, transport=${profile?.transport ?? "unknown"}, energy=${profile?.energy ?? "unknown"}, flights=${profile?.flight_frequency ?? "unknown"}, location=${profile?.location ?? "unknown"}.
Last 30 days totals (kg CO2): ${JSON.stringify(totals)}. Total: ${total.toFixed(1)} kg.
Top recent activities: ${activities.slice(0, 15).map((a) => `${a.description} (${Number(a.co2_kg).toFixed(1)}kg ${a.category})`).join("; ")}.

Generate personalized sustainability insights. Be specific, positive, and reference their actual data.`;

      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({
          schema: z.object({
            headline: z.string(),
            reason: z.string(),
            weekly: z.array(z.string()).max(4),
            quickWins: z.array(z.object({
              title: z.string(),
              savings_kg: z.number(),
              how: z.string(),
            })).max(3),
            encouragement: z.string(),
          }),
        }),
        prompt,
        system: "You are CarbonLens, a friendly sustainability coach. Reply concisely. Use kg CO2 numbers grounded in the user's data.",
      });

      return output as InsightsResult;
    } catch (e) {
      console.error("AI insights error:", e);
      return fallback;
    }
  });

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function defaultWeekly(cat: string): string[] {
  const map: Record<string, string[]> = {
    transport: ["Walk or cycle for trips under 2 km", "Combine errands into one car trip", "Try public transport twice this week"],
    food: ["Swap two meat meals for plant-based", "Plan meals to cut food waste", "Choose local seasonal produce"],
    energy: ["Set AC 1–2°C warmer", "Unplug electronics overnight", "Air-dry laundry once this week"],
    travel: ["Pick a train over a short flight", "Stay an extra night to reduce flight frequency", "Offset your next flight"],
    shopping: ["Pause 24 hours before buying", "Choose one second-hand item", "Skip same-day delivery"],
  };
  return map[cat] ?? map.transport;
}

function defaultQuickWins(cat: string) {
  const map: Record<string, { title: string; savings_kg: number; how: string }[]> = {
    transport: [
      { title: "Replace 2 car trips with bus", savings_kg: 8, how: "10 km × 2 trips saves ~0.16 kg/km" },
      { title: "Work from home 1 day", savings_kg: 4, how: "Skip a 20 km commute" },
      { title: "Carpool to one event", savings_kg: 3, how: "Splits emissions in half" },
    ],
    food: [
      { title: "Two veggie dinners", savings_kg: 13, how: "~6.5 kg saved per beef meal swapped" },
      { title: "Skip dairy at breakfast", savings_kg: 4, how: "Plant milk for a week" },
      { title: "Finish leftovers", savings_kg: 3, how: "Cuts wasted food emissions" },
    ],
    energy: [
      { title: "AC up by 2°C", savings_kg: 10, how: "~5% energy saved per degree" },
      { title: "LED swap, 3 bulbs", savings_kg: 5, how: "75% less energy than incandescent" },
      { title: "Cold-water laundry", savings_kg: 3, how: "Heating water is the biggest cost" },
    ],
    travel: [
      { title: "Train instead of a short flight", savings_kg: 150, how: "Saves ~80% vs short-haul flight" },
      { title: "Pack lighter", savings_kg: 5, how: "Less weight = less fuel" },
      { title: "Eco-certified hotel", savings_kg: 8, how: "Lower per-night footprint" },
    ],
    shopping: [
      { title: "Buy one item second-hand", savings_kg: 8, how: "Avoids manufacturing emissions" },
      { title: "Bundle online orders", savings_kg: 2, how: "Fewer delivery trips" },
      { title: "Skip fast fashion week", savings_kg: 10, how: "One less new clothing item" },
    ],
  };
  return map[cat] ?? map.transport;
}
