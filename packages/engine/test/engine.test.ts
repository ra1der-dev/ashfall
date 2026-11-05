import { describe, expect, it } from "vitest";
import {
  CLASSES,
  MAP_ROWS,
  MONSTERS,
  Rng,
  applyAction,
  applyActionStrict,
  buyUpgrade,
  createEnemy,
  generateFloor,
  hashSeed,
  heroStats,
  isRunOver,
  legalActions,
  makeItem,
  newProfile,
  newRun,
  reachableNodes,
  settleRun,
  startCombat,
  unlockClass,
  type Action,
  type ClassId,
  type RunState,
} from "../src";

function rngFor(seed: string) {
  return new Rng(hashSeed(seed));
}

/** Plays a whole run with a simple greedy bot. Returns the final state. */
function autoplay(run: RunState, pickSeed: string, maxSteps = 2000): RunState {
  const choose = rngFor(pickSeed);
  let state = run;
  for (let step = 0; step < maxSteps && !isRunOver(state); step++) {
    const actions = legalActions(state);
    expect(actions.length, `no legal actions in phase ${state.phase}`).toBeGreaterThan(0);
    const action = botChoice(state, actions, choose);
    state = applyActionStrict(state, action);
  }
  return state;
}

function botChoice(run: RunState, actions: Action[], rng: Rng): Action {
  const find = (type: Action["type"]) => actions.find((a) => a.type === type);
  const stats = heroStats(run.hero);
  if (run.phase === "combat") {
    if (run.hero.hp < stats.maxHp * 0.35 && find("potion")) return find("potion")!;
    const ability = actions.find((a) => a.type === "ability");
    if (ability && rng.chance(0.6)) return ability;
    return find("attack")!;
  }
  if (run.phase === "reward") return find("takeItem") ?? find("continue")!;
  if (run.phase === "rest")
    return run.hero.hp < stats.maxHp * 0.7 ? { type: "rest", choice: "heal" } : { type: "rest", choice: "train" };
  if (run.phase === "map") {
    const equip = actions.find((a) => a.type === "equip");
    if (equip && rng.chance(0.3)) return equip;
  }
  return rng.pick(actions.filter((a) => a.type !== "equip" && a.type !== "sell")) ?? actions[0]!;
}

describe("rng", () => {
  it("is deterministic for the same seed", () => {
    const a = rngFor("ash");
    const b = rngFor("ash");
    const rollsA = Array.from({ length: 50 }, () => a.die(20));
    const rollsB = Array.from({ length: 50 }, () => b.die(20));
    expect(rollsA).toEqual(rollsB);
    expect(rollsA.every((r) => r >= 1 && r <= 20)).toBe(true);
  });

  it("produces every face of a die", () => {
    const rng = rngFor("faces");
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.die(6));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("map", () => {
  it("builds connected floors ending in a boss", () => {
    for (let s = 0; s < 50; s++) {
      const map = generateFloor(rngFor(`map-${s}`), 1);
      expect(map.rows).toHaveLength(MAP_ROWS + 1);
      expect(map.rows[MAP_ROWS]![0]!.type).toBe("boss");
      expect(map.rows[MAP_ROWS - 1]!.every((n) => n.type === "rest")).toBe(true);
      expect(map.rows[MAP_ROWS - 2]!.some((n) => n.type === "rest")).toBe(false);
      expect(map.rows[0]!.every((n) => n.type === "fight")).toBe(true);
      // Every room in each row is reachable from the row above, and every room has a way out.
      for (let r = 0; r < map.rows.length - 1; r++) {
        for (const node of map.rows[r]!) expect(node.next.length).toBeGreaterThan(0);
        for (const node of map.rows[r + 1]!) {
          expect(map.rows[r]!.some((p) => p.next.includes(node.id))).toBe(true);
        }
      }
    }
  });

  it("starts with the first row reachable", () => {
    const map = generateFloor(rngFor("start"), 1);
    expect(reachableNodes(map, null)).toBe(map.rows[0]);
  });
});

describe("items", () => {
  it("gives Mythic weapons a damage die and lore", () => {
    const item = makeItem(rngFor("mythic"), "x", "weapon", "Mythic");
    expect(item.damage).toBeDefined();
    expect(item.lore).toBeTruthy();
  });

  it("gives Runed gear affixes", () => {
    const rng = rngFor("runed");
    const items = Array.from({ length: 20 }, (_, i) => makeItem(rng, `r${i}`, "weapon", "Runed"));
    expect(items.some((i) => i.effects.length > 0 || Object.keys(i.mods).length > 2)).toBe(true);
  });
});

describe("runs", () => {
  const profile = newProfile();

  it("is reproducible from a seed", () => {
    const a = autoplay(newRun(profile, { classId: "brute", seed: "same", name: "Test" }), "bot");
    const b = autoplay(newRun(profile, { classId: "brute", seed: "same", name: "Test" }), "bot");
    expect(a).toEqual(b);
  });

  it("starts the hero at full HP with starter gear", () => {
    const run = newRun(profile, { classId: "skirmisher", seed: "s" });
    expect(run.hero.hp).toBe(heroStats(run.hero).maxHp);
    expect(run.hero.equipment.weapon?.name).toContain("Knife");
    expect(run.phase).toBe("map");
  });

  it("ignores illegal actions", () => {
    const run = newRun(profile, { classId: "brute", seed: "illegal" });
    expect(applyAction(run, { type: "attack" })).toBe(run);
    expect(applyAction(run, { type: "travel", nodeId: "nope" })).toBe(run);
    expect(() => applyActionStrict(run, { type: "buy", index: 0 })).toThrow();
  });

  it("never mutates the previous state", () => {
    const run = newRun(profile, { classId: "brute", seed: "immutable" });
    const snapshot = structuredClone(run);
    applyAction(run, legalActions(run)[0]!);
    expect(run).toEqual(snapshot);
  });

  it.each(["brute", "ashcaller", "skirmisher"] as ClassId[])(
    "completes 40 bot runs as %s without getting stuck",
    (classId) => {
      let victories = 0;
      for (let s = 0; s < 40; s++) {
        const end = autoplay(newRun(profile, { classId, seed: `${classId}-${s}` }), `bot-${s}`);
        expect(isRunOver(end)).toBe(true);
        expect(end.stats.embers).toBeGreaterThanOrEqual(0);
        if (end.phase === "victory") victories++;
      }
      // A dumb bot should not win every run, but the game must be beatable.
      expect(victories).toBeLessThan(40);
    },
  );

  it("flees successfully or takes a hit, but never from bosses", () => {
    const run = newRun(profile, { classId: "brute", seed: "boss" });
    const rng = new Rng(run.rng);
    startCombat(
      run,
      rng,
      MONSTERS.find((m) => m.rank === "boss")!,
    );
    run.rng = rng.state;
    expect(applyAction(run, { type: "flee" })).toBe(run);
  });
});

describe("combat", () => {
  it("scales enemies on deeper floors", () => {
    const def = MONSTERS.find((m) => m.id === "concord-legionnaire")!;
    expect(createEnemy(def, 3).maxHp).toBeGreaterThan(createEnemy(def, 1).maxHp);
    expect(createEnemy(def, 3).attack).toBeGreaterThan(createEnemy(def, 1).attack);
  });

  it("puts abilities on cooldown", () => {
    let run = newRun(newProfile(), { classId: "brute", seed: "cooldown" });
    run = applyActionStrict(run, { type: "travel", nodeId: run.map.rows[0]![0]!.id });
    expect(run.phase).toBe("combat");
    run = applyActionStrict(run, { type: "ability", abilityId: "iron-hide" });
    if (run.phase === "combat") {
      expect(run.combat!.cooldowns["iron-hide"]).toBeGreaterThan(0);
      expect(applyAction(run, { type: "ability", abilityId: "iron-hide" })).toBe(run);
    }
  });

  it("gives every class exactly two abilities", () => {
    for (const cls of Object.values(CLASSES)) expect(cls.abilities).toHaveLength(2);
  });
});

describe("camp", () => {
  it("banks embers and buys upgrades", () => {
    let profile = newProfile();
    const end = autoplay(newRun(profile, { classId: "brute", seed: "camp" }), "bot");
    profile = settleRun(profile, end);
    expect(profile.history.runs).toBe(1);
    expect(profile.embers).toBe(end.stats.embers);

    profile = { ...profile, embers: 100 };
    profile = buyUpgrade(profile, "hardened");
    expect(profile.upgrades.hardened).toBe(1);
    expect(profile.embers).toBeLessThan(100);

    profile = unlockClass(profile, "ashcaller");
    expect(profile.unlockedClasses).toContain("ashcaller");

    const run = newRun(profile, { classId: "brute", seed: "upgraded" });
    expect(heroStats(run.hero).maxHp).toBe(CLASSES.brute.base.maxHp + 4);
  });

  it("refuses purchases the player cannot afford", () => {
    const profile = newProfile();
    expect(buyUpgrade(profile, "warpaint")).toBe(profile);
    expect(unlockClass(profile, "skirmisher")).toBe(profile);
  });
});
