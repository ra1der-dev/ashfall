import { reachableNodes, type Action, type MapNode, type NodeType, type RunState } from "@ashfall/engine";
import { Panel, cx } from "./ui";

export const NODE_INFO: Record<NodeType, { icon: string; label: string; hint: string }> = {
  fight: { icon: "⚔️", label: "Fight", hint: "A Concord patrol or dungeon beast." },
  elite: { icon: "💀", label: "Elite", hint: "A dangerous foe. Better loot." },
  boss: { icon: "👑", label: "Boss", hint: "The floor's warden. No fleeing." },
  merchant: { icon: "🪙", label: "Merchant", hint: "Buy gear and potions, sell junk." },
  rest: { icon: "🔥", label: "Campfire", hint: "Heal or train." },
  treasure: { icon: "🎁", label: "Treasure", hint: "Gold and an item." },
  shrine: { icon: "✨", label: "Shrine", hint: "Choose a permanent boon." },
};

const ROW_HEIGHT = 84;

export function MapView({ run, act }: { run: RunState; act: (a: Action) => void }) {
  const rows = run.map.rows;
  const reachable = new Set(reachableNodes(run.map, run.position).map((n) => n.id));
  const visited = new Set(run.visited);
  const height = rows.length * ROW_HEIGHT;

  // Boss at the top, entrance at the bottom: you climb toward the boss.
  const pos = (node: MapNode) => {
    const count = rows[node.row]!.length;
    return { x: ((node.col + 1) / (count + 1)) * 100, y: (rows.length - 1 - node.row) * ROW_HEIGHT + ROW_HEIGHT / 2 };
  };

  return (
    <Panel
      title={`Floor ${run.floor} of 3`}
      actions={<span className="text-xs text-ash-400">Pick a glowing room to travel</span>}
    >
      <div className="relative mx-auto w-full max-w-xl" style={{ height }} data-testid="map">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          {rows.flatMap((row) =>
            row.flatMap((node) =>
              node.next.map((nextId) => {
                const target = rows[node.row + 1]!.find((n) => n.id === nextId)!;
                const a = pos(node);
                const b = pos(target);
                const walked = visited.has(node.id) && visited.has(nextId);
                const open = node.id === run.position && reachable.has(nextId);
                return (
                  <line
                    key={`${node.id}-${nextId}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    vectorEffect="non-scaling-stroke"
                    strokeWidth={walked || open ? 2.5 : 1.5}
                    strokeDasharray={walked ? undefined : "4 4"}
                    className={walked ? "stroke-ember-500" : open ? "stroke-ember-300" : "stroke-ash-700"}
                  />
                );
              }),
            ),
          )}
        </svg>
        {rows.flat().map((node) => {
          const p = pos(node);
          const info = NODE_INFO[node.type];
          const canGo = reachable.has(node.id) && run.phase === "map";
          const here = node.id === run.position;
          const done = visited.has(node.id);
          return (
            <button
              key={node.id}
              type="button"
              disabled={!canGo}
              onClick={() => act({ type: "travel", nodeId: node.id })}
              title={`${info.label}: ${info.hint}`}
              aria-label={`${info.label}${canGo ? " (available)" : ""}`}
              data-node-type={node.type}
              data-available={canGo || undefined}
              className={cx(
                "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-xl border text-xl transition",
                node.type === "boss" ? "h-16 w-16 text-3xl" : "h-12 w-12",
                canGo &&
                  "animate-pulse border-ember-400 bg-ash-800 shadow-[0_0_18px_rgb(240_106_29/0.45)] hover:scale-110 hover:animate-none",
                here && "border-ember-500 bg-ember-600/30",
                done && !here && "border-ash-600 bg-ash-800 opacity-60",
                !canGo && !here && !done && "border-ash-700 bg-ash-900 opacity-80",
              )}
              style={{ left: `${p.x}%`, top: p.y }}
            >
              <span aria-hidden>{info.icon}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ash-400">
        {Object.entries(NODE_INFO).map(([type, info]) => (
          <span key={type}>
            {info.icon} {info.label}
          </span>
        ))}
      </div>
    </Panel>
  );
}
