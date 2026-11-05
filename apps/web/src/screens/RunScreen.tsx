import { isRunOver, type Action, type RunState } from "@ashfall/engine";
import { useState } from "react";
import { HeroPanel } from "../components/HeroPanel";
import { LogPanel } from "../components/LogPanel";
import { MapView } from "../components/MapView";
import { Button } from "../components/ui";
import { CombatView } from "./CombatView";
import { MerchantView, RestView, RewardView, RunEndView, ShrineView } from "./RoomViews";

export function RunScreen({ run, act, onCamp }: { run: RunState; act: (a: Action) => void; onCamp: () => void }) {
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const over = isRunOver(run);

  let main;
  switch (run.phase) {
    case "map":
      main = <MapView run={run} act={act} />;
      break;
    case "combat":
      main = <CombatView run={run} act={act} />;
      break;
    case "reward":
      main = <RewardView run={run} act={act} />;
      break;
    case "merchant":
      main = <MerchantView run={run} act={act} />;
      break;
    case "rest":
      main = <RestView run={run} act={act} />;
      break;
    case "shrine":
      main = <ShrineView run={run} act={act} />;
      break;
    default:
      main = <RunEndView run={run} onCamp={onCamp} />;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl tracking-wider text-ember-400">ASHFALL</h1>
        <div className="flex items-center gap-3 text-sm text-ash-300">
          <span>Floor {run.floor}/3</span>
          {run.daily && <span className="rounded bg-ember-600/30 px-2 py-0.5 text-xs text-ember-300">Daily</span>}
          {!over &&
            (confirmAbandon ? (
              <span className="flex items-center gap-2">
                <span className="text-xs">Abandon run? Embers so far are kept.</span>
                <Button variant="danger" className="px-2 py-1 text-xs" onClick={onCamp}>
                  Abandon
                </Button>
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setConfirmAbandon(false)}>
                  Cancel
                </Button>
              </span>
            ) : (
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setConfirmAbandon(true)}>
                Abandon run
              </Button>
            ))}
        </div>
      </header>
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        <aside className="order-2 lg:order-1">
          <HeroPanel run={run} act={act} />
        </aside>
        <main className="order-1 lg:order-2">{main}</main>
        <aside className="order-3">
          <LogPanel log={run.log} className="lg:sticky lg:top-4" />
        </aside>
      </div>
    </div>
  );
}
