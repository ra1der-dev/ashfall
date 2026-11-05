import type { ClassId, Dice, StatMods } from "../types";

export interface AbilityDef {
  id: string;
  name: string;
  text: string;
  cooldown: number;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  tagline: string;
  passive: string;
  base: Required<StatMods>;
  /** Unarmed damage, used only if the hero somehow has no weapon. */
  fist: Dice;
  starterWeapon: "Axe" | "Knife" | "Spear" | "Maul" | "Cleaver";
  abilities: AbilityDef[];
  unlockCost: number;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  brute: {
    id: "brute",
    name: "Brute",
    tagline: "A wall of scar tissue that hits harder the closer it gets to death.",
    passive: "Rage: +1 power for every 25% of max HP missing.",
    base: { maxHp: 36, ac: 11, attack: 3, power: 1, crit: 0 },
    fist: { count: 1, sides: 4 },
    starterWeapon: "Maul",
    unlockCost: 0,
    abilities: [
      {
        id: "crushing-blow",
        name: "Crushing Blow",
        text: "Attack with +2 to hit for 1.5x damage. Stuns on a hit.",
        cooldown: 3,
      },
      { id: "iron-hide", name: "Iron Hide", text: "Gain a shield equal to 6 + power.", cooldown: 4 },
    ],
  },
  ashcaller: {
    id: "ashcaller",
    name: "Ashcaller",
    tagline: "A clan seer who speaks to the cinders and is answered in fire.",
    passive: "Kindling: your attacks always burn enemies that are already burning for 1 extra turn.",
    base: { maxHp: 32, ac: 10, attack: 2, power: 1, crit: 0 },
    fist: { count: 1, sides: 4 },
    starterWeapon: "Spear",
    unlockCost: 20,
    abilities: [
      {
        id: "ember-bolt",
        name: "Ember Bolt",
        text: "Never misses. Deals 2d6 + power fire damage and burns for 2 turns.",
        cooldown: 2,
      },
      { id: "mending-ash", name: "Mending Ash", text: "Heal 2d6 + 2 + power HP.", cooldown: 4 },
    ],
  },
  skirmisher: {
    id: "skirmisher",
    name: "Skirmisher",
    tagline: "Fast, mean, and gone before the Concord knows where the arrow came from.",
    passive: "Keen Eye: critical hits on 18-20.",
    base: { maxHp: 34, ac: 13, attack: 4, power: 2, crit: 2 },
    fist: { count: 1, sides: 4 },
    starterWeapon: "Knife",
    unlockCost: 30,
    abilities: [
      { id: "twin-strike", name: "Twin Strike", text: "Make two attacks.", cooldown: 3 },
      { id: "smoke-step", name: "Smoke Step", text: "The next enemy attack misses. Cooldowns drop by 1.", cooldown: 4 },
    ],
  },
};

export const CLASS_ORDER: ClassId[] = ["brute", "ashcaller", "skirmisher"];

export const HERO_NAMES = [
  "Korvash",
  "Brakka",
  "Ulgar",
  "Seska",
  "Mordrin",
  "Tavik",
  "Grenna",
  "Hask",
  "Velka",
  "Durn",
];

export const VICTORY_SHOUTS = [
  "Ash and iron!",
  "The Clans endure!",
  "Blood and embers!",
  "Another for the pyre!",
  "Burn bright!",
];
