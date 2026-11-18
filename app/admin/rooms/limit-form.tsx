"use client";

import { useActionState, useState } from "react";
import { MAX_DAILY_LIMIT, MIN_DAILY_LIMIT } from "@/lib/rules";
import { updateBookingLimit, type LimitState } from "../actions";

const fade =
  "motion-safe:transition-[color,background-color,border-color] motion-safe:duration-300 motion-safe:delay-75";
const step = `grid size-11 place-items-center rounded-pill bg-mist text-navy hover:bg-brand-soft ${fade}`;

function clamp(n: number): number {
  return Math.min(MAX_DAILY_LIMIT, Math.max(MIN_DAILY_LIMIT, n));
}

export default function LimitForm({ current }: { current: number }) {
  const [state, formAction, pending] = useActionState<LimitState, FormData>(
    updateBookingLimit,
    {},
  );
  const saved = state.done && state.value ? Number(state.value) : current;
  const [draft, setDraft] = useState(String(current));

  const parsed = parseInt(draft, 10);
  const dirty = !Number.isNaN(parsed) && parsed !== saved;
  const base = Number.isNaN(parsed) ? saved : parsed;

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="limit" value={draft} />
      <div className="flex items-center gap-1 rounded-pill border border-line bg-surface p-1">
        <button
          type="button"
          aria-label="Decrease daily limit"
          onClick={() => setDraft(String(clamp(base - 1)))}
          className={step}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
        <label htmlFor="daily-limit" className="sr-only">
          Bookings per person per day
        </label>
        <input
          id="daily-limit"
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onBlur={() => setDraft(String(Number.isNaN(parsed) ? saved : clamp(parsed)))}
          className="h-11 w-14 bg-transparent text-center text-lg font-medium tabular-nums text-ink"
        />
        <button
          type="button"
          aria-label="Increase daily limit"
          onClick={() => setDraft(String(clamp(base + 1)))}
          className={step}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>
      <button
        type="submit"
        disabled={pending || !dirty}
        className={`min-h-11 rounded-pill bg-brand-strong px-5 text-sm font-medium text-surface enabled:hover:bg-navy disabled:cursor-not-allowed disabled:opacity-50 ${fade}`}
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <div role="status" className="min-w-[72px] text-sm font-medium text-success">
        {state.done && !dirty && !pending ? "Saved" : ""}
      </div>
      {state.error && (
        <p role="alert" className="basis-full text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
