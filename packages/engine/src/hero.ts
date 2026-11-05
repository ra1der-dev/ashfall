import { CLASSES } from "./data/classes";
import type { DerivedStats, Hero, OnHitEffect, StatMods } from "./types";

/** Total XP needed to reach each level. Index 0 = level 1. */
export const LEVEL_XP = [0, 30, 75, 135, 210, 300, 410, 540];
export const MAX_LEVEL = LEVEL_XP.length;

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]!) level = i + 1;
  return level;
}

/** Stats granted by levels above 1: +4 max HP each, +1 attack on every even level. */
export function levelMods(level: number): StatMods {
  return { maxHp: (level - 1) * 4, attack: Math.floor(level / 2) };
}

function sumMods(...sources: (StatMods | undefined)[]): Required<StatMods> {
  const total = { maxHp: 0, ac: 0, attack: 0, power: 0, crit: 0 };
  for (const mods of sources) {
    if (!mods) continue;
    total.maxHp += mods.maxHp ?? 0;
    total.ac += mods.ac ?? 0;
    total.attack += mods.attack ?? 0;
    total.power += mods.power ?? 0;
    total.crit += mods.crit ?? 0;
  }
  return total;
}

export function maxHp(hero: Hero): number {
  return heroStats(hero).maxHp;
}

/** Final combat stats: class base + level + gear + boons (+ Brute rage). */
export function heroStats(hero: Hero): DerivedStats {
  const gear = Object.values(hero.equipment);
  const total = sumMods(
    hero.base,
    levelMods(hero.level),
    ...gear.map((i) => i?.mods),
    ...hero.boons.map((b) => b.mods),
  );
  const effects = new Set<OnHitEffect>();
  for (const item of gear) for (const e of item?.effects ?? []) effects.add(e);
  for (const boon of hero.boons) for (const e of boon.effects ?? []) effects.add(e);

  let power = total.power;
  if (hero.classId === "brute") {
    const missing = 1 - hero.hp / Math.max(1, total.maxHp);
    power += Math.max(0, Math.floor(missing / 0.25));
  }

  return {
    maxHp: Math.max(1, total.maxHp),
    ac: total.ac,
    attack: total.attack,
    power,
    critMin: Math.max(15, 20 - total.crit),
    damage: hero.equipment.weapon?.damage ?? CLASSES[hero.classId].fist,
    effects: [...effects],
  };
}

export function healHero(hero: Hero, amount: number): number {
  const cap = maxHp(hero);
  const before = hero.hp;
  hero.hp = Math.min(cap, hero.hp + amount);
  return hero.hp - before;
}
