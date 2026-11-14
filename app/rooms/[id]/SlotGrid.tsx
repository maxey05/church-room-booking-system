"use client";

import { formatHour, HOURS } from "@/lib/rules";

export default function SlotGrid({
  taken,
  pastUntil,
  picked,
  onToggle,
}: {
  taken: number[];
  pastUntil: number;
  picked: number[];
  onToggle: (h: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 lg:grid-cols-5">
      {HOURS.map((h) => {
        const unavailable = taken.includes(h) || h <= pastUntil;
        const selected = !unavailable && picked.includes(h);
        const state = unavailable
          ? "cursor-not-allowed border border-mist bg-mist text-ink-muted line-through"
          : selected
            ? "border border-brand-strong bg-brand-strong text-surface"
            : "border border-line bg-surface text-ink hover:bg-brand-soft";
        return (
          <button
            key={h}
            type="button"
            aria-pressed={selected}
            disabled={unavailable}
            onClick={() => onToggle(h)}
            className={`min-h-11 rounded-slot text-base transition-colors duration-150 motion-reduce:transition-none ${state}`}
          >
            {selected && <span aria-hidden="true">✓ </span>}
            {formatHour(h)}
            {unavailable && <span className="sr-only"> (taken)</span>}
          </button>
        );
      })}
    </div>
  );
}
