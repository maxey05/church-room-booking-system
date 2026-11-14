"use client";

import { useActionState, useState } from "react";
import { formatDate, formatRange, toggleHour } from "@/lib/rules";
import { book, type BookState } from "./actions";
import SlotGrid from "./SlotGrid";

const field =
  "min-h-11 w-full rounded-pill border border-outline bg-brand-tint px-4 text-base font-normal text-ink placeholder:text-ink-muted";

export default function BookingForm({
  roomId,
  roomName,
  floor,
  date,
  taken,
  pastUntil,
}: {
  roomId: number;
  roomName: string;
  floor: number;
  date: string;
  taken: number[];
  pastUntil: number;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const [state, formAction, pending] = useActionState<BookState, FormData>(
    book.bind(null, roomId),
    {},
  );

  if (state.done) {
    const { summary, emailed, email } = state.done;
    return (
      <div
        role="status"
        className={`mt-6 rounded-card-mobile border bg-surface p-5 md:rounded-card ${emailed ? "border-success" : "border-warning"}`}
      >
        <h3 className="text-success">Room reserved!</h3>
        <p className="mt-2 font-semibold">{summary}</p>
        <p className="mt-2">
          {emailed
            ? `A confirmation email with a cancel link was sent to ${email}.`
            : "We couldn't send the confirmation email, but your booking is saved. Please screenshot this page."}
        </p>
      </div>
    );
  }

  const chosen = picked.some((h) => taken.includes(h)) ? [] : picked;

  return (
    <div className="mt-6">
      <SlotGrid
        taken={taken}
        pastUntil={pastUntil}
        picked={chosen}
        onToggle={(h) => setPicked(toggleHour(chosen, h))}
      />

      <div aria-live="polite">
        {chosen.length > 0 && (
          <div className="mt-4 rounded-card-mobile bg-navy p-4 text-navy-ink md:rounded-card">
            <p className="font-semibold">
              {roomName} (Floor {floor})
            </p>
            <p>
              {formatDate(date)}, {formatRange(chosen)}
            </p>
          </div>
        )}
      </div>

      <form
        action={formAction}
        className="mt-4 flex flex-col gap-4 rounded-card-mobile bg-brand-soft p-4 md:rounded-card md:p-6"
      >
        <input type="hidden" name="date" value={date} />
        {chosen.map((h) => (
          <input key={h} type="hidden" name="hours" value={h} />
        ))}

        <label className="flex flex-col gap-1 font-semibold">
          Name (required)
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            defaultValue={state.values?.name}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          Email (required)
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state.values?.email}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          Contact number (required)
          <input
            name="contact"
            type="tel"
            required
            autoComplete="tel"
            placeholder="0917 123 4567"
            defaultValue={state.values?.contact}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          DGroup leader (optional)
          <input
            name="dgroupLeader"
            type="text"
            autoComplete="off"
            defaultValue={state.values?.dgroupLeader}
            className={field}
          />
        </label>
        <label className="flex items-start gap-3">
          <input
            name="consent"
            type="checkbox"
            required
            autoComplete="off"
            className="mt-1 size-5 shrink-0 accent-brand-strong"
          />
          <span>
            I agree that my name, email and contact number will be stored and
            used only to manage this room booking, in line with the Data
            Privacy Act of 2012. (required)
          </span>
        </label>

        {state.error && (
          <p role="alert" className="font-semibold text-danger">
            {state.error}
          </p>
        )}

        <div className="sticky bottom-0 -mx-4 -mb-4 rounded-b-card-mobile border-t border-line bg-surface p-4 md:static md:mx-0 md:mb-0 md:border-0 md:bg-transparent md:p-0">
          <button
            type="submit"
            disabled={pending || chosen.length === 0}
            className="min-h-12 w-full rounded-pill bg-brand-strong px-6 font-semibold text-surface transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink-muted motion-reduce:transition-none md:w-auto"
          >
            {pending ? "Reserving…" : "Reserve"}
          </button>
        </div>
      </form>
    </div>
  );
}
