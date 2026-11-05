import { BOONS } from "./data/boons";
import { CLASSES, HERO_NAMES } from "./data/classes";
import { MONSTERS, ROOM_LINES } from "./data/monsters";
import { InvalidAction, POTION_HEAL, gainXp, heroTurn, startCombat } from "./combat";
import { healHero, maxHp } from "./hero";
import { buyPrice, makeItem, rollItem, sellValue } from "./loot";
import { MAP_ROWS, findNode, generateFloor, reachableNodes } from "./map";
import { Rng, hashSeed } from "./rng";
import type { Action, ClassId, Hero, Item, Profile, RunState } from "./types";

export const FLOORS = 3;
export const BAG_SIZE = 8;
export const REST_HEAL_FRACTION = 0.4;
export const FLOOR_CLEAR_HEAL = 0.3;
export const RUN_VICTORY_EMBERS = 15;
const LOG_LIMIT = 200;

export interface NewRunOptions {
  classId: ClassId;
  name?: string;
  seed?: string;
  daily?: boolean;
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function dailySeed(date = new Date()): string {
  return `daily-${date.toISOString().slice(0, 10)}`;
}

export function newRun(profile: Profile, options: NewRunOptions): RunState {
  const seed = options.seed ?? randomSeed();
  const rng = new Rng(hashSeed(seed));
  const cls = CLASSES[options.classId];
  const up = (id: string) => profile.upgrades[id] ?? 0;

  const hero: Hero = {
    name: options.name?.trim() || rng.pick(HERO_NAMES),
    classId: cls.id,
    hp: 0,
    level: 1,
    xp: 0,
    gold: up("war-chest") * 25,
    potions: 1 + up("provisions"),
    base: { ...cls.base, maxHp: cls.base.maxHp + up("hardened") * 4, attack: cls.base.attack + up("warpaint") },
    equipment: {},
    bag: [],
    boons: [],
  };
  hero.equipment.weapon = makeItem(rng, "i1", "weapon", up("ember-forge") ? "Forged" : "Scrap", cls.starterWeapon);
  hero.equipment.armor = makeItem(rng, "i2", "armor", "Scrap");
  hero.hp = maxHp(hero);

  return {
    version: 1,
    seed,
    daily: options.daily ?? false,
    rng: rng.state,
    hero,
    floor: 1,
    map: generateFloor(rng, 1),
    position: null,
    visited: [],
    phase: "map",
    log: [`${hero.name} the ${cls.name} descends into the Concord's dungeon.`],
    stats: { kills: 0, elites: 0, bosses: 0, goldEarned: 0, floorsCleared: 0, embers: 0 },
    goldMult: 1 + up("plunder") * 0.15,
    nextId: 2,
  };
}

function newId(run: RunState): string {
  run.nextId += 1;
  return `i${run.nextId}`;
}

// ---------- rooms ----------

function enterRoom(run: RunState, rng: Rng, nodeId: string): void {
  const node = findNode(run.map, nodeId)!;
  run.position = nodeId;
  run.visited.push(nodeId);
  run.log.push(
    `— Floor ${run.floor}, room ${node.row + 1}: ${node.type === "boss" ? "the boss chamber" : node.type} —`,
  );

  switch (node.type) {
    case "fight":
    case "elite":
    case "boss": {
      const rank = node.type === "fight" ? "normal" : node.type;
      const pool = MONSTERS.filter((m) => m.rank === rank && m.floors.includes(run.floor));
      run.log.push(rng.pick(ROOM_LINES));
      startCombat(run, rng, rng.pick(pool));
      break;
    }
    case "merchant": {
      const items = [];
      for (let i = 0; i < 4; i++) {
        const item = rollItem(rng, newId(run), "merchant", run.floor);
        items.push({ item, price: buyPrice(item), sold: false });
      }
      run.merchant = { items, potionPrice: 15 + run.floor * 5 };
      run.phase = "merchant";
      run.log.push("A hooded peddler unrolls a blanket of wares. 'Coin first, ashling.'");
      break;
    }
    case "rest":
      run.phase = "rest";
      run.log.push("You find a sheltered nook and light a small fire.");
      break;
    case "treasure": {
      const gold = rng.int(10, 25) * run.floor;
      const items = [rollItem(rng, newId(run), "treasure", run.floor)];
      const potions = rng.chance(0.3) ? 1 : 0;
      run.hero.gold += gold;
      run.hero.potions += potions;
      run.stats.goldEarned += gold;
      run.reward = { gold, xp: 0, items, potions, itemTaken: false, source: "treasure" };
      run.phase = "reward";
      run.log.push("A forgotten Concord strongbox. The lock gives way to a good kick.");
      break;
    }
    case "shrine":
      run.shrine = rng.shuffle(BOONS).slice(0, 3);
      run.phase = "shrine";
      run.log.push("An old clan shrine, half-buried in ash. The embers stir as you approach.");
      break;
  }
}

function finishRoom(run: RunState, rng: Rng): void {
  const node = run.position ? findNode(run.map, run.position) : undefined;
  run.reward = undefined;
  run.merchant = undefined;
  run.shrine = undefined;
  if (node?.type !== "boss") {
    run.phase = "map";
    return;
  }
  run.stats.floorsCleared = run.floor;
  if (run.floor >= FLOORS) {
    run.stats.embers += RUN_VICTORY_EMBERS;
    run.phase = "victory";
    run.log.push("The High Marshal falls. The Gilded Concord's grip on the deep halls is broken. The Clans endure!");
    return;
  }
  run.floor += 1;
  run.map = generateFloor(rng, run.floor);
  run.position = null;
  run.visited = [];
  run.phase = "map";
  const healed = healHero(run.hero, Math.round(maxHp(run.hero) * FLOOR_CLEAR_HEAL));
  run.log.push(`You descend to floor ${run.floor}. The climb down lets you catch your breath (+${healed} HP).`);
}

// ---------- inventory ----------

function addToBag(run: RunState, item: Item): void {
  if (run.hero.bag.length >= BAG_SIZE) throw new InvalidAction("Your bag is full");
  run.hero.bag.push(item);
}

function equip(run: RunState, bagIndex: number): void {
  const hero = run.hero;
  const item = hero.bag[bagIndex];
  if (!item) throw new InvalidAction("No such item");
  hero.bag.splice(bagIndex, 1);
  const old = hero.equipment[item.slot];
  hero.equipment[item.slot] = item;
  if (old) hero.bag.push(old);
  hero.hp = Math.min(hero.hp, maxHp(hero));
  run.log.push(`You equip ${item.name}.`);
}

const INVENTORY_PHASES = new Set(["map", "reward", "merchant", "rest", "shrine"]);

// ---------- reducer ----------

function apply(run: RunState, rng: Rng, action: Action): void {
  const { hero } = run;
  switch (action.type) {
    case "travel": {
      if (run.phase !== "map") throw new InvalidAction("You can only travel from the map");
      if (!reachableNodes(run.map, run.position).some((n) => n.id === action.nodeId)) {
        throw new InvalidAction("That room is not connected to this one");
      }
      enterRoom(run, rng, action.nodeId);
      return;
    }
    case "attack":
    case "defend":
    case "potion":
    case "flee":
      if (action.type === "potion" && run.phase !== "combat") {
        if (!INVENTORY_PHASES.has(run.phase)) throw new InvalidAction("Not now");
        if (hero.potions <= 0) throw new InvalidAction("No potions left");
        if (hero.hp >= maxHp(hero)) throw new InvalidAction("Already at full health");
        hero.potions -= 1;
        run.log.push(`You drink a potion: +${healHero(hero, POTION_HEAL)} HP.`);
        return;
      }
      heroTurn(run, rng, action.type);
      return;
    case "ability":
      heroTurn(run, rng, { ability: action.abilityId });
      return;
    case "takeItem": {
      const reward = run.reward;
      if (run.phase !== "reward" || !reward || reward.itemTaken) throw new InvalidAction("Nothing to take");
      const item = reward.items[action.index];
      if (!item) throw new InvalidAction("No such item");
      addToBag(run, item);
      reward.itemTaken = true;
      run.log.push(`You take ${item.name}.`);
      return;
    }
    case "skipItem":
      if (run.phase !== "reward" || !run.reward) throw new InvalidAction("Nothing to skip");
      run.reward.itemTaken = true;
      return;
    case "continue":
      if (run.phase !== "reward" && run.phase !== "merchant" && run.phase !== "shrine") {
        throw new InvalidAction("Nothing to continue from");
      }
      finishRoom(run, rng);
      return;
    case "equip":
      if (!INVENTORY_PHASES.has(run.phase)) throw new InvalidAction("Not during combat");
      equip(run, action.bagIndex);
      return;
    case "discard": {
      if (!INVENTORY_PHASES.has(run.phase)) throw new InvalidAction("Not during combat");
      const [item] = hero.bag.splice(action.bagIndex, 1);
      if (!item) throw new InvalidAction("No such item");
      run.log.push(`You leave ${item.name} behind.`);
      return;
    }
    case "buy": {
      const offer = run.merchant?.items[action.index];
      if (run.phase !== "merchant" || !offer || offer.sold) throw new InvalidAction("Not for sale");
      if (hero.gold < offer.price) throw new InvalidAction("Not enough gold");
      addToBag(run, offer.item);
      hero.gold -= offer.price;
      offer.sold = true;
      run.log.push(`You buy ${offer.item.name} for ${offer.price} gold.`);
      return;
    }
    case "buyPotion": {
      const merchant = run.merchant;
      if (run.phase !== "merchant" || !merchant) throw new InvalidAction("No merchant here");
      if (hero.gold < merchant.potionPrice) throw new InvalidAction("Not enough gold");
      hero.gold -= merchant.potionPrice;
      hero.potions += 1;
      run.log.push(`You buy a potion for ${merchant.potionPrice} gold.`);
      return;
    }
    case "sell": {
      if (run.phase !== "merchant") throw new InvalidAction("No merchant here");
      const [item] = hero.bag.splice(action.bagIndex, 1);
      if (!item) throw new InvalidAction("No such item");
      hero.gold += sellValue(item);
      run.log.push(`You sell ${item.name} for ${sellValue(item)} gold.`);
      return;
    }
    case "rest": {
      if (run.phase !== "rest") throw new InvalidAction("Nowhere to rest");
      if (action.choice === "heal") {
        const healed = healHero(hero, Math.round(maxHp(hero) * REST_HEAL_FRACTION));
        run.log.push(`You sleep by the fire: +${healed} HP.`);
      } else {
        hero.boons.push({ name: "Fireside Drills", mods: { attack: 1 } });
        gainXp(run, 10);
        run.log.push("You drill until your arms burn: +1 attack, +10 XP.");
      }
      finishRoom(run, rng);
      return;
    }
    case "shrine": {
      const boon = run.shrine?.[action.index];
      if (run.phase !== "shrine" || !boon) throw new InvalidAction("No such offering");
      if (boon.goldCost && hero.gold < boon.goldCost) throw new InvalidAction("Not enough gold");
      if (boon.hpCost && hero.hp <= boon.hpCost) throw new InvalidAction("That would kill you");
      hero.gold -= boon.goldCost ?? 0;
      hero.hp -= boon.hpCost ?? 0;
      hero.boons.push({ name: boon.name, mods: boon.mods, effects: boon.effects });
      if (boon.mods.maxHp) hero.hp += boon.mods.maxHp;
      run.log.push(`The shrine grants you ${boon.name}: ${boon.text}`);
      finishRoom(run, rng);
      return;
    }
    case "abandon":
      if (run.phase === "victory" || run.phase === "defeat") throw new InvalidAction("Run already over");
      run.phase = "defeat";
      run.log.push("You turn back toward the surface. The run is over.");
      return;
  }
}

/** Applies an action and returns the new state. Throws InvalidAction on illegal moves. */
export function applyActionStrict(run: RunState, action: Action): RunState {
  const next = structuredClone(run);
  const rng = new Rng(next.rng);
  apply(next, rng, action);
  next.rng = rng.state;
  if (next.log.length > LOG_LIMIT) next.log = next.log.slice(-LOG_LIMIT);
  return next;
}

/** Like applyActionStrict, but an illegal move returns the run unchanged. */
export function applyAction(run: RunState, action: Action): RunState {
  try {
    return applyActionStrict(run, action);
  } catch (error) {
    if (error instanceof InvalidAction) return run;
    throw error;
  }
}

/** Every action that is legal right now. Used by tests, bots, and handy for UI. */
export function legalActions(run: RunState): Action[] {
  const candidates: Action[] = [];
  const { hero } = run;
  switch (run.phase) {
    case "map":
      for (const node of reachableNodes(run.map, run.position)) candidates.push({ type: "travel", nodeId: node.id });
      break;
    case "combat":
      candidates.push({ type: "attack" }, { type: "defend" }, { type: "potion" }, { type: "flee" });
      for (const ability of CLASSES[hero.classId].abilities)
        candidates.push({ type: "ability", abilityId: ability.id });
      break;
    case "reward":
      run.reward?.items.forEach((_, index) => candidates.push({ type: "takeItem", index }));
      candidates.push({ type: "skipItem" }, { type: "continue" });
      break;
    case "merchant":
      run.merchant?.items.forEach((_, index) => candidates.push({ type: "buy", index }));
      hero.bag.forEach((_, bagIndex) => candidates.push({ type: "sell", bagIndex }));
      candidates.push({ type: "buyPotion" }, { type: "continue" });
      break;
    case "rest":
      candidates.push({ type: "rest", choice: "heal" }, { type: "rest", choice: "train" });
      break;
    case "shrine":
      run.shrine?.forEach((_, index) => candidates.push({ type: "shrine", index }));
      candidates.push({ type: "continue" });
      break;
    default:
      return [];
  }
  if (INVENTORY_PHASES.has(run.phase)) {
    hero.bag.forEach((_, bagIndex) => candidates.push({ type: "equip", bagIndex }));
  }
  return candidates.filter((action) => applyAction(run, action) !== run);
}

export function isRunOver(run: RunState): boolean {
  return run.phase === "victory" || run.phase === "defeat";
}

export { MAP_ROWS };
