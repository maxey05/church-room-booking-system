"use client";

import { useActionState } from "react";
import { formatHour, HOURS, OPEN_HOUR } from "@/lib/rules";
import { blockSlots, type BlockState } from "./actions";

const field =
  "min-h-11 w-full rounded-pill border border-outline bg-brand-tint px-4 text-base font-normal text-ink";

export default function BlockForm({
  rooms,
  date,
}: {
  rooms: { id: number; name: string; floor: number }[];
  date: string;
}) {
  const [state, formAction, pending] = useActionState<BlockState, FormData>(
    blockSlots,
    {},
  );
  const v = state.values;

  return (
    <form
      action={formAction}
      className="mt-4 grid gap-4 rounded-card-mobile bg-brand-soft p-4 sm:grid-cols-2 md:rounded-card md:p-6 lg:grid-cols-5"
    >
      <label className="flex flex-col gap-1 font-semibold">
        Room
        <select name="room" required defaultValue={v?.room} className={field}>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} (Floor {r.floor})
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        Date
        <input
          name="date"
          type="date"
          required
          defaultValue={v?.date ?? date}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        From
        <select name="from" defaultValue={v?.from ?? OPEN_HOUR} className={field}>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        To
        <select name="to" defaultValue={v?.to ?? OPEN_HOUR + 1} className={field}>
          {HOURS.map((h) => h + 1).map((h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        Label
        <input
          name="label"
          type="text"
          required
          maxLength={80}
          placeholder="Sunday Service"
          defaultValue={v?.label}
          className={field}
        />
      </label>

      <div className="sm:col-span-2 lg:col-span-5">
        {state.error && (
          <p role="alert" className="mb-3 font-semibold text-danger">
            {state.error}
          </p>
        )}
        <div role="status">
          {state.done && <p className="mb-3 font-semibold text-success">{state.done}</p>}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full rounded-pill bg-brand-strong px-6 font-semibold text-surface disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink-muted md:w-auto"
        >
          {pending ? "Blocking…" : "Block"}
        </button>
      </div>
    </form>
  );
}
