// War Camp upgrades, bought with embers between runs. Effects are applied in newRun().
export interface UpgradeDef {
  id: string;
  name: string;
  text: string;
  maxLevel: number;
  /** Ember cost to buy the next level, given the current level. */
  cost: (level: number) => number;
}

export const UPGRADES: UpgradeDef[] = [
  { id: "hardened", name: "Hardened", text: "+4 max HP per level.", maxLevel: 5, cost: (l) => 8 + l * 6 },
  { id: "warpaint", name: "Warpaint", text: "+1 attack per level.", maxLevel: 2, cost: (l) => 20 + l * 15 },
  {
    id: "provisions",
    name: "Provisions",
    text: "+1 starting potion per level.",
    maxLevel: 2,
    cost: (l) => 10 + l * 10,
  },
  { id: "plunder", name: "Plunder", text: "+15% gold from fights per level.", maxLevel: 3, cost: (l) => 10 + l * 8 },
  {
    id: "ember-forge",
    name: "Ember Forge",
    text: "Start with a Forged weapon instead of Scrap.",
    maxLevel: 1,
    cost: () => 30,
  },
  {
    id: "war-chest",
    name: "War Chest",
    text: "Start each run with +25 gold per level.",
    maxLevel: 2,
    cost: (l) => 12 + l * 10,
  },
];

export function upgradeDef(id: string): UpgradeDef {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) throw new Error(`Unknown upgrade ${id}`);
  return def;
}
