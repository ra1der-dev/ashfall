import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Status, Tier } from "@ashfall/engine";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ember-500 text-ash-950 hover:bg-ember-400 disabled:bg-ash-700 disabled:text-ash-400",
  secondary:
    "bg-ash-800 text-ash-100 border border-ash-600 hover:border-ember-500 hover:bg-ash-700 disabled:opacity-40 disabled:hover:border-ash-600 disabled:hover:bg-ash-800",
  ghost: "text-ash-300 hover:text-ash-100 hover:bg-ash-800 disabled:opacity-40",
  danger: "bg-red-900/60 text-red-100 border border-red-800 hover:bg-red-800 disabled:opacity-40",
};

export function Button({
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cx(
        "rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-400",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Panel({
  title,
  children,
  className,
  actions,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cx("rounded-xl border border-ash-700 bg-ash-900/90 p-4 shadow-lg shadow-black/30", className)}>
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="font-display text-sm tracking-wider text-ash-300 uppercase">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Bar({
  value,
  max,
  color = "bg-red-500",
  label,
  small,
}: {
  value: number;
  max: number;
  color?: string;
  label?: string;
  small?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-ash-300">
          <span>{label}</span>
          <span className="tabular-nums">
            {Math.max(0, value)} / {max}
          </span>
        </div>
      )}
      <div
        className={cx("overflow-hidden rounded-full bg-ash-800", small ? "h-1.5" : "h-3")}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={cx("h-full rounded-full transition-[width] duration-300", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export const TIER_TEXT: Record<Tier, string> = {
  Scrap: "text-tier-scrap",
  Forged: "text-tier-forged",
  Tempered: "text-tier-tempered",
  Runed: "text-tier-runed",
  Mythic: "text-tier-mythic",
};

export const TIER_BORDER: Record<Tier, string> = {
  Scrap: "border-tier-scrap/40",
  Forged: "border-tier-forged/40",
  Tempered: "border-tier-tempered/50",
  Runed: "border-tier-runed/60",
  Mythic: "border-tier-mythic/70",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={cx("text-[10px] font-semibold tracking-widest uppercase", TIER_TEXT[tier])}>{tier}</span>;
}

const STATUS_STYLE: Record<string, { label: string; className: string; hint: string }> = {
  burn: {
    label: "Burn",
    className: "bg-orange-900/60 text-orange-200 border-orange-700",
    hint: "Takes 3 damage per turn",
  },
  bleed: { label: "Bleed", className: "bg-red-900/60 text-red-200 border-red-700", hint: "Takes 2 damage per turn" },
  stun: {
    label: "Stunned",
    className: "bg-yellow-900/60 text-yellow-100 border-yellow-700",
    hint: "Loses the next turn",
  },
  shield: { label: "Shield", className: "bg-sky-900/60 text-sky-100 border-sky-700", hint: "Absorbs damage" },
  evade: {
    label: "Evade",
    className: "bg-violet-900/60 text-violet-100 border-violet-700",
    hint: "Next attack misses",
  },
  guard: { label: "Guard", className: "bg-stone-700/60 text-stone-100 border-stone-500", hint: "+2 AC, half damage" },
};

export function StatusChips({ statuses }: { statuses: Status[] }) {
  if (statuses.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {statuses.map((s) => {
        const style = STATUS_STYLE[s.id]!;
        return (
          <span
            key={s.id}
            title={style.hint}
            className={cx("rounded border px-1.5 py-0.5 text-[11px] font-medium", style.className)}
          >
            {style.label} {s.amount}
          </span>
        );
      })}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg bg-ash-850 px-2 py-1.5 text-center" title={hint}>
      <div className="text-[10px] tracking-wider text-ash-400 uppercase">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
