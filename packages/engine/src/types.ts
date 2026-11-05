// Shared types for the Ashfall engine. Everything here is plain JSON-serializable
// data so a run can be saved to localStorage (or sent to a server) as-is.

export type Tier = "Scrap" | "Forged" | "Tempered" | "Runed" | "Mythic";
export type Slot = "weapon" | "armor" | "trinket";
export type ClassId = "brute" | "ashcaller" | "skirmisher";

/** Dice expression: count x d(sides) + bonus. */
export interface Dice {
  count: number;
  sides: number;
  bonus?: number;
}

/** Flat stat modifiers. Items, boons, and camp upgrades all use this shape. */
export interface StatMods {
  maxHp?: number;
  ac?: number;
  attack?: number;
  power?: number;
  crit?: number; // widens the crit range: crit on a natural (20 - crit) or higher
}

export type OnHitEffect = "burnOnCrit" | "lifesteal" | "bleedOnHit" | "stunOnCrit";

export interface Item {
  id: string;
  name: string;
  slot: Slot;
  tier: Tier;
  /** Weapons only: the damage die rolled on a hit. */
  damage?: Dice;
  mods: StatMods;
  effects: OnHitEffect[];
  /** Short flavor line for named Mythic gear. */
  lore?: string;
}

export type StatusId = "burn" | "bleed" | "stun" | "shield" | "evade" | "guard";

export interface Status {
  id: StatusId;
  /** Turns remaining (burn/bleed/stun/evade/guard) or points remaining (shield). */
  amount: number;
}

export interface Hero {
  name: string;
  classId: ClassId;
  hp: number;
  level: number;
  xp: number;
  gold: number;
  potions: number;
  base: Required<StatMods>;
  equipment: Partial<Record<Slot, Item>>;
  bag: Item[];
  /** Permanent bonuses picked up during this run (shrines, training). */
  boons: { name: string; mods: StatMods; effects?: OnHitEffect[] }[];
}

export interface DerivedStats {
  maxHp: number;
  ac: number;
  attack: number;
  power: number;
  critMin: number;
  damage: Dice;
  effects: OnHitEffect[];
}

export type MonsterRank = "normal" | "elite" | "boss";

export type MonsterMove =
  | {
      kind: "attack";
      name: string;
      weight: number;
      mult?: number;
      hitMod?: number;
      status?: StatusId;
      statusChance?: number;
      statusAmount?: number;
    }
  | { kind: "guard"; name: string; weight: number; shield: number }
  | { kind: "heal"; name: string; weight: number; amount: number };

export interface MonsterDef {
  id: string;
  name: string;
  rank: MonsterRank;
  floors: number[];
  hp: number;
  ac: number;
  attack: number;
  damage: Dice;
  xp: number;
  gold: [number, number];
  moves: MonsterMove[];
  taunts: string[];
  /** Below this fraction of max HP the monster enrages: +2 damage, one-time. */
  enrageAt?: number;
}

export interface Enemy {
  defId: string;
  name: string;
  rank: MonsterRank;
  hp: number;
  maxHp: number;
  ac: number;
  attack: number;
  damage: Dice;
  xp: number;
  gold: [number, number];
  statuses: Status[];
  intent: number; // index into the def's moves
  enraged: boolean;
}

export interface CombatState {
  enemy: Enemy;
  heroStatuses: Status[];
  cooldowns: Record<string, number>;
  turn: number;
  canFlee: boolean;
}

export type NodeType = "fight" | "elite" | "merchant" | "rest" | "treasure" | "shrine" | "boss";

export interface MapNode {
  id: string;
  row: number;
  col: number;
  type: NodeType;
  next: string[];
}

export interface FloorMap {
  rows: MapNode[][];
}

export interface Reward {
  gold: number;
  xp: number;
  items: Item[];
  potions: number;
  /** True once the hero has picked or skipped the item choice. */
  itemTaken: boolean;
  source: string;
}

export interface Boon {
  id: string;
  name: string;
  text: string;
  mods: StatMods;
  effects?: OnHitEffect[];
  hpCost?: number;
  goldCost?: number;
}

export interface MerchantStock {
  items: { item: Item; price: number; sold: boolean }[];
  potionPrice: number;
}

export type Phase = "map" | "combat" | "reward" | "merchant" | "rest" | "shrine" | "victory" | "defeat";

export interface RunStats {
  kills: number;
  elites: number;
  bosses: number;
  goldEarned: number;
  floorsCleared: number;
  embers: number;
}

export interface RunState {
  version: 1;
  seed: string;
  daily: boolean;
  rng: number;
  hero: Hero;
  floor: number;
  map: FloorMap;
  position: string | null;
  visited: string[];
  phase: Phase;
  combat?: CombatState;
  reward?: Reward;
  merchant?: MerchantStock;
  shrine?: Boon[];
  log: string[];
  stats: RunStats;
  /** Multiplier on gold from fights (camp upgrade "Plunder"). */
  goldMult: number;
  nextId: number;
}

export type Action =
  | { type: "travel"; nodeId: string }
  | { type: "attack" }
  | { type: "defend" }
  | { type: "ability"; abilityId: string }
  | { type: "potion" }
  | { type: "flee" }
  | { type: "takeItem"; index: number }
  | { type: "skipItem" }
  | { type: "continue" }
  | { type: "equip"; bagIndex: number }
  | { type: "discard"; bagIndex: number }
  | { type: "buy"; index: number }
  | { type: "buyPotion" }
  | { type: "sell"; bagIndex: number }
  | { type: "rest"; choice: "heal" | "train" }
  | { type: "shrine"; index: number }
  | { type: "abandon" };

export interface Profile {
  version: 1;
  embers: number;
  unlockedClasses: ClassId[];
  upgrades: Record<string, number>;
  history: {
    runs: number;
    victories: number;
    bestFloor: number;
    totalKills: number;
  };
}
