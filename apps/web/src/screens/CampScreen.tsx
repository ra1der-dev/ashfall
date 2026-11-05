import {
  CLASSES,
  CLASS_ORDER,
  GAME_SUBTITLE,
  GAME_TITLE,
  UPGRADES,
  WEAPON_BASES,
  dailySeed,
  formatDice,
  upgradeCost,
  type ClassId,
  type Profile,
  type RunState,
} from "@ashfall/engine";
import { useState } from "react";
import { Button, Panel, cx } from "../components/ui";
import type { AppAction } from "../store";

export function CampScreen({
  profile,
  run,
  dispatch,
  onResume,
}: {
  profile: Profile;
  run: RunState | null;
  dispatch: (a: AppAction) => void;
  onResume: () => void;
}) {
  const [selected, setSelected] = useState<ClassId>(profile.unlockedClasses[0] ?? "brute");
  const [name, setName] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const unlocked = profile.unlockedClasses.includes(selected);
  const today = dailySeed();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="text-center">
        <h1 className="font-display text-5xl font-extrabold tracking-wider text-ember-400 drop-shadow-[0_0_24px_rgb(240_106_29/0.4)] sm:text-6xl">
          {GAME_TITLE.toUpperCase()}
        </h1>
        <p className="mt-1 font-display text-lg text-ash-300">{GAME_SUBTITLE}</p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ash-400">
          The Gilded Concord drove the Ashborn Clans into the deep places. Take back three floors of their dungeon, one
          ember at a time.
        </p>
      </header>

      {run && (
        <Panel className="border-ember-500/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Run in progress</div>
              <div className="text-sm text-ash-400">
                {run.hero.name} the {CLASSES[run.hero.classId].name} · Floor {run.floor} · {run.hero.hp} HP
              </div>
            </div>
            <Button variant="primary" onClick={onResume}>
              Continue run
            </Button>
          </div>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Choose your champion">
          <div className="grid gap-3 sm:grid-cols-3">
            {CLASS_ORDER.map((id) => {
              const cls = CLASSES[id];
              const has = profile.unlockedClasses.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  aria-pressed={selected === id}
                  className={cx(
                    "flex flex-col gap-2 rounded-xl border bg-ash-850 p-4 text-left transition",
                    selected === id
                      ? "border-ember-500 shadow-[0_0_20px_rgb(240_106_29/0.25)]"
                      : "border-ash-700 hover:border-ash-600",
                    !has && "opacity-70",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg">{cls.name}</span>
                    {!has && <span className="text-xs text-ember-300">🔒 {cls.unlockCost} embers</span>}
                  </div>
                  <p className="text-xs text-ash-300">{cls.tagline}</p>
                  <dl className="grid grid-cols-4 gap-1 text-center text-[11px]">
                    <div className="rounded bg-ash-800 py-1">
                      <dt className="text-ash-400">HP</dt>
                      <dd>{cls.base.maxHp}</dd>
                    </div>
                    <div className="rounded bg-ash-800 py-1">
                      <dt className="text-ash-400">AC</dt>
                      <dd>{cls.base.ac}</dd>
                    </div>
                    <div className="rounded bg-ash-800 py-1">
                      <dt className="text-ash-400">Atk</dt>
                      <dd>+{cls.base.attack}</dd>
                    </div>
                    <div className="rounded bg-ash-800 py-1">
                      <dt className="text-ash-400">Pwr</dt>
                      <dd>+{cls.base.power}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-ash-400">{cls.passive}</p>
                  <ul className="text-xs text-ash-300">
                    {cls.abilities.map((a) => (
                      <li key={a.id}>
                        <span className="text-ember-300">{a.name}</span>: {a.text}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-ash-400">
                    Starts with a {cls.starterWeapon.toLowerCase()} (
                    {formatDice(WEAPON_BASES[cls.starterWeapon].damage)})
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-ash-300">Name (leave blank for a random clan name)</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 24))}
                placeholder="Korvash"
                className="rounded-lg border border-ash-600 bg-ash-850 px-3 py-2 text-ash-100 placeholder:text-ash-600 focus:border-ember-500 focus:outline-none"
              />
            </label>
            {unlocked ? (
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="px-5 py-2.5"
                  onClick={() => dispatch({ type: "startRun", options: { classId: selected, name } })}
                >
                  {run ? "Start new run" : "Begin the descent"}
                </Button>
                <Button
                  className="py-2.5"
                  title={`Same dungeon for everyone today (${today})`}
                  onClick={() =>
                    dispatch({ type: "startRun", options: { classId: selected, name, seed: today, daily: true } })
                  }
                >
                  Daily run
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                className="px-5 py-2.5"
                disabled={profile.embers < CLASSES[selected].unlockCost}
                onClick={() => dispatch({ type: "unlockClass", classId: selected })}
              >
                Unlock {CLASSES[selected].name} ({CLASSES[selected].unlockCost} embers)
              </Button>
            )}
          </div>
          {run && unlocked && <p className="mt-2 text-xs text-ash-400">Starting a new run abandons the current one.</p>}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel
            title="War Camp"
            actions={
              <span className="font-semibold text-ember-300" data-testid="embers">
                🔥 {profile.embers} embers
              </span>
            }
          >
            <p className="mb-3 text-xs text-ash-400">
              Embers are earned from every run, win or lose. Spend them on permanent upgrades.
            </p>
            <ul className="flex flex-col gap-2">
              {UPGRADES.map((u) => {
                const level = profile.upgrades[u.id] ?? 0;
                const cost = upgradeCost(profile, u.id);
                return (
                  <li key={u.id} className="flex items-center justify-between gap-2 rounded-lg bg-ash-850 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {u.name}{" "}
                        <span className="text-xs font-normal text-ash-400">
                          {level}/{u.maxLevel}
                        </span>
                      </div>
                      <div className="text-xs text-ash-400">{u.text}</div>
                    </div>
                    {cost === null ? (
                      <span className="text-xs text-emerald-300">Maxed</span>
                    ) : (
                      <Button
                        className="shrink-0 px-2 py-1 text-xs"
                        disabled={profile.embers < cost}
                        onClick={() => dispatch({ type: "buyUpgrade", id: u.id })}
                      >
                        🔥 {cost}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="Chronicle of the Clans">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-ash-400">Runs</dt>
              <dd className="text-right tabular-nums">{profile.history.runs}</dd>
              <dt className="text-ash-400">Victories</dt>
              <dd className="text-right tabular-nums">{profile.history.victories}</dd>
              <dt className="text-ash-400">Deepest floor</dt>
              <dd className="text-right tabular-nums">{profile.history.bestFloor}</dd>
              <dt className="text-ash-400">Foes slain</dt>
              <dd className="text-right tabular-nums">{profile.history.totalKills}</dd>
            </dl>
            <div className="mt-4 border-t border-ash-700 pt-3">
              {confirmReset ? (
                <div className="flex items-center gap-2 text-xs">
                  <span>Erase all progress?</span>
                  <Button
                    variant="danger"
                    className="px-2 py-1 text-xs"
                    onClick={() => {
                      dispatch({ type: "resetProfile" });
                      setConfirmReset(false);
                    }}
                  >
                    Erase
                  </Button>
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setConfirmReset(true)}>
                  Reset progress
                </Button>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
