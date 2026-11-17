"use client";

import { useActionState } from "react";
import { formatHour, HOURS, OPEN_HOUR } from "@/lib/rules";
import { blockSlots, type BlockState } from "./actions";
import DateField from "./date-field";
import RoomSelect from "./room-select";

const fade =
  "motion-safe:transition-[color,background-color,border-color,box-shadow,filter] motion-safe:duration-300 motion-safe:delay-75";
const field = `min-h-11 w-full rounded-pill border border-outline bg-brand-tint px-4 text-base font-normal text-ink hover:border-brand-strong ${fade}`;

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
      className="mt-4 grid gap-4 rounded-card-mobile bg-brand-soft p-4 sm:grid-cols-2 md:rounded-card md:p-6 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end"
    >
      <label className="flex flex-col gap-1 font-semibold">
        Room
        <RoomSelect
          name="room"
          defaultValue={v?.room}
          options={rooms.map((r) => ({ value: String(r.id), label: `${r.name} (Floor ${r.floor})` }))}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        Date
        <DateField name="date" required defaultValue={v?.date ?? date} className={field} />
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

      <button
        type="submit"
        disabled={pending}
        className={`min-h-11 w-full rounded-pill bg-brand-strong px-6 font-semibold text-surface enabled:hover:bg-navy disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink-muted sm:col-span-2 lg:col-span-1 lg:w-auto ${fade}`}
      >
        {pending ? "Blocking…" : "Block"}
      </button>

      {state.error && (
        <p role="alert" className="font-semibold text-danger sm:col-span-2 lg:col-span-6">
          {state.error}
        </p>
      )}
      <div role="status" className="empty:-mt-4 sm:col-span-2 lg:col-span-6">
        {state.done && <p className="font-semibold text-success">{state.done}</p>}
      </div>
    </form>
  );
}
