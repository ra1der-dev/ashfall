import type { Dice } from "./types";

/**
 * Seeded random number generator (mulberry32). The whole generator state is a
 * single 32-bit integer, stored on RunState.rng, so a run is fully reproducible
 * from its seed plus the list of actions taken.
 */
export class Rng {
  constructor(public state: number) {}

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  die(sides: number): number {
    return this.int(1, sides);
  }

  roll(dice: Dice): number {
    let total = dice.bonus ?? 0;
    for (let i = 0; i < dice.count; i++) total += this.die(dice.sides);
    return total;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("pick from empty list");
    return items[Math.floor(this.next() * items.length)]!;
  }

  weighted<T extends { weight: number }>(items: readonly T[]): T {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = this.next() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll < 0) return item;
    }
    return items[items.length - 1]!;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }
}

/** Turn any string seed into a 32-bit integer (FNV-1a). */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

export function formatDice(dice: Dice): string {
  const bonus = dice.bonus ? (dice.bonus > 0 ? `+${dice.bonus}` : `${dice.bonus}`) : "";
  return `${dice.count}d${dice.sides}${bonus}`;
}
