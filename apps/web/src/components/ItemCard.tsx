import { describeEffect, describeMods, formatDice, type Item } from "@ashfall/engine";
import type { ReactNode } from "react";
import { TIER_BORDER, TIER_TEXT, TierBadge, cx } from "./ui";

const SLOT_ICON = { weapon: "🗡️", armor: "🛡️", trinket: "📿" } as const;

export function ItemCard({
  item,
  children,
  compact,
  current,
}: {
  item: Item;
  children?: ReactNode;
  compact?: boolean;
  current?: Item;
}) {
  const lines = describeMods(item.mods);
  return (
    <div className={cx("flex flex-col gap-1.5 rounded-lg border bg-ash-850 p-3", TIER_BORDER[item.tier])}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={cx("truncate font-semibold", TIER_TEXT[item.tier])} title={item.name}>
            <span aria-hidden className="mr-1">
              {SLOT_ICON[item.slot]}
            </span>
            {item.name}
          </div>
          <div className="flex gap-2 text-xs text-ash-400">
            <TierBadge tier={item.tier} />
            <span className="capitalize">{item.slot}</span>
          </div>
        </div>
      </div>
      {!compact && (
        <ul className="text-xs text-ash-300">
          {item.damage && <li>Damage {formatDice(item.damage)}</li>}
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
          {item.effects.map((e) => (
            <li key={e} className="text-ember-300">
              {describeEffect(e)}
            </li>
          ))}
        </ul>
      )}
      {!compact && item.lore && <p className="text-xs text-ash-400 italic">“{item.lore}”</p>}
      {current && current.id !== item.id && <p className="text-[11px] text-ash-400">Replaces: {current.name}</p>}
      {children && <div className="mt-1 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
