export type Category = "transport" | "food" | "energy" | "travel" | "shopping";

export const CATEGORY_META: Record<Category, { label: string; icon: string; color: string }> = {
  transport: { label: "Transport", icon: "🚗", color: "var(--cat-transport)" },
  food: { label: "Food", icon: "🍽️", color: "var(--cat-food)" },
  energy: { label: "Energy", icon: "⚡", color: "var(--cat-energy)" },
  travel: { label: "Travel", icon: "✈️", color: "var(--cat-travel)" },
  shopping: { label: "Shopping", icon: "🛍️", color: "var(--cat-shopping)" },
};

export type Preset = {
  key: string;
  category: Category;
  label: string;
  unit: string;
  factor: number; // kg CO2 per unit
  defaultQty: number;
};

export const PRESETS: Preset[] = [
  // Transport
  { key: "car_petrol", category: "transport", label: "Drove a car (petrol)", unit: "km", factor: 0.21, defaultQty: 10 },
  { key: "motorbike", category: "transport", label: "Rode a motorbike", unit: "km", factor: 0.10, defaultQty: 10 },
  { key: "bus", category: "transport", label: "Took the bus", unit: "km", factor: 0.05, defaultQty: 10 },
  { key: "train", category: "transport", label: "Took the train / metro", unit: "km", factor: 0.04, defaultQty: 10 },
  { key: "rideshare", category: "transport", label: "Rideshare / taxi", unit: "km", factor: 0.18, defaultQty: 10 },
  // Food (per meal)
  { key: "meal_beef", category: "food", label: "Had a beef meal", unit: "meal", factor: 7.0, defaultQty: 1 },
  { key: "meal_lamb", category: "food", label: "Had a lamb meal", unit: "meal", factor: 5.5, defaultQty: 1 },
  { key: "meal_pork", category: "food", label: "Had a pork meal", unit: "meal", factor: 1.5, defaultQty: 1 },
  { key: "meal_chicken", category: "food", label: "Had a chicken meal", unit: "meal", factor: 1.0, defaultQty: 1 },
  { key: "meal_fish", category: "food", label: "Had a fish meal", unit: "meal", factor: 1.5, defaultQty: 1 },
  { key: "meal_dairy", category: "food", label: "Dairy-heavy meal", unit: "meal", factor: 1.4, defaultQty: 1 },
  { key: "meal_veg", category: "food", label: "Vegetarian meal", unit: "meal", factor: 0.5, defaultQty: 1 },
  { key: "meal_vegan", category: "food", label: "Vegan meal", unit: "meal", factor: 0.3, defaultQty: 1 },
  // Energy
  { key: "ac", category: "energy", label: "Used AC", unit: "hour", factor: 1.2, defaultQty: 4 },
  { key: "heater", category: "energy", label: "Used heater", unit: "hour", factor: 1.5, defaultQty: 4 },
  { key: "electricity", category: "energy", label: "Home electricity", unit: "kWh", factor: 0.7, defaultQty: 10 },
  { key: "gas", category: "energy", label: "Cooking gas", unit: "hour", factor: 0.3, defaultQty: 1 },
  // Travel
  { key: "flight_short", category: "travel", label: "Short flight (<1500km)", unit: "km", factor: 0.25, defaultQty: 800 },
  { key: "flight_long", category: "travel", label: "Long flight (>1500km)", unit: "km", factor: 0.15, defaultQty: 3000 },
  { key: "hotel", category: "travel", label: "Hotel stay", unit: "night", factor: 15, defaultQty: 1 },
  // Shopping
  { key: "clothing", category: "shopping", label: "Bought clothing item", unit: "item", factor: 10, defaultQty: 1 },
  { key: "electronics", category: "shopping", label: "Bought electronics", unit: "item", factor: 50, defaultQty: 1 },
  { key: "online_order", category: "shopping", label: "Online order delivered", unit: "order", factor: 0.5, defaultQty: 1 },
];

export function calcCO2(preset: Preset, qty: number) {
  return Math.round(preset.factor * qty * 100) / 100;
}

// Reference averages (kg CO2 per month)
export const AVG_INDIAN_MONTHLY = 165; // ~1.9 t/year
export const AVG_GLOBAL_MONTHLY = 400; // ~4.8 t/year
