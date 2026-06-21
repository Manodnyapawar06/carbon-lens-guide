import { describe, it, expect } from "vitest";
import {
  PRESETS,
  CATEGORY_META,
  calcCO2,
  AVG_GLOBAL_MONTHLY,
  AVG_INDIAN_MONTHLY,
} from "@/lib/emissions";

describe("emissions", () => {
  it("has metadata for every category referenced by presets", () => {
    for (const preset of PRESETS) {
      expect(CATEGORY_META[preset.category]).toBeDefined();
    }
  });

  it("uses unique preset keys", () => {
    const keys = PRESETS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("calcCO2 multiplies factor by quantity", () => {
    const car = PRESETS.find((p) => p.key === "car_petrol")!;
    expect(calcCO2(car, 10)).toBeCloseTo(2.1, 2);
    expect(calcCO2(car, 0)).toBe(0);
  });

  it("calcCO2 rounds to two decimals", () => {
    const fake = { ...PRESETS[0], factor: 0.123456, defaultQty: 1 };
    expect(calcCO2(fake, 1)).toBe(0.12);
  });

  it("references averages are positive", () => {
    expect(AVG_GLOBAL_MONTHLY).toBeGreaterThan(0);
    expect(AVG_INDIAN_MONTHLY).toBeGreaterThan(0);
    expect(AVG_GLOBAL_MONTHLY).toBeGreaterThan(AVG_INDIAN_MONTHLY);
  });

  it("beef has a higher footprint than vegan", () => {
    const beef = PRESETS.find((p) => p.key === "meal_beef")!;
    const vegan = PRESETS.find((p) => p.key === "meal_vegan")!;
    expect(calcCO2(beef, 1)).toBeGreaterThan(calcCO2(vegan, 1));
  });
});
