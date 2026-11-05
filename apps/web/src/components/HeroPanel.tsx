import {
  BAG_SIZE,
  CLASSES,
  LEVEL_XP,
  formatDice,
  heroStats,
  sellValue,
  type Action,
  type RunState,
  type Slot,
} from "@ashfall/engine";
import { ItemCard } from "./ItemCard";
import { Bar, Button, Panel, Stat, StatusChips } from "./ui";

const SLOTS: Slot[] = ["weapon", "armor", "trinket"];

export function HeroPanel({ run, act }: { run: RunState; act: (a: Action) => void }) {
  const { hero } = run;
  const stats = heroStats(hero);
  const cls = CLASSES[hero.classId];
  const inCombat = run.phase === "combat";
  const atMerchant = run.phase === "merchant";
  const nextXp = LEVEL_XP[hero.level];
  const prevXp = LEVEL_XP[hero.level - 1] ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-xl text-ash-100">{hero.name}</h2>
            <p className="text-xs text-ash-400">
              Level {hero.level} {cls.name}
            </p>
          </div>
          <div className="text-right text-sm">
            <div className="text-amber-300 tabular-nums" title="Gold">
              🪙 {hero.gold}
            </div>
          </div>
        </div>
        <Bar
          label="HP"
          value={hero.hp}
          max={stats.maxHp}
          color={hero.hp / stats.maxHp < 0.3 ? "bg-red-600" : "bg-red-500"}
        />
        <div className="mt-2">
          {nextXp !== undefined ? (
            <Bar label="XP" value={hero.xp - prevXp} max={nextXp - prevXp} color="bg-ember-400" small />
          ) : (
            <p className="text-xs text-ash-400">Max level</p>
          )}
        </div>
        {inCombat && run.combat && (
          <div className="mt-2">
            <StatusChips statuses={run.combat.heroStatuses} />
          </div>
        )}
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          <Stat label="Atk" value={`+${stats.attack}`} hint="Added to your d20 attack roll" />
          <Stat label="Pwr" value={`+${stats.power}`} hint="Added to every damage roll" />
          <Stat label="AC" value={stats.ac} hint="Enemies must roll this or higher to hit you" />
          <Stat label="Crit" value={`${stats.critMin}+`} hint="Natural roll needed for a critical hit" />
          <Stat label="Dmg" value={formatDice(stats.damage)} hint="Weapon damage die" />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-ash-850 px-3 py-2 text-sm">
          <span>
            🧪 Potions: <strong className="tabular-nums">{hero.potions}</strong>
          </span>
          {!inCombat && (
            <Button
              variant="ghost"
              className="px-2 py-1 text-xs"
              disabled={
                hero.potions === 0 || hero.hp >= stats.maxHp || run.phase === "victory" || run.phase === "defeat"
              }
              onClick={() => act({ type: "potion" })}
            >
              Drink
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs text-ash-400">
          <span className="text-ash-300">Passive:</span> {cls.passive}
        </p>
        {hero.boons.length > 0 && (
          <p className="mt-1 text-xs text-ash-400">
            <span className="text-ash-300">Boons:</span> {hero.boons.map((b) => b.name).join(", ")}
          </p>
        )}
      </Panel>

      <Panel title="Equipment">
        <div className="flex flex-col gap-2">
          {SLOTS.map((slot) => {
            const item = hero.equipment[slot];
            return item ? (
              <ItemCard key={slot} item={item} />
            ) : (
              <div
                key={slot}
                className="rounded-lg border border-dashed border-ash-700 p-3 text-xs text-ash-400 capitalize"
              >
                No {slot}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title={`Bag ${hero.bag.length}/${BAG_SIZE}`}>
        {hero.bag.length === 0 ? (
          <p className="text-sm text-ash-400">Empty. Go take something from the Concord.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {hero.bag.map((item, index) => (
              <ItemCard key={item.id} item={item} current={hero.equipment[item.slot]}>
                <Button
                  className="px-2 py-1 text-xs"
                  disabled={inCombat}
                  onClick={() => act({ type: "equip", bagIndex: index })}
                >
                  Equip
                </Button>
                {atMerchant ? (
                  <Button className="px-2 py-1 text-xs" onClick={() => act({ type: "sell", bagIndex: index })}>
                    Sell {sellValue(item)}g
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    disabled={inCombat}
                    onClick={() => act({ type: "discard", bagIndex: index })}
                  >
                    Drop
                  </Button>
                )}
              </ItemCard>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
