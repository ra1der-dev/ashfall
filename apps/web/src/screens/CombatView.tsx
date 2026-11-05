import {
  CLASSES,
  ENRAGE_DAMAGE,
  currentIntent,
  getStatus,
  monsterDef,
  type Action,
  type MonsterMove,
  type RunState,
} from "@ashfall/engine";
import { useEffect, useRef, useState } from "react";
import { Bar, Button, Panel, StatusChips, cx } from "../components/ui";

const RANK_STYLE = {
  normal: "",
  elite: "border-violet-600/60",
  boss: "border-ember-500/70 shadow-[0_0_30px_rgb(240_106_29/0.25)]",
} as const;

function describeIntent(run: RunState, move: MonsterMove): { title: string; detail: string; danger: boolean } {
  const enemy = run.combat!.enemy;
  if (move.kind === "guard") return { title: `🛡️ ${move.name}`, detail: "Will raise a shield.", danger: false };
  if (move.kind === "heal") return { title: `✚ ${move.name}`, detail: "Will heal itself.", danger: false };
  const mult = move.mult ?? 1;
  const bonus = enemy.damage.bonus ?? 0;
  const extra = enemy.enraged ? ENRAGE_DAMAGE : 0;
  const lo = Math.max(1, Math.round((enemy.damage.count + bonus) * mult)) + extra;
  const hi = Math.max(1, Math.round((enemy.damage.count * enemy.damage.sides + bonus) * mult)) + extra;
  const parts = [`${lo}–${hi} damage`];
  if (move.hitMod) parts.push(`${move.hitMod > 0 ? "+" : ""}${move.hitMod} to hit`);
  if (move.status) parts.push(`may ${move.status}`);
  return { title: `⚔️ ${move.name}`, detail: parts.join(" · "), danger: mult >= 1.5 };
}

export function CombatView({ run, act }: { run: RunState; act: (a: Action) => void }) {
  const combat = run.combat!;
  const { enemy } = combat;
  const def = monsterDef(enemy.defId);
  const intent = describeIntent(run, currentIntent(enemy));
  const abilities = CLASSES[run.hero.classId].abilities;
  const stunned = getStatus(combat.heroStatuses, "stun") > 0;

  // Flash the enemy card when it loses HP.
  const [flash, setFlash] = useState(0);
  const lastHp = useRef(enemy.hp);
  useEffect(() => {
    if (enemy.hp < lastHp.current) setFlash((f) => f + 1);
    lastHp.current = enemy.hp;
  }, [enemy.hp]);

  return (
    <div className="flex flex-col gap-4">
      <Panel className={cx("relative", RANK_STYLE[enemy.rank])}>
        <div key={flash} className={cx("-m-4 rounded-xl p-4", flash > 0 && "hit-flash")} data-testid="enemy">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] tracking-widest text-ash-400 uppercase">
                {enemy.rank === "normal" ? "Foe" : enemy.rank} · Turn {combat.turn}
              </div>
              <h2 className="font-display text-2xl text-ash-100">{enemy.name}</h2>
            </div>
            <div className="flex flex-col items-end gap-1 text-sm">
              <span
                className="rounded bg-ash-800 px-2 py-0.5 tabular-nums"
                title="Armor class: your attack roll must meet this"
              >
                AC {enemy.ac}
              </span>
              {enemy.enraged && (
                <span className="rounded bg-red-900/70 px-2 py-0.5 text-xs font-semibold text-red-100">ENRAGED</span>
              )}
            </div>
          </div>
          <div className="mt-3">
            <Bar
              label="HP"
              value={enemy.hp}
              max={enemy.maxHp}
              color={enemy.rank === "boss" ? "bg-ember-500" : "bg-red-500"}
            />
          </div>
          <div className="mt-2 min-h-6">
            <StatusChips statuses={enemy.statuses} />
          </div>
          <div
            className={cx(
              "mt-3 rounded-lg border px-3 py-2",
              intent.danger ? "border-red-700 bg-red-950/40" : "border-ash-700 bg-ash-850",
            )}
            data-testid="intent"
          >
            <div className="text-[10px] tracking-widest text-ash-400 uppercase">Intends</div>
            <div className="font-semibold">{intent.title}</div>
            <div className="text-xs text-ash-300">{intent.detail}</div>
          </div>
          {def.enrageAt && !enemy.enraged && (
            <p className="mt-2 text-xs text-ash-400">Enrages below {Math.round(def.enrageAt * 100)}% HP.</p>
          )}
        </div>
      </Panel>

      <Panel title={stunned ? "You are stunned — any action passes your turn" : "Your move"}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button variant="primary" className="py-3" onClick={() => act({ type: "attack" })}>
            ⚔️ Attack
          </Button>
          <Button
            className="py-3"
            onClick={() => act({ type: "defend" })}
            title="+2 AC and half damage this round. Cooldowns tick an extra turn."
          >
            🛡️ Defend
          </Button>
          {abilities.map((ability) => {
            const cd = combat.cooldowns[ability.id] ?? 0;
            return (
              <Button
                key={ability.id}
                className="py-3"
                disabled={cd > 0}
                title={ability.text}
                onClick={() => act({ type: "ability", abilityId: ability.id })}
              >
                ✦ {ability.name}
                {cd > 0 && <span className="ml-1 text-xs text-ash-400">({cd})</span>}
              </Button>
            );
          })}
          <Button
            className="py-3"
            disabled={run.hero.potions === 0}
            onClick={() => act({ type: "potion" })}
            title="Heal 15 HP. Uses your turn."
          >
            🧪 Potion ({run.hero.potions})
          </Button>
          <Button
            variant="ghost"
            className="py-3"
            disabled={!combat.canFlee}
            onClick={() => act({ type: "flee" })}
            title={combat.canFlee ? "Roll to escape. Failing costs you the turn." : "You cannot flee a boss."}
          >
            🏃 Flee
          </Button>
        </div>
        <ul className="mt-3 grid gap-1 text-xs text-ash-400 sm:grid-cols-2">
          {abilities.map((a) => (
            <li key={a.id}>
              <span className="text-ash-300">{a.name}</span> ({a.cooldown}-turn cooldown): {a.text}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
