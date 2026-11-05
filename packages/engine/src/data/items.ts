import type { Dice, OnHitEffect, Slot, StatMods, Tier } from "../types";

export const TIERS: Tier[] = ["Scrap", "Forged", "Tempered", "Runed", "Mythic"];

export const SELL_VALUE: Record<Tier, number> = { Scrap: 4, Forged: 12, Tempered: 35, Runed: 80, Mythic: 180 };
export const BUY_MULT = 2.5;

export type WeaponBase = "Knife" | "Spear" | "Axe" | "Cleaver" | "Maul";

export const WEAPON_BASES: Record<WeaponBase, { damage: Dice; attack: number }> = {
  Knife: { damage: { count: 1, sides: 4 }, attack: 2 },
  Spear: { damage: { count: 1, sides: 6 }, attack: 1 },
  Axe: { damage: { count: 1, sides: 8 }, attack: 0 },
  Cleaver: { damage: { count: 1, sides: 8 }, attack: 0 },
  Maul: { damage: { count: 1, sides: 10 }, attack: -1 },
};

export const WEAPON_PREFIX: Record<Tier, string[]> = {
  Scrap: ["Notched", "Rusted", "Splintered", "Bent"],
  Forged: ["Iron", "Bronze", "Bone", "Steel"],
  Tempered: ["Tempered", "Balanced", "Warband", "Ashwood"],
  Runed: ["Runed", "Emberforged", "Stormcut", "Grudgebound"],
  Mythic: [],
};

/** Per-tier bonus added on top of the weapon base. */
export const WEAPON_TIER_MODS: Record<Tier, StatMods> = {
  Scrap: {},
  Forged: { power: 1 },
  Tempered: { attack: 1, power: 1 },
  Runed: { attack: 1, power: 2 },
  Mythic: { attack: 2, power: 3 },
};

export const ARMOR_NAMES: Record<Tier, string[]> = {
  Scrap: ["Patched Rags", "Rope-Tied Hide", "Frayed Cloak"],
  Forged: ["Leather Jerkin", "Chain Shirt", "Studded Vest"],
  Tempered: ["Warband Hauberk", "Boar-Hide Cuirass", "Ashwalker Coat"],
  Runed: ["Runed Brigandine", "Emberscale Mail", "Grudgeplate"],
  Mythic: [],
};

export const ARMOR_AC: Record<Tier, number> = { Scrap: 1, Forged: 2, Tempered: 3, Runed: 4, Mythic: 5 };

export const TRINKET_NAMES: Record<Tier, string[]> = {
  Scrap: ["Lucky Pebble", "Knotted Cord"],
  Forged: ["Tooth Charm", "Copper Torc"],
  Tempered: ["Ancestor Bead", "Wolfbone Fetish"],
  Runed: ["Ember Locket", "Runestone Talisman"],
  Mythic: [],
};

export const TRINKET_STATS: StatMods[] = [{ maxHp: 4 }, { attack: 1 }, { power: 1 }, { ac: 1 }, { crit: 1 }];

export interface Affix {
  id: string;
  label: string; // "of Embers" (suffix) or "Keen" (prefix)
  position: "prefix" | "suffix";
  mods?: StatMods;
  effect?: OnHitEffect;
  slots: Slot[];
}

export const AFFIXES: Affix[] = [
  { id: "embers", label: "of Embers", position: "suffix", effect: "burnOnCrit", slots: ["weapon"] },
  { id: "leech", label: "of the Leech", position: "suffix", effect: "lifesteal", slots: ["weapon", "trinket"] },
  { id: "thorns", label: "of Thorns", position: "suffix", effect: "bleedOnHit", slots: ["weapon"] },
  { id: "thunder", label: "of Thunder", position: "suffix", effect: "stunOnCrit", slots: ["weapon"] },
  { id: "keen", label: "Keen", position: "prefix", mods: { crit: 1 }, slots: ["weapon", "trinket"] },
  { id: "sturdy", label: "Sturdy", position: "prefix", mods: { maxHp: 5 }, slots: ["armor", "trinket"] },
  { id: "brutal", label: "Brutal", position: "prefix", mods: { power: 1 }, slots: ["weapon", "trinket"] },
  { id: "precise", label: "Precise", position: "prefix", mods: { attack: 1 }, slots: ["weapon", "trinket"] },
  { id: "warded", label: "Warded", position: "prefix", mods: { ac: 1 }, slots: ["armor", "trinket"] },
];

export const AFFIX_COUNT: Record<Tier, number> = { Scrap: 0, Forged: 0, Tempered: 1, Runed: 2, Mythic: 0 };

export interface MythicDef {
  name: string;
  slot: Slot;
  damage?: Dice;
  mods: StatMods;
  effects: OnHitEffect[];
  lore: string;
}

export const MYTHICS: MythicDef[] = [
  {
    name: "Embermaw",
    slot: "weapon",
    damage: { count: 1, sides: 10 },
    mods: { attack: 2, power: 3 },
    effects: ["burnOnCrit"],
    lore: "The axe that lit the first clanfire.",
  },
  {
    name: "Widow's Answer",
    slot: "weapon",
    damage: { count: 1, sides: 6 },
    mods: { attack: 4, power: 2, crit: 2 },
    effects: ["bleedOnHit"],
    lore: "Every Concord widow knows its name.",
  },
  {
    name: "Cinderfang",
    slot: "weapon",
    damage: { count: 1, sides: 8 },
    mods: { attack: 3, power: 3 },
    effects: ["lifesteal"],
    lore: "It drinks, and you are made whole.",
  },
  {
    name: "Grudgebearer",
    slot: "weapon",
    damage: { count: 1, sides: 12 },
    mods: { attack: 1, power: 4 },
    effects: ["stunOnCrit"],
    lore: "Heavy with every wrong ever done to the Clans.",
  },
  {
    name: "Mantle of the First Fire",
    slot: "armor",
    mods: { ac: 5, maxHp: 8 },
    effects: [],
    lore: "Still warm, after a thousand years.",
  },
  {
    name: "Aurelan's Broken Aegis",
    slot: "armor",
    mods: { ac: 6 },
    effects: [],
    lore: "Gilded, cracked, and now yours.",
  },
  {
    name: "The Ashen Crown",
    slot: "trinket",
    mods: { attack: 2, power: 2, maxHp: 6 },
    effects: [],
    lore: "No clan has worn it since the Burning.",
  },
  {
    name: "Heart of the Pyre",
    slot: "trinket",
    mods: { crit: 2, power: 1 },
    effects: ["lifesteal"],
    lore: "It beats, faintly.",
  },
];
