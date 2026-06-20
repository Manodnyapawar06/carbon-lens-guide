// Client-safe helpers for scoring, forecast, achievements, streaks.
import { CATEGORY_META, type Category } from "./emissions";

export type Activity = {
  id: string;
  category: string;
  description: string;
  co2_kg: number;
  logged_at: string;
  quantity: number;
  unit: string | null;
};

export type ProfileLike = {
  diet?: string | null;
  transport?: string | null;
  energy?: string | null;
  flight_frequency?: string | null;
  monthly_goal_kg?: number | null;
};

const DIET_SCORE: Record<string, number> = { vegan: 100, vegetarian: 85, pescatarian: 70, omnivore: 50, heavy_meat: 20 };
const TRANSPORT_SCORE: Record<string, number> = { walk_bike: 100, public: 85, mixed: 60, motorbike: 45, car: 25 };
const ENERGY_SCORE: Record<string, number> = { renewable: 100, mixed: 60, grid: 35, unknown: 50 };
const FLIGHT_SCORE: Record<string, number> = { never: 100, rare: 75, regular: 40, frequent: 10 };

export function sustainabilityScore(profile: ProfileLike, monthCO2: number) {
  const diet = DIET_SCORE[profile.diet ?? ""] ?? 50;
  const transport = TRANSPORT_SCORE[profile.transport ?? ""] ?? 50;
  const energy = ENERGY_SCORE[profile.energy ?? ""] ?? 50;
  const flight = FLIGHT_SCORE[profile.flight_frequency ?? ""] ?? 50;
  // Footprint factor: <100kg/mo = 100, >500kg = 0
  const footprint = Math.max(0, Math.min(100, 100 - ((monthCO2 - 100) / 4)));
  const score = Math.round(diet * 0.2 + transport * 0.25 + energy * 0.2 + flight * 0.15 + footprint * 0.2);
  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: { diet, transport, energy, flight, footprint: Math.round(footprint) },
  };
}

export function scoreBand(score: number) {
  if (score >= 80) return { label: "Champion", color: "var(--primary)", emoji: "🌟" };
  if (score >= 60) return { label: "Eco-friendly", color: "var(--cat-food)", emoji: "🌱" };
  if (score >= 40) return { label: "On your way", color: "var(--cat-energy)", emoji: "🚶" };
  return { label: "Starting out", color: "var(--cat-shopping)", emoji: "🌍" };
}

export function categoryTotals(activities: Activity[]) {
  const out: Record<Category, number> = { transport: 0, food: 0, energy: 0, travel: 0, shopping: 0 };
  for (const a of activities) {
    if (a.category in out) out[a.category as Category] += Number(a.co2_kg);
  }
  return out;
}

export function topCategory(activities: Activity[]) {
  const totals = categoryTotals(activities);
  const sorted = (Object.keys(totals) as Category[]).sort((a, b) => totals[b] - totals[a]);
  const cat = sorted[0];
  const total = (Object.values(totals) as number[]).reduce((s, v) => s + v, 0);
  return {
    category: cat,
    value: totals[cat],
    pct: total > 0 ? (totals[cat] / total) * 100 : 0,
    meta: CATEGORY_META[cat],
  };
}

// Smart monthly forecast based on recent daily averages, with smoothing
// and goal/savings comparisons. Requires ≥3 distinct active days in the
// last 30 days for a reliable projection.
export type Forecast = {
  current: number;          // kg logged so far this calendar month
  projected: number;        // kg projected by month end (0 if insufficient)
  improvedProjection: number; // projected after applying potential savings
  potentialSavings: number; // kg savings sum from AI quick wins
  goal: number;             // monthly goal in kg
  goalDiff: number;         // goal - projected (positive = under goal)
  dailyAvg: number;         // smoothed kg/day
  daysInMonth: number;
  dayOfMonth: number;
  activeDays: number;       // distinct days with activity in lookback window
  lookbackDays: number;
  insufficientData: boolean;
};

export function forecast(
  activities: Activity[],
  goalKg: number | null | undefined,
  potentialSavingsKg = 0,
): Forecast {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const goal = goalKg && goalKg > 0 ? goalKg : 0;

  const monthStartKey = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const current =
    Math.round(
      activities
        .filter((a) => a.logged_at >= monthStartKey)
        .reduce((s, a) => s + Number(a.co2_kg), 0) * 10,
    ) / 10;

  // Lookback window: last 30 days, but at least 7
  const lookbackDays = 30;
  const lookbackStart = new Date(now);
  lookbackStart.setDate(lookbackStart.getDate() - (lookbackDays - 1));
  const lookbackKey = toKey(lookbackStart);
  const recent = activities.filter((a) => a.logged_at >= lookbackKey);

  // Aggregate per-day totals
  const perDay = new Map<string, number>();
  for (const a of recent) {
    perDay.set(a.logged_at, (perDay.get(a.logged_at) ?? 0) + Number(a.co2_kg));
  }
  const activeDays = perDay.size;

  if (activeDays < 3) {
    return {
      current, projected: 0, improvedProjection: 0, potentialSavings: 0,
      goal, goalDiff: 0, dailyAvg: 0,
      daysInMonth, dayOfMonth, activeDays, lookbackDays,
      insufficientData: true,
    };
  }

  // Smooth spikes: cap each day at 2.5× median (min cap 25 kg/day)
  const values = [...perDay.values()].sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)] || 0;
  const cap = Math.max(median * 2.5, 25);
  const smoothedSum = values.reduce((s, v) => s + Math.min(v, cap), 0);

  // Daily avg over the actual elapsed window (capped to lookbackDays)
  const sorted = [...activities].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  const firstKey = sorted[0]?.logged_at ?? toKey(now);
  const firstDate = new Date(firstKey);
  const elapsedDays = Math.min(
    lookbackDays,
    Math.max(1, Math.ceil((now.getTime() - firstDate.getTime()) / 86400000) + 1),
  );
  const dailyAvg = smoothedSum / elapsedDays;

  const projected = Math.round(dailyAvg * daysInMonth);
  const potentialSavings = Math.max(0, Math.min(Math.round(potentialSavingsKg), projected));
  const improvedProjection = Math.max(0, projected - potentialSavings);
  const goalDiff = goal > 0 ? goal - projected : 0;

  return {
    current, projected, improvedProjection, potentialSavings,
    goal, goalDiff, dailyAvg: Math.round(dailyAvg * 10) / 10,
    daysInMonth, dayOfMonth, activeDays, lookbackDays,
    insufficientData: false,
  };
}

// Day streaks
export function streaks(activities: Activity[]) {
...
export type Achievement = {
  key: string;
  label: string;
  description: string;
  criteria: string;
  icon: string;
  unlocked: boolean;
  earnedAt: string | null; // ISO date (YYYY-MM-DD) or null
};

export function achievements(activities: Activity[], score: number): Achievement[] {
  const sorted = [...activities].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  const count = sorted.length;
  const s = streaks(activities);
  const latest = sorted[sorted.length - 1]?.logged_at ?? null;

  // First date N distinct days were active
  const dayFor = (n: number): string | null => {
    const seen = new Set<string>();
    for (const a of sorted) {
      seen.add(a.logged_at);
      if (seen.size >= n) return a.logged_at;
    }
    return null;
  };

  // First date a 7-day consecutive streak completed
  const streak7Date = (): string | null => {
    const days = [...new Set(sorted.map((a) => a.logged_at))].sort();
    let run = 0;
    let prev: Date | null = null;
    for (const k of days) {
      const cur = new Date(k);
      if (prev && cur.getTime() - prev.getTime() === 86400000) run++;
      else run = 1;
      if (run >= 7) return k;
      prev = cur;
    }
    return null;
  };

  return [
    { key: "first_log", label: "First Log", description: "Logged your first activity",
      criteria: "Log 1 activity", icon: "🎯",
      unlocked: count >= 1, earnedAt: sorted[0]?.logged_at ?? null },
    { key: "eco_beginner", label: "Eco Beginner", description: "Logged 5 activities",
      criteria: "Log 5 activities", icon: "🌱",
      unlocked: count >= 5, earnedAt: count >= 5 ? sorted[4].logged_at : null },
    { key: "streak_7", label: "7-Day Streak", description: "Logged 7 days in a row",
      criteria: "Log every day for 7 consecutive days", icon: "🔥",
      unlocked: s.longest >= 7, earnedAt: streak7Date() },
    { key: "green_week", label: "Green Week", description: "Active 7 different days",
      criteria: "Be active on 7 distinct days", icon: "🍀",
      unlocked: s.totalDays >= 7, earnedAt: dayFor(7) },
    { key: "carbon_saver", label: "Carbon Saver", description: "Sustainability score ≥ 60",
      criteria: "Reach a Sustainability Score of 60+", icon: "💚",
      unlocked: score >= 60, earnedAt: score >= 60 ? latest : null },
    { key: "champion", label: "Sustainability Champion", description: "Sustainability score ≥ 80",
      criteria: "Reach a Sustainability Score of 80+", icon: "🏆",
      unlocked: score >= 80, earnedAt: score >= 80 ? latest : null },
  ];
}
