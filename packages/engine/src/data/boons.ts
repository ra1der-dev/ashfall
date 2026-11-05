import type { Boon } from "../types";

// Shrine offerings. Some are free, some trade HP or gold for power.
export const BOONS: Boon[] = [
  { id: "ox-blood", name: "Ox Blood", text: "+6 max HP.", mods: { maxHp: 6 } },
  { id: "iron-skin", name: "Iron Skin", text: "+1 AC.", mods: { ac: 1 } },
  { id: "steady-hand", name: "Steady Hand", text: "+1 attack.", mods: { attack: 1 } },
  { id: "heavy-arm", name: "Heavy Arm", text: "+1 power.", mods: { power: 1 } },
  { id: "hawk-eye", name: "Hawk Eye", text: "+1 crit range.", mods: { crit: 1 } },
  { id: "blood-pact", name: "Blood Pact", text: "Lose 8 HP. +2 power.", mods: { power: 2 }, hpCost: 8 },
  {
    id: "gilded-offering",
    name: "Gilded Offering",
    text: "Pay 40 gold. +2 attack.",
    mods: { attack: 2 },
    goldCost: 40,
  },
  {
    id: "ember-heart",
    name: "Ember Heart",
    text: "Your crits set enemies on fire.",
    mods: {},
    effects: ["burnOnCrit"],
  },
  {
    id: "leech-rite",
    name: "Leech Rite",
    text: "Lose 5 HP. Heal 2 on every hit.",
    mods: {},
    effects: ["lifesteal"],
    hpCost: 5,
  },
  {
    id: "thorn-oath",
    name: "Thorn Oath",
    text: "Your hits sometimes cause bleeding.",
    mods: {},
    effects: ["bleedOnHit"],
  },
];
