import { describe, it, expect } from "vitest";
import {
  sustainabilityScore,
  scoreBand,
  categoryTotals,
  topCategory,
  forecast,
  streaks,
  achievements,
  type Activity,
} from "@/lib/scoring";

function makeActivity(partial: Partial<Activity> & { logged_at: string }): Activity {
  return {
    id: Math.random().toString(36),
    category: "transport",
    description: "test",
    co2_kg: 5,
    quantity: 1,
    unit: "km",
    ...partial,
  };
}

function dayOffset(offset: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

describe("sustainabilityScore", () => {
  it("rewards vegan + walk + renewable + never-flies", () => {
    const { score } = sustainabilityScore(
      { diet: "vegan", transport: "walk_bike", energy: "renewable", flight_frequency: "never" },
      50,
    );
    expect(score).toBeGreaterThanOrEqual(95);
  });

  it("penalises heavy meat + car + grid + frequent flier", () => {
    const { score } = sustainabilityScore(
      { diet: "heavy_meat", transport: "car", energy: "grid", flight_frequency: "frequent" },
      600,
    );
    expect(score).toBeLessThan(40);
  });

  it("clamps to [0,100]", () => {
    const { score } = sustainabilityScore({}, 99999);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("scoreBand", () => {
  it("returns the right band per range", () => {
    expect(scoreBand(85).label).toBe("Champion");
    expect(scoreBand(70).label).toBe("Eco-friendly");
    expect(scoreBand(45).label).toBe("On your way");
    expect(scoreBand(10).label).toBe("Starting out");
  });
});

describe("categoryTotals / topCategory", () => {
  const activities: Activity[] = [
    makeActivity({ category: "transport", co2_kg: 4, logged_at: dayOffset(-1) }),
    makeActivity({ category: "food", co2_kg: 10, logged_at: dayOffset(-1) }),
    makeActivity({ category: "food", co2_kg: 5, logged_at: dayOffset(-2) }),
  ];

  it("sums by category", () => {
    const totals = categoryTotals(activities);
    expect(totals.food).toBe(15);
    expect(totals.transport).toBe(4);
    expect(totals.energy).toBe(0);
  });

  it("picks the heaviest category", () => {
    const top = topCategory(activities);
    expect(top.category).toBe("food");
    expect(top.pct).toBeCloseTo((15 / 19) * 100, 1);
  });

  it("topCategory handles empty array without dividing by zero", () => {
    const top = topCategory([]);
    expect(top.pct).toBe(0);
  });
});

describe("forecast", () => {
  it("returns insufficientData when fewer than 3 active days", () => {
    const fc = forecast(
      [
        makeActivity({ co2_kg: 5, logged_at: dayOffset(0) }),
        makeActivity({ co2_kg: 5, logged_at: dayOffset(-1) }),
      ],
      100,
    );
    expect(fc.insufficientData).toBe(true);
    expect(fc.projected).toBe(0);
  });

  it("projects monthly emissions from smoothed daily average", () => {
    const acts: Activity[] = [];
    for (let i = 0; i < 7; i++) {
      acts.push(makeActivity({ co2_kg: 10, logged_at: dayOffset(-i) }));
    }
    const fc = forecast(acts, 200);
    expect(fc.insufficientData).toBe(false);
    expect(fc.dailyAvg).toBeGreaterThan(0);
    expect(fc.projected).toBeGreaterThan(0);
    expect(fc.projected).toBeLessThanOrEqual(fc.dailyAvg * fc.daysInMonth + 1);
  });

  it("caps single-day spikes so one bad day does not blow up the projection", () => {
    const acts: Activity[] = [];
    for (let i = 0; i < 9; i++) {
      acts.push(makeActivity({ co2_kg: 5, logged_at: dayOffset(-i) }));
    }
    acts.push(makeActivity({ co2_kg: 1000, logged_at: dayOffset(-2) }));
    const fc = forecast(acts, 200);
    // Without smoothing daily avg would be ~100. With cap it stays much lower.
    expect(fc.dailyAvg).toBeLessThan(50);
  });

  it("subtracts AI savings into improvedProjection but never goes negative", () => {
    const acts: Activity[] = [];
    for (let i = 0; i < 5; i++) acts.push(makeActivity({ co2_kg: 8, logged_at: dayOffset(-i) }));
    const fc = forecast(acts, 200, 5);
    expect(fc.improvedProjection).toBe(Math.max(0, fc.projected - fc.potentialSavings));
    const fcBig = forecast(acts, 200, 999999);
    expect(fcBig.improvedProjection).toBeGreaterThanOrEqual(0);
  });
});

describe("streaks", () => {
  it("counts consecutive days ending today", () => {
    const acts = [0, -1, -2].map((o) => makeActivity({ logged_at: dayOffset(o) }));
    const s = streaks(acts);
    expect(s.current).toBe(3);
    expect(s.longest).toBeGreaterThanOrEqual(3);
    expect(s.totalDays).toBe(3);
  });

  it("breaks when there is a gap", () => {
    const acts = [0, -2, -3].map((o) => makeActivity({ logged_at: dayOffset(o) }));
    const s = streaks(acts);
    expect(s.current).toBe(1);
  });

  it("returns zeros for no activities", () => {
    const s = streaks([]);
    expect(s.current).toBe(0);
    expect(s.longest).toBe(0);
    expect(s.totalDays).toBe(0);
  });
});

describe("achievements", () => {
  it("unlocks first_log after one activity", () => {
    const a = achievements([makeActivity({ logged_at: dayOffset(0) })], 30);
    const first = a.find((x) => x.key === "first_log")!;
    expect(first.unlocked).toBe(true);
    expect(first.earnedAt).toBeTruthy();
  });

  it("does not unlock champion without high score", () => {
    const a = achievements([makeActivity({ logged_at: dayOffset(0) })], 30);
    expect(a.find((x) => x.key === "champion")!.unlocked).toBe(false);
  });

  it("unlocks streak_7 after 7 consecutive days", () => {
    const acts = Array.from({ length: 7 }, (_, i) => makeActivity({ logged_at: dayOffset(-i) }));
    const a = achievements(acts, 50);
    expect(a.find((x) => x.key === "streak_7")!.unlocked).toBe(true);
    expect(a.find((x) => x.key === "green_week")!.unlocked).toBe(true);
  });

  it("unlocks carbon_saver at score >= 60 and champion at >= 80", () => {
    const acts = [makeActivity({ logged_at: dayOffset(0) })];
    const mid = achievements(acts, 65);
    expect(mid.find((x) => x.key === "carbon_saver")!.unlocked).toBe(true);
    expect(mid.find((x) => x.key === "champion")!.unlocked).toBe(false);
    const high = achievements(acts, 90);
    expect(high.find((x) => x.key === "champion")!.unlocked).toBe(true);
  });
});
