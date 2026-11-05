import {
  AFFIXES,
  AFFIX_COUNT,
  ARMOR_AC,
  ARMOR_NAMES,
  BUY_MULT,
  MYTHICS,
  SELL_VALUE,
  TRINKET_NAMES,
  TRINKET_STATS,
  WEAPON_BASES,
  WEAPON_PREFIX,
  WEAPON_TIER_MODS,
  type Affix,
  type WeaponBase,
} from "./data/items";
import type { Rng } from "./rng";
import type { Item, OnHitEffect, Slot, StatMods, Tier } from "./types";

export type LootSource = "fight" | "elite" | "boss" | "treasure" | "merchant";

type TierWeights = Partial<Record<Tier, number>>;

/** Drop odds by source and floor. Deeper floors shift toward better tiers. */
export function tierWeights(source: LootSource, floor: number): TierWeights {
  switch (source) {
    case "fight":
      if (floor <= 1) return { Scrap: 35, Forged: 45, Tempered: 18, Runed: 2 };
      if (floor === 2) return { Scrap: 15, Forged: 45, Tempered: 33, Runed: 7 };
      return { Forged: 35, Tempered: 45, Runed: 20 };
    case "elite":
      return floor <= 1 ? { Forged: 30, Tempered: 55, Runed: 15 } : { Forged: 10, Tempered: 55, Runed: 33, Mythic: 2 };
    case "boss":
      return floor >= 3 ? { Runed: 50, Mythic: 50 } : { Tempered: 30, Runed: 55, Mythic: 15 };
    case "treasure":
      return floor <= 1 ? { Forged: 40, Tempered: 45, Runed: 15 } : { Forged: 20, Tempered: 50, Runed: 28, Mythic: 2 };
    case "merchant":
      return { Forged: 25, Tempered: 50, Runed: 22, Mythic: 3 };
  }
}

export function rollTier(rng: Rng, weights: TierWeights): Tier {
  const entries = (Object.entries(weights) as [Tier, number][]).map(([tier, weight]) => ({ tier, weight }));
  return rng.weighted(entries).tier;
}

export function rollSlot(rng: Rng): Slot {
  return rng.weighted([
    { slot: "weapon" as const, weight: 4 },
    { slot: "armor" as const, weight: 4 },
    { slot: "trinket" as const, weight: 2 },
  ]).slot;
}

function addMods(target: StatMods, extra: StatMods | undefined): StatMods {
  if (!extra) return target;
  const out: StatMods = { ...target };
  for (const key of Object.keys(extra) as (keyof StatMods)[]) {
    out[key] = (out[key] ?? 0) + (extra[key] ?? 0);
  }
  return out;
}

function pickAffixes(rng: Rng, slot: Slot, count: number): Affix[] {
  const pool = rng.shuffle(AFFIXES.filter((a) => a.slots.includes(slot)));
  const chosen: Affix[] = [];
  let hasSuffix = false;
  for (const affix of pool) {
    if (chosen.length >= count) break;
    if (affix.position === "suffix" && hasSuffix) continue;
    if (affix.position === "suffix") hasSuffix = true;
    chosen.push(affix);
  }
  return chosen;
}

export function makeItem(rng: Rng, id: string, slot: Slot, tier: Tier, weaponBase?: WeaponBase): Item {
  if (tier === "Mythic") {
    const options = MYTHICS.filter((m) => m.slot === slot);
    const def = rng.pick(options);
    const item: Item = {
      id,
      name: def.name,
      slot,
      tier,
      mods: { ...def.mods },
      effects: [...def.effects],
      lore: def.lore,
    };
    if (def.damage) item.damage = { ...def.damage };
    return item;
  }

  let baseName: string;
  let mods: StatMods = {};
  let damage;
  if (slot === "weapon") {
    const base = weaponBase ?? rng.pick(Object.keys(WEAPON_BASES) as WeaponBase[]);
    const info = WEAPON_BASES[base];
    baseName = `${rng.pick(WEAPON_PREFIX[tier])} ${base}`;
    damage = { ...info.damage };
    mods = addMods({ attack: info.attack }, WEAPON_TIER_MODS[tier]);
  } else if (slot === "armor") {
    baseName = rng.pick(ARMOR_NAMES[tier]);
    mods = { ac: ARMOR_AC[tier] };
  } else {
    baseName = rng.pick(TRINKET_NAMES[tier]);
    const tierIndex = ["Scrap", "Forged", "Tempered", "Runed"].indexOf(tier);
    // Better trinkets roll more stat lines.
    for (let i = 0; i <= Math.max(0, tierIndex - 1); i++) mods = addMods(mods, rng.pick(TRINKET_STATS));
  }

  const affixes = pickAffixes(rng, slot, AFFIX_COUNT[tier]);
  const effects: OnHitEffect[] = [];
  for (const affix of affixes) {
    mods = addMods(mods, affix.mods);
    if (affix.effect) effects.push(affix.effect);
  }
  const prefix = affixes.find((a) => a.position === "prefix");
  const suffix = affixes.find((a) => a.position === "suffix");
  const name = [prefix?.label, baseName, suffix?.label].filter(Boolean).join(" ");

  // Drop zero-valued mods so item cards stay clean.
  for (const key of Object.keys(mods) as (keyof StatMods)[]) if (!mods[key]) delete mods[key];

  const item: Item = { id, name, slot, tier, mods, effects };
  if (damage) item.damage = damage;
  return item;
}

export function rollItem(rng: Rng, id: string, source: LootSource, floor: number): Item {
  return makeItem(rng, id, rollSlot(rng), rollTier(rng, tierWeights(source, floor)));
}

export function sellValue(item: Item): number {
  return SELL_VALUE[item.tier];
}

export function buyPrice(item: Item): number {
  return Math.round(SELL_VALUE[item.tier] * BUY_MULT);
}

const EFFECT_TEXT: Record<OnHitEffect, string> = {
  burnOnCrit: "Crits burn",
  lifesteal: "Heal 2 on hit",
  bleedOnHit: "25% bleed on hit",
  stunOnCrit: "Crits stun",
};

export function describeEffect(effect: OnHitEffect): string {
  return EFFECT_TEXT[effect];
}

export function describeMods(mods: StatMods): string[] {
  const lines: string[] = [];
  if (mods.attack) lines.push(`${mods.attack > 0 ? "+" : ""}${mods.attack} attack`);
  if (mods.power) lines.push(`+${mods.power} power`);
  if (mods.ac) lines.push(`+${mods.ac} AC`);
  if (mods.maxHp) lines.push(`+${mods.maxHp} max HP`);
  if (mods.crit) lines.push(`+${mods.crit} crit range`);
  return lines;
}
