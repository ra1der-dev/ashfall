import { CLASSES } from "./data/classes";
import { upgradeDef } from "./data/upgrades";
import type { ClassId, Profile, RunState } from "./types";

export function newProfile(): Profile {
  return {
    version: 1,
    embers: 0,
    unlockedClasses: ["brute"],
    upgrades: {},
    history: { runs: 0, victories: 0, bestFloor: 0, totalKills: 0 },
  };
}

export function canUnlockClass(profile: Profile, classId: ClassId): boolean {
  return !profile.unlockedClasses.includes(classId) && profile.embers >= CLASSES[classId].unlockCost;
}

export function unlockClass(profile: Profile, classId: ClassId): Profile {
  if (!canUnlockClass(profile, classId)) return profile;
  return {
    ...profile,
    embers: profile.embers - CLASSES[classId].unlockCost,
    unlockedClasses: [...profile.unlockedClasses, classId],
  };
}

export function upgradeCost(profile: Profile, id: string): number | null {
  const def = upgradeDef(id);
  const level = profile.upgrades[id] ?? 0;
  return level >= def.maxLevel ? null : def.cost(level);
}

export function buyUpgrade(profile: Profile, id: string): Profile {
  const cost = upgradeCost(profile, id);
  if (cost === null || profile.embers < cost) return profile;
  return {
    ...profile,
    embers: profile.embers - cost,
    upgrades: { ...profile.upgrades, [id]: (profile.upgrades[id] ?? 0) + 1 },
  };
}

/** Bank a finished run's embers and stats into the profile. */
export function settleRun(profile: Profile, run: RunState): Profile {
  const deepest = run.floor;
  return {
    ...profile,
    embers: profile.embers + run.stats.embers,
    history: {
      runs: profile.history.runs + 1,
      victories: profile.history.victories + (run.phase === "victory" ? 1 : 0),
      bestFloor: Math.max(profile.history.bestFloor, deepest),
      totalKills: profile.history.totalKills + run.stats.kills,
    },
  };
}
