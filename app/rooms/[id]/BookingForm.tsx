"use client";

import { useState } from "react";
import { formatRange, toggleHour } from "@/lib/rules";
import SlotGrid from "./SlotGrid";

export default function BookingForm({
  taken,
  pastUntil,
}: {
  roomId: number;
  date: string;
  taken: number[];
  pastUntil: number;
}) {
  const [picked, setPicked] = useState<number[]>([]);

  return (
    <div className="mt-6">
      <SlotGrid
        taken={taken}
        pastUntil={pastUntil}
        picked={picked}
        onToggle={(h) => setPicked((p) => toggleHour(p, h))}
      />
      <p aria-live="polite" className="mt-4 font-semibold">
        {picked.length > 0 && `Selected: ${formatRange(picked)}`}
      </p>
      {picked.map((h) => (
        <input key={h} type="hidden" name="hours" value={h} />
      ))}
    </div>
  );
}
