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

// Projects current pace to a 30-day month
export function forecast(activities: Activity[], goalKg: number | null | undefined) {
  if (activities.length === 0) return { current: 0, projected: 0, reduction: 0, goal: goalKg ?? 0 };
  const sorted = [...activities].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  const firstDay = new Date(sorted[0].logged_at);
  const today = new Date();
  const daysSpan = Math.max(1, Math.ceil((today.getTime() - firstDay.getTime()) / 86400000) + 1);
  const total = activities.reduce((s, a) => s + Number(a.co2_kg), 0);
  const dailyAvg = total / Math.min(daysSpan, 30);
  const projected = Math.round(dailyAvg * 30);
  const goal = goalKg && goalKg > 0 ? goalKg : Math.round(projected * 0.8);
  return { current: Math.round(total), projected, reduction: Math.max(0, projected - goal), goal };
}

// Day streaks
export function streaks(activities: Activity[]) {
  const days = new Set(activities.map((a) => a.logged_at));
  let current = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // allow today OR yesterday to start streak
  if (!days.has(toKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(toKey(d))) {
    current++;
    d.setDate(d.getDate() - 1);
  }
  // longest
  const sorted = [...days].sort();
  let longest = 0, run = 0;
  let prev: Date | null = null;
  for (const k of sorted) {
    const cur = new Date(k);
    if (prev && (cur.getTime() - prev.getTime()) === 86400000) run++;
    else run = 1;
    longest = Math.max(longest, run);
    prev = cur;
  }
  return { current, longest, totalDays: days.size };
}

function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export type Achievement = {
  key: string;
  label: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

export function achievements(activities: Activity[], score: number): Achievement[] {
  const s = streaks(activities);
  const count = activities.length;
  return [
    { key: "first_log", label: "First Log", description: "Logged your first activity", icon: "🎯", unlocked: count >= 1 },
    { key: "eco_beginner", label: "Eco Beginner", description: "Logged 5 activities", icon: "🌱", unlocked: count >= 5 },
    { key: "streak_7", label: "7-Day Streak", description: "Logged 7 days in a row", icon: "🔥", unlocked: s.longest >= 7 },
    { key: "green_week", label: "Green Week", description: "Active 7 different days", icon: "🍀", unlocked: s.totalDays >= 7 },
    { key: "carbon_saver", label: "Carbon Saver", description: "Sustainability score ≥ 60", icon: "💚", unlocked: score >= 60 },
    { key: "champion", label: "Sustainability Champion", description: "Sustainability score ≥ 80", icon: "🏆", unlocked: score >= 80 },
  ];
}
