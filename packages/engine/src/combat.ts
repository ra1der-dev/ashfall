import { CLASSES, VICTORY_SHOUTS } from "./data/classes";
import { monsterDef } from "./data/monsters";
import { healHero, heroStats, levelForXp, maxHp } from "./hero";
import { rollItem } from "./loot";
import type { Rng } from "./rng";
import type { Enemy, MonsterDef, MonsterMove, RunState, Status, StatusId } from "./types";

export const POTION_HEAL = 15;
export const BURN_DAMAGE = 3;
export const BLEED_DAMAGE = 2;
export const ENRAGE_DAMAGE = 2;

export class InvalidAction extends Error {}

// ---------- statuses ----------

export function getStatus(list: Status[], id: StatusId): number {
  return list.find((s) => s.id === id)?.amount ?? 0;
}

export function addStatus(list: Status[], id: StatusId, amount: number): void {
  const existing = list.find((s) => s.id === id);
  if (!existing) list.push({ id, amount });
  else if (id === "shield")
    existing.amount += amount; // shields stack
  else existing.amount = Math.max(existing.amount, amount); // durations refresh
}

function consumeStatus(list: Status[], id: StatusId, by = 1): void {
  const existing = list.find((s) => s.id === id);
  if (!existing) return;
  existing.amount -= by;
  if (existing.amount <= 0) list.splice(list.indexOf(existing), 1);
}

function clearStatus(list: Status[], id: StatusId): void {
  const index = list.findIndex((s) => s.id === id);
  if (index >= 0) list.splice(index, 1);
}

/** Shields soak damage first. Returns the damage that got through. */
function absorb(list: Status[], damage: number): number {
  const shield = getStatus(list, "shield");
  if (shield <= 0) return damage;
  const soaked = Math.min(shield, damage);
  consumeStatus(list, "shield", soaked);
  return damage - soaked;
}

// ---------- setup ----------

export function createEnemy(def: MonsterDef, floor: number): Enemy {
  const depth = Math.max(0, floor - def.floors[0]!);
  const maxHpValue = Math.round(def.hp * (1 + 0.3 * depth));
  return {
    defId: def.id,
    name: def.name,
    rank: def.rank,
    hp: maxHpValue,
    maxHp: maxHpValue,
    ac: def.ac + Math.floor(depth / 2),
    attack: def.attack + depth,
    damage: { ...def.damage, bonus: (def.damage.bonus ?? 0) + depth },
    xp: Math.round(def.xp * (1 + 0.25 * depth)),
    gold: [def.gold[0] + depth * 3, def.gold[1] + depth * 5],
    statuses: [],
    intent: 0,
    enraged: false,
  };
}

function chooseIntent(rng: Rng, enemy: Enemy): number {
  const def = monsterDef(enemy.defId);
  const usable = def.moves
    .map((move, index) => ({ move, index, weight: move.weight }))
    .filter(({ move }) => !(move.kind === "heal" && enemy.hp > enemy.maxHp * 0.6))
    .filter(({ move }) => !(move.kind === "guard" && getStatus(enemy.statuses, "shield") > 0));
  return rng.weighted(usable).index;
}

export function currentIntent(enemy: Enemy): MonsterMove {
  return monsterDef(enemy.defId).moves[enemy.intent]!;
}

export function startCombat(run: RunState, rng: Rng, def: MonsterDef): void {
  const enemy = createEnemy(def, run.floor);
  enemy.intent = chooseIntent(rng, enemy);
  run.combat = { enemy, heroStatuses: [], cooldowns: {}, turn: 1, canFlee: def.rank !== "boss" };
  run.phase = "combat";
  run.log.push(rng.pick(def.taunts));
}

// ---------- hero actions ----------

interface AttackOptions {
  hitBonus?: number;
  mult?: number;
  autoHit?: boolean;
  label?: string;
}

function damageEnemy(run: RunState, amount: number): number {
  const combat = run.combat!;
  const dealt = absorb(combat.enemy.statuses, amount);
  combat.enemy.hp -= dealt;
  return dealt;
}

/** One weapon attack. Returns true on a hit. */
function heroAttack(run: RunState, rng: Rng, opts: AttackOptions = {}): boolean {
  const combat = run.combat!;
  const enemy = combat.enemy;
  const stats = heroStats(run.hero);
  const label = opts.label ?? "You swing";
  const roll = rng.die(20);
  const total = roll + stats.attack + (opts.hitBonus ?? 0);
  const crit = roll >= stats.critMin;

  if (roll === 1 && !opts.autoHit) {
    run.log.push(`${label}... natural 1. You stumble and miss.`);
    return false;
  }
  if (!crit && !opts.autoHit && total < enemy.ac) {
    run.log.push(`${label}: ${roll} + ${stats.attack + (opts.hitBonus ?? 0)} = ${total} vs AC ${enemy.ac}. Miss.`);
    return false;
  }

  let damage = rng.roll(stats.damage) + (crit ? rng.roll(stats.damage) : 0) + stats.power;
  damage = Math.max(1, Math.round(damage * (opts.mult ?? 1)));
  const dealt = damageEnemy(run, damage);
  const blocked = damage - dealt;
  run.log.push(
    `${label}: ${crit ? `CRITICAL (natural ${roll})!` : `${roll} + ${total - roll} = ${total} vs AC ${enemy.ac}. Hit!`} ${dealt} damage${blocked ? ` (${blocked} absorbed)` : ""}.`,
  );

  applyOnHit(run, rng, crit);
  return true;
}

function applyOnHit(run: RunState, rng: Rng, crit: boolean): void {
  const combat = run.combat!;
  const enemy = combat.enemy;
  const effects = heroStats(run.hero).effects;
  if (run.hero.classId === "ashcaller" && getStatus(enemy.statuses, "burn") > 0) {
    enemy.statuses.find((s) => s.id === "burn")!.amount += 1;
  }
  if (effects.includes("lifesteal")) {
    const healed = healHero(run.hero, 2);
    if (healed) run.log.push(`You drain ${healed} HP.`);
  }
  if (effects.includes("bleedOnHit") && rng.chance(0.25)) {
    addStatus(enemy.statuses, "bleed", 2);
    run.log.push(`The ${enemy.name} is bleeding.`);
  }
  if (crit && effects.includes("burnOnCrit")) {
    addStatus(enemy.statuses, "burn", 2);
    run.log.push(`The ${enemy.name} catches fire!`);
  }
  if (crit && effects.includes("stunOnCrit")) {
    addStatus(enemy.statuses, "stun", 1);
    run.log.push(`The ${enemy.name} is stunned!`);
  }
}

function useAbility(run: RunState, rng: Rng, abilityId: string): void {
  const combat = run.combat!;
  const ability = CLASSES[run.hero.classId].abilities.find((a) => a.id === abilityId);
  if (!ability) throw new InvalidAction(`Your class has no ability ${abilityId}`);
  if ((combat.cooldowns[abilityId] ?? 0) > 0) throw new InvalidAction(`${ability.name} is on cooldown`);
  combat.cooldowns[abilityId] = ability.cooldown;
  const stats = heroStats(run.hero);
  const enemy = combat.enemy;

  switch (abilityId) {
    case "crushing-blow":
      if (heroAttack(run, rng, { hitBonus: 2, mult: 1.5, label: "Crushing Blow" })) {
        addStatus(enemy.statuses, "stun", 1);
        run.log.push(`The ${enemy.name} reels, stunned.`);
      }
      break;
    case "iron-hide": {
      const amount = 6 + stats.power;
      addStatus(combat.heroStatuses, "shield", amount);
      run.log.push(`Iron Hide: you brace behind ${amount} points of shield.`);
      break;
    }
    case "ember-bolt": {
      const damage = rng.roll({ count: 2, sides: 6 }) + stats.power;
      const dealt = damageEnemy(run, damage);
      addStatus(enemy.statuses, "burn", 2);
      run.log.push(`Ember Bolt scorches the ${enemy.name} for ${dealt} damage and sets it burning.`);
      break;
    }
    case "mending-ash": {
      const healed = healHero(run.hero, rng.roll({ count: 2, sides: 6, bonus: 2 }) + stats.power);
      run.log.push(`Mending Ash knits your wounds: +${healed} HP.`);
      break;
    }
    case "twin-strike":
      heroAttack(run, rng, { label: "Twin Strike (1)" });
      if (enemy.hp > 0) heroAttack(run, rng, { label: "Twin Strike (2)" });
      break;
    case "smoke-step":
      addStatus(combat.heroStatuses, "evade", 1);
      for (const id of Object.keys(combat.cooldowns)) {
        if (id !== abilityId) combat.cooldowns[id] = Math.max(0, combat.cooldowns[id]! - 1);
      }
      run.log.push("Smoke Step: you vanish into a cloud of ash.");
      break;
    default:
      throw new InvalidAction(`Unknown ability ${abilityId}`);
  }
}

export type CombatAction = "attack" | "defend" | "potion" | "flee" | { ability: string };

export function heroTurn(run: RunState, rng: Rng, action: CombatAction): void {
  const combat = run.combat;
  if (run.phase !== "combat" || !combat) throw new InvalidAction("Not in combat");

  if (action === "flee" && !combat.canFlee) throw new InvalidAction("You cannot flee from a boss");
  if (action === "potion" && run.hero.potions <= 0) throw new InvalidAction("No potions left");
  if (typeof action === "object") {
    const ready = (combat.cooldowns[action.ability] ?? 0) <= 0;
    if (!ready) throw new InvalidAction("Ability on cooldown");
  }

  if (getStatus(combat.heroStatuses, "stun") > 0) {
    clearStatus(combat.heroStatuses, "stun");
    run.log.push("You are stunned and lose your turn!");
  } else if (action === "attack") {
    heroAttack(run, rng);
  } else if (action === "defend") {
    addStatus(combat.heroStatuses, "guard", 1);
    for (const id of Object.keys(combat.cooldowns)) combat.cooldowns[id] = Math.max(0, combat.cooldowns[id]! - 1);
    run.log.push("You raise your guard. (+2 AC, half damage this round, cooldowns -1)");
  } else if (action === "potion") {
    run.hero.potions -= 1;
    const healed = healHero(run.hero, POTION_HEAL);
    run.log.push(`You drink a potion: +${healed} HP.`);
  } else if (action === "flee") {
    const stats = heroStats(run.hero);
    const roll = rng.die(20);
    const need = combat.enemy.rank === "elite" ? 14 : 10;
    const total = roll + Math.floor(stats.attack / 2);
    if (total >= need) {
      run.log.push(`You flee (${total} vs ${need}) and slip away from the ${combat.enemy.name}.`);
      run.combat = undefined;
      run.phase = "map";
      return;
    }
    run.log.push(`You try to flee (${total} vs ${need}) but the ${combat.enemy.name} cuts you off!`);
  } else {
    useAbility(run, rng, action.ability);
  }

  checkEnrage(run);
  if (combat.enemy.hp <= 0) return victory(run, rng);

  enemyTurn(run, rng);
  if (run.phase !== "combat") return;

  endRound(run);
}

function checkEnrage(run: RunState): void {
  const enemy = run.combat!.enemy;
  const def = monsterDef(enemy.defId);
  if (!enemy.enraged && def.enrageAt && enemy.hp > 0 && enemy.hp <= enemy.maxHp * def.enrageAt) {
    enemy.enraged = true;
    run.log.push(`The ${enemy.name} becomes ENRAGED! (+${ENRAGE_DAMAGE} damage)`);
  }
}

// ---------- enemy turn ----------

function damageHero(run: RunState, amount: number): number {
  const combat = run.combat!;
  let damage = amount;
  if (getStatus(combat.heroStatuses, "guard") > 0) damage = Math.floor(damage / 2);
  damage = absorb(combat.heroStatuses, damage);
  run.hero.hp -= damage;
  return damage;
}

function enemyTurn(run: RunState, rng: Rng): void {
  const combat = run.combat!;
  const enemy = combat.enemy;

  // Damage over time ticks at the start of the enemy's turn.
  for (const [id, per] of [
    ["burn", BURN_DAMAGE],
    ["bleed", BLEED_DAMAGE],
  ] as const) {
    if (getStatus(enemy.statuses, id) > 0) {
      enemy.hp -= per;
      consumeStatus(enemy.statuses, id);
      run.log.push(`The ${enemy.name} takes ${per} ${id} damage.`);
    }
  }
  if (enemy.hp <= 0) return victory(run, rng);
  checkEnrage(run);

  if (getStatus(enemy.statuses, "stun") > 0) {
    clearStatus(enemy.statuses, "stun");
    run.log.push(`The ${enemy.name} is stunned and cannot act.`);
    enemy.intent = chooseIntent(rng, enemy);
    return;
  }

  const move = currentIntent(enemy);
  if (move.kind === "guard") {
    addStatus(enemy.statuses, "shield", move.shield + (run.floor - 1) * 2);
    run.log.push(`The ${enemy.name} uses ${move.name} and gains a shield.`);
  } else if (move.kind === "heal") {
    const amount = Math.min(enemy.maxHp - enemy.hp, move.amount + (run.floor - 1) * 3);
    enemy.hp += amount;
    run.log.push(`The ${enemy.name} uses ${move.name} and heals ${amount} HP.`);
  } else {
    enemyAttack(run, rng, move);
  }

  enemy.intent = chooseIntent(rng, enemy);
  if (run.hero.hp <= 0) defeat(run);
}

function enemyAttack(run: RunState, rng: Rng, move: Extract<MonsterMove, { kind: "attack" }>): void {
  const combat = run.combat!;
  const enemy = combat.enemy;
  if (getStatus(combat.heroStatuses, "evade") > 0) {
    clearStatus(combat.heroStatuses, "evade");
    run.log.push(`The ${enemy.name}'s ${move.name} strikes only smoke.`);
    return;
  }
  const stats = heroStats(run.hero);
  const ac = stats.ac + (getStatus(combat.heroStatuses, "guard") > 0 ? 2 : 0);
  const roll = rng.die(20);
  const total = roll + enemy.attack + (move.hitMod ?? 0);
  const crit = roll === 20;
  if (roll === 1 || (!crit && total < ac)) {
    run.log.push(`The ${enemy.name}'s ${move.name} misses (${total} vs AC ${ac}).`);
    return;
  }
  let damage = rng.roll(enemy.damage) + (crit ? rng.roll({ ...enemy.damage, bonus: 0 }) : 0);
  damage = Math.max(1, Math.round(damage * (move.mult ?? 1))) + (enemy.enraged ? ENRAGE_DAMAGE : 0);
  const taken = damageHero(run, damage);
  run.log.push(`The ${enemy.name}'s ${move.name} ${crit ? "CRITS" : "hits"} you for ${taken} damage.`);
  if (move.status && rng.chance(move.statusChance ?? 1)) {
    addStatus(combat.heroStatuses, move.status, move.statusAmount ?? 1);
    const verb: Record<string, string> = {
      burn: "You are burning!",
      bleed: "You are bleeding!",
      stun: "You are stunned!",
    };
    run.log.push(verb[move.status] ?? `You are afflicted with ${move.status}.`);
  }
}

function endRound(run: RunState): void {
  const combat = run.combat!;
  for (const [id, per] of [
    ["burn", BURN_DAMAGE],
    ["bleed", BLEED_DAMAGE],
  ] as const) {
    if (getStatus(combat.heroStatuses, id) > 0) {
      run.hero.hp -= per;
      consumeStatus(combat.heroStatuses, id);
      run.log.push(`You take ${per} ${id} damage.`);
    }
  }
  clearStatus(combat.heroStatuses, "guard");
  for (const id of Object.keys(combat.cooldowns)) combat.cooldowns[id] = Math.max(0, combat.cooldowns[id]! - 1);
  combat.turn += 1;
  if (run.hero.hp <= 0) defeat(run);
}

// ---------- outcomes ----------

export function gainXp(run: RunState, amount: number): void {
  const hero = run.hero;
  hero.xp += amount;
  const level = levelForXp(hero.xp);
  if (level > hero.level) {
    const gained = level - hero.level;
    hero.level = level;
    hero.hp = Math.min(maxHp(hero), hero.hp + gained * 4);
    run.log.push(`LEVEL UP! You are now level ${level}.`);
  }
}

function newId(run: RunState): string {
  run.nextId += 1;
  return `i${run.nextId}`;
}

function victory(run: RunState, rng: Rng): void {
  const enemy = run.combat!.enemy;
  const rank = enemy.rank;
  const gold = Math.round(rng.int(enemy.gold[0], enemy.gold[1]) * run.goldMult);
  run.log.push(`${rng.pick(VICTORY_SHOUTS)} The ${enemy.name} falls.`);

  run.hero.gold += gold;
  run.stats.goldEarned += gold;
  gainXp(run, enemy.xp);

  const source = rank === "boss" ? "boss" : rank === "elite" ? "elite" : "fight";
  const itemCount = rank === "boss" ? 3 : rank === "elite" ? 2 : rng.chance(0.5) ? 1 : 0;
  const items = [];
  for (let i = 0; i < itemCount; i++) items.push(rollItem(rng, newId(run), source, run.floor));
  const potionChance = rank === "normal" ? 0.2 : 0.6;
  const potions = rng.chance(potionChance) ? 1 : 0;
  run.hero.potions += potions;

  if (rank === "boss") {
    run.stats.bosses += 1;
    run.stats.embers += 10;
  } else if (rank === "elite") {
    run.stats.elites += 1;
    run.stats.embers += 3;
  } else {
    run.stats.embers += 1;
  }
  run.stats.kills += 1;

  run.reward = { gold, xp: enemy.xp, items, potions, itemTaken: items.length === 0, source };
  run.combat = undefined;
  run.phase = "reward";
}

function defeat(run: RunState): void {
  run.hero.hp = 0;
  run.log.push(`You fall. The ${run.combat?.enemy.name ?? "dungeon"} stands over your body as the embers dim.`);
  run.phase = "defeat";
}
