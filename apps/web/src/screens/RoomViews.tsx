import {
  BAG_SIZE,
  CLASSES,
  POTION_HEAL,
  REST_HEAL_FRACTION,
  heroStats,
  type Action,
  type RunState,
} from "@ashfall/engine";
import { ItemCard } from "../components/ItemCard";
import { Button, Panel, cx } from "../components/ui";

type Props = { run: RunState; act: (a: Action) => void };

export function RewardView({ run, act }: Props) {
  const reward = run.reward!;
  const bagFull = run.hero.bag.length >= BAG_SIZE;
  const isBoss = reward.source === "boss";
  return (
    <Panel title={reward.source === "treasure" ? "Treasure" : "Victory"}>
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        {reward.gold > 0 && <span className="rounded bg-ash-800 px-2 py-1 text-amber-300">🪙 +{reward.gold} gold</span>}
        {reward.xp > 0 && <span className="rounded bg-ash-800 px-2 py-1 text-ember-300">+{reward.xp} XP</span>}
        {reward.potions > 0 && (
          <span className="rounded bg-ash-800 px-2 py-1 text-emerald-300">🧪 +{reward.potions} potion</span>
        )}
      </div>
      {reward.items.length > 0 && !reward.itemTaken && (
        <>
          <p className="mb-2 text-sm text-ash-300">
            {reward.items.length > 1 ? "Choose one item to keep:" : "You find an item:"}
          </p>
          {bagFull && <p className="mb-2 text-sm text-red-300">Your bag is full. Equip or drop something first.</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {reward.items.map((item, index) => (
              <ItemCard key={item.id} item={item} current={run.hero.equipment[item.slot]}>
                <Button
                  variant="primary"
                  className="px-3 py-1 text-xs"
                  disabled={bagFull}
                  onClick={() => act({ type: "takeItem", index })}
                >
                  Take
                </Button>
              </ItemCard>
            ))}
          </div>
        </>
      )}
      {reward.items.length > 0 && reward.itemTaken && (
        <p className="text-sm text-ash-400">Item claimed. Equip it from your bag.</p>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="primary" onClick={() => act({ type: "continue" })}>
          {isBoss ? (run.floor >= 3 ? "Claim victory" : `Descend to floor ${run.floor + 1}`) : "Continue"}
        </Button>
        {reward.items.length > 0 && !reward.itemTaken && (
          <Button variant="ghost" onClick={() => act({ type: "skipItem" })}>
            Leave it
          </Button>
        )}
      </div>
    </Panel>
  );
}

export function MerchantView({ run, act }: Props) {
  const merchant = run.merchant!;
  const bagFull = run.hero.bag.length >= BAG_SIZE;
  return (
    <Panel title="Merchant" actions={<span className="text-sm text-amber-300">🪙 {run.hero.gold}</span>}>
      <p className="mb-3 text-sm text-ash-300">
        Sell items from your bag on the left. {bagFull && <span className="text-red-300">Your bag is full.</span>}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {merchant.items.map((offer, index) => (
          <div key={offer.item.id} className={cx(offer.sold && "opacity-40")}>
            <ItemCard item={offer.item} current={run.hero.equipment[offer.item.slot]}>
              <Button
                variant="primary"
                className="px-3 py-1 text-xs"
                disabled={offer.sold || bagFull || run.hero.gold < offer.price}
                onClick={() => act({ type: "buy", index })}
              >
                {offer.sold ? "Sold" : `Buy ${offer.price}g`}
              </Button>
            </ItemCard>
          </div>
        ))}
        <div className="flex flex-col justify-between gap-2 rounded-lg border border-ash-700 bg-ash-850 p-3">
          <div>
            <div className="font-semibold text-emerald-300">🧪 Healing Potion</div>
            <p className="text-xs text-ash-300">Restores {POTION_HEAL} HP. Drink in or out of combat.</p>
          </div>
          <Button
            variant="primary"
            className="self-start px-3 py-1 text-xs"
            disabled={run.hero.gold < merchant.potionPrice}
            onClick={() => act({ type: "buyPotion" })}
          >
            Buy {merchant.potionPrice}g
          </Button>
        </div>
      </div>
      <Button className="mt-4" onClick={() => act({ type: "continue" })}>
        Leave shop
      </Button>
    </Panel>
  );
}

export function RestView({ run, act }: Props) {
  const heal = Math.round(heroStats(run.hero).maxHp * REST_HEAL_FRACTION);
  return (
    <Panel title="Campfire">
      <p className="mb-4 text-sm text-ash-300">The fire crackles. You have time for one thing before you move on.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => act({ type: "rest", choice: "heal" })}
          className="rounded-xl border border-ash-600 bg-ash-850 p-4 text-left transition hover:border-ember-500"
        >
          <div className="text-2xl">🔥</div>
          <div className="font-display text-lg">Sleep</div>
          <p className="text-sm text-ash-300">Heal {heal} HP.</p>
        </button>
        <button
          type="button"
          onClick={() => act({ type: "rest", choice: "train" })}
          className="rounded-xl border border-ash-600 bg-ash-850 p-4 text-left transition hover:border-ember-500"
        >
          <div className="text-2xl">🪓</div>
          <div className="font-display text-lg">Drill</div>
          <p className="text-sm text-ash-300">+1 attack for the rest of the run, +10 XP.</p>
        </button>
      </div>
    </Panel>
  );
}

export function ShrineView({ run, act }: Props) {
  const boons = run.shrine!;
  return (
    <Panel title="Clan Shrine">
      <p className="mb-4 text-sm text-ash-300">The old fire answers. Choose one gift, or walk away.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {boons.map((boon, index) => {
          const cantPay = (boon.goldCost ?? 0) > run.hero.gold || (boon.hpCost ?? 0) >= run.hero.hp;
          return (
            <button
              key={boon.id}
              type="button"
              disabled={cantPay}
              onClick={() => act({ type: "shrine", index })}
              className="rounded-xl border border-ash-600 bg-ash-850 p-4 text-left transition hover:border-ember-500 disabled:opacity-40 disabled:hover:border-ash-600"
            >
              <div className="font-display text-lg text-ember-300">{boon.name}</div>
              <p className="text-sm text-ash-300">{boon.text}</p>
            </button>
          );
        })}
      </div>
      <Button variant="ghost" className="mt-4" onClick={() => act({ type: "continue" })}>
        Walk away
      </Button>
    </Panel>
  );
}

export function RunEndView({ run, onCamp }: { run: RunState; onCamp: () => void }) {
  const won = run.phase === "victory";
  return (
    <Panel className={won ? "border-ember-500/70" : "border-red-900"}>
      <div className="py-6 text-center" data-testid="run-end">
        <div className="text-5xl">{won ? "👑" : "🕯️"}</div>
        <h2 className="mt-2 font-display text-3xl">{won ? "The Clans Endure" : "Your Ember Fades"}</h2>
        <p className="mt-1 text-ash-300">
          {run.hero.name} the {CLASSES[run.hero.classId].name}{" "}
          {won ? "broke the Gilded Concord." : `fell on floor ${run.floor}.`}
        </p>
        <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-ash-850 p-2">
            <dt className="text-xs text-ash-400">Kills</dt>
            <dd className="text-lg font-semibold">{run.stats.kills}</dd>
          </div>
          <div className="rounded-lg bg-ash-850 p-2">
            <dt className="text-xs text-ash-400">Gold earned</dt>
            <dd className="text-lg font-semibold">{run.stats.goldEarned}</dd>
          </div>
          <div className="rounded-lg bg-ash-850 p-2">
            <dt className="text-xs text-ash-400">Embers</dt>
            <dd className="text-lg font-semibold text-ember-300">+{run.stats.embers}</dd>
          </div>
        </dl>
        {run.daily && <p className="mt-3 text-xs text-ash-400">Daily run · seed {run.seed}</p>}
        <Button variant="primary" className="mt-6 px-6" onClick={onCamp}>
          Return to the War Camp
        </Button>
      </div>
    </Panel>
  );
}
