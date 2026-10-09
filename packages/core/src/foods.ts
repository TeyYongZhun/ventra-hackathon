import type { MacroLog } from './record.js';

// Common Singapore meals for the manual food log (photo scanning is optional).
// Values are APPROXIMATE per typical serving, for self-care guidance only; the care team
// or dietitian should confirm. Sodium matters most for heart failure.
export interface FoodItem {
  id: string;
  what: string;
  sodiumMg: number;
  kcal: number;
  potassiumMg: number;
  phosphorusMg: number;
  carbs: MacroLog;
  protein: MacroLog;
  fat: MacroLog;
  // Plate split: carbs, protein, vegetables/other (adds up to 1)
  plate: [number, number, number];
  tip: string;
}

export const FOODS: FoodItem[] = [
  {
    id: 'oat-porridge',
    what: 'Oat porridge with banana',
    sodiumMg: 500, kcal: 330, potassiumMg: 480, phosphorusMg: 260,
    carbs: { g: 58, what: 'Oats and banana' }, protein: { g: 9, what: 'Oats and milk' }, fat: { g: 7, what: 'Milk' },
    plate: [0.75, 0.125, 0.125],
    tip: 'A good choice. Plain rolled oats have less salt than instant oats.',
  },
  {
    id: 'kaya-toast',
    what: 'Kaya toast with soft-boiled eggs',
    sodiumMg: 700, kcal: 400, potassiumMg: 200, phosphorusMg: 250,
    carbs: { g: 40, what: 'Bread and kaya' }, protein: { g: 14, what: 'Eggs' }, fat: { g: 20, what: 'Butter and eggs' },
    plate: [0.5, 0.25, 0.25],
    tip: 'Go easy on the soy sauce for the eggs — a few drops is enough.',
  },
  {
    id: 'fish-soup-noodles',
    what: 'Fish soup with noodles',
    sodiumMg: 1100, kcal: 420, potassiumMg: 650, phosphorusMg: 280,
    carbs: { g: 52, what: 'Noodles' }, protein: { g: 24, what: 'Fish' }, fat: { g: 12, what: 'Oil and fish' },
    plate: [0.5, 0.25, 0.25],
    tip: 'Most of the salt is in the soup — try drinking only half next time.',
  },
  {
    id: 'chicken-rice',
    what: 'Chicken rice',
    sodiumMg: 1300, kcal: 600, potassiumMg: 350, phosphorusMg: 250,
    carbs: { g: 75, what: 'Rice' }, protein: { g: 28, what: 'Chicken' }, fat: { g: 20, what: 'Oil and chicken skin' },
    plate: [0.6, 0.3, 0.1],
    tip: 'Ask for less dark sauce and chilli, and skip the soup.',
  },
  {
    id: 'wonton-noodles',
    what: 'Wonton noodles (dry)',
    sodiumMg: 1400, kcal: 410, potassiumMg: 300, phosphorusMg: 200,
    carbs: { g: 55, what: 'Noodles' }, protein: { g: 18, what: 'Wonton and char siew' }, fat: { g: 13, what: 'Oil' },
    plate: [0.6, 0.25, 0.15],
    tip: 'Ask for less sauce, and leave the soup on the side.',
  },
  {
    id: 'nasi-lemak',
    what: 'Nasi lemak',
    sodiumMg: 1000, kcal: 650, potassiumMg: 400, phosphorusMg: 300,
    carbs: { g: 80, what: 'Coconut rice' }, protein: { g: 20, what: 'Egg, fish and peanuts' }, fat: { g: 30, what: 'Coconut milk and fried food' },
    plate: [0.6, 0.25, 0.15],
    tip: 'The sambal and ikan bilis are salty — take a little less of both.',
  },
  {
    id: 'steamed-fish-rice',
    what: 'Steamed fish with rice and vegetables',
    sodiumMg: 450, kcal: 480, potassiumMg: 720, phosphorusMg: 320,
    carbs: { g: 60, what: 'Rice' }, protein: { g: 28, what: 'Fish' }, fat: { g: 10, what: 'Oil' },
    plate: [0.5, 0.25, 0.25],
    tip: 'Great pick — steaming keeps the salt low. Skip extra soy sauce.',
  },
  {
    id: 'fruit',
    what: 'Fruit (apple, pear or papaya)',
    sodiumMg: 5, kcal: 90, potassiumMg: 200, phosphorusMg: 20,
    carbs: { g: 22, what: 'Fruit' }, protein: { g: 1, what: 'Fruit' }, fat: { g: 0, what: 'None' },
    plate: [0.9, 0.05, 0.05],
    tip: 'A low-salt snack. Count juicy fruits like watermelon as part of your drinks.',
  },
];

export function findFood(id: string): FoodItem | undefined {
  return FOODS.find((food) => food.id === id);
}

// Breakfast before 11 AM, lunch before 4 PM, dinner after 6 PM, otherwise a snack.
export function mealForTime(minutes: number): string {
  if (minutes < 11 * 60) return 'Breakfast';
  if (minutes < 16 * 60) return 'Lunch';
  if (minutes >= 18 * 60) return 'Dinner';
  return 'Snack';
}
