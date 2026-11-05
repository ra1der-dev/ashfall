import { useEffect, useRef } from "react";
import { Panel, cx } from "./ui";

function lineStyle(line: string): string {
  if (line.startsWith("—")) return "text-ash-400 text-xs tracking-wide pt-2";
  if (/CRITICAL|LEVEL UP|ENRAGED/.test(line)) return "text-ember-300 font-semibold";
  if (/hits you|CRITS you|You take|You fall/.test(line)) return "text-red-300";
  if (/heal|\+\d+ HP|drain/i.test(line)) return "text-emerald-300";
  return "text-ash-300";
}

export function LogPanel({ log, limit = 60, className }: { log: string[]; limit?: number; className?: string }) {
  const end = useRef<HTMLDivElement>(null);
  const lines = log.slice(-limit);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [log.length]);

  return (
    <Panel title="Chronicle" className={className}>
      <div
        className="max-h-80 overflow-y-auto pr-1 text-sm leading-relaxed lg:max-h-[calc(100vh-12rem)]"
        aria-live="polite"
        data-testid="log"
      >
        {lines.map((line, i) => (
          <p key={log.length - lines.length + i} className={cx(lineStyle(line))}>
            {line}
          </p>
        ))}
        <div ref={end} />
      </div>
    </Panel>
  );
}
