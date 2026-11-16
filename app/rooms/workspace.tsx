"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  addDays,
  formatHour24,
  formatRange24,
  HOURS,
  MAX_DAYS_AHEAD,
  validateFields,
  type FieldErrors,
} from "@/lib/rules";
import FloorPlan from "../floor-plan";
import { book, getTaken, type BookState } from "./actions";

type Room = { id: number; name: string; floor: number };
type Slots = { key: string; taken: number[]; pastUntil: number; error?: string };
type Done = NonNullable<BookState["done"]>;

const FLOORS = [1, 2, 3, 4, 5, 6];
const OPEN_FLOORS = [1, 2];
const FLOOR_NAMES = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth"];
const FIELD_ORDER = ["name", "email", "contact", "consent"] as const;
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const motion =
  "motion-safe:transition-[background-color,border-color,box-shadow,color] motion-safe:duration-250 motion-safe:ease-out";
const arrowMotion =
  "motion-safe:transition-transform motion-safe:duration-300 motion-safe:delay-75";

const monthTitle = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const longDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
});

function asDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function slotLabel(h: number): string {
  return `${formatHour24(h)}-${formatHour24(h + 1)}`;
}

function nextHours(current: number[], h: number, isBad: (h: number) => boolean): number[] {
  if (current.length === 0) return [h];
  const lo = Math.min(...current);
  const hi = Math.max(...current);
  if (current.includes(h)) {
    return h === lo || h === hi ? current.filter((x) => x !== h) : [h];
  }
  const from = Math.min(lo, h);
  const to = Math.max(hi, h);
  const span = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return span.some(isBad) ? [h] : span;
}

function SectionHead({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex min-h-[30px] items-center gap-2.5">
      <h3 id={id} className="text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 ${arrowMotion} ${className}`}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-center gap-1.5 text-[13px] font-semibold text-danger empty:hidden"
    >
      {message && (
        <>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            className="size-3.5 flex-none"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.01" />
          </svg>
          <span>{message}</span>
        </>
      )}
    </p>
  );
}

const fieldClass = `w-full rounded-md border border-outline-soft bg-brand-soft px-3 text-base text-ink placeholder:text-ink-muted hover:border-outline hover:bg-brand-tint focus:border-brand-strong focus:bg-surface focus:ring-3 focus:ring-brand/20 focus:outline-none aria-invalid:border-danger lg:text-sm ${motion}`;

function TextField({
  name,
  label,
  hint,
  error,
  ...input
}: {
  name: string;
  label: string;
  hint: string;
  error?: string;
  type?: string;
  autoComplete: string;
  inputMode?: "tel";
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label} <small className="text-xs font-medium text-ink-muted">({hint})</small>
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-error`}
        className={`h-11 lg:h-9 ${fieldClass}`}
        {...input}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function Calendar({
  today,
  max,
  value,
  onPick,
}: {
  today: string;
  max: string;
  value: string;
  onPick: (date: string) => void;
}) {
  const [view, setView] = useState(value.slice(0, 7));
  const first = asDate(`${view}-01`);
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: first.getUTCDay() }, () => null),
    ...Array.from({ length: count }, (_, i) => `${view}-${String(i + 1).padStart(2, "0")}`),
  ];
  const canPrev = view > today.slice(0, 7);
  const canNext = view < max.slice(0, 7);

  function shift(n: number) {
    setView(new Date(Date.UTC(year, month + n, 1)).toISOString().slice(0, 7));
  }

  const navButton = `grid size-8 place-items-center rounded-md border border-line bg-surface text-navy enabled:hover:border-brand enabled:hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40 ${motion}`;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canPrev}
          onClick={() => shift(-1)}
          className={navButton}
        >
          <Chevron direction="left" />
        </button>
        <p aria-live="polite" className="text-sm font-semibold text-navy">
          {monthTitle.format(first)}
        </p>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => shift(1)}
          className={navButton}
        >
          <Chevron direction="right" />
        </button>
      </div>
      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-0.5 pb-0.5 text-center text-[11px] font-semibold tracking-[0.04em] text-ink-muted uppercase"
      >
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div role="group" aria-label="Choose a date" className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (d === null) return <span key={`blank-${i}`} aria-hidden="true" />;
          const off = d < today || d > max;
          const on = d === value;
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              disabled={off}
              aria-pressed={on}
              aria-label={`${isToday ? "Today, " : ""}${longDate.format(asDate(d))}`}
              onClick={() => onPick(d)}
              className={`h-9 rounded-md border text-sm font-medium lg:h-8 ${motion} ${
                off
                  ? "cursor-not-allowed border-transparent text-outline-soft"
                  : on
                    ? "border-brand-strong bg-brand-strong font-semibold text-navy-ink"
                    : isToday
                      ? "border-outline font-semibold text-navy hover:border-brand hover:bg-brand-soft"
                      : "border-transparent text-ink hover:border-brand hover:bg-brand-soft"
              }`}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Success({ done, onAgain }: { done: Done; onAgain: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex items-center justify-center px-2 py-6 lg:absolute lg:inset-4 lg:py-0">
      <div
        role="status"
        className={`rise w-full max-w-[440px] rounded-xl bg-surface p-6 text-center shadow-[0_30px_60px_-36px] shadow-navy/45 md:p-8 ${
          done.emailed ? "" : "ring-2 ring-warning"
        }`}
      >
        <div className="tick-draw mx-auto mb-3.5 grid size-14 place-items-center rounded-full bg-sky-soft">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7 text-sky"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <div className="mx-auto flex w-fit max-w-full flex-col">
          <h2
            ref={heading}
            tabIndex={-1}
            className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em] whitespace-nowrap text-sky focus:outline-none"
          >
            Room reserved!
          </h2>
          <div className="mx-[-1rem] mt-[18px] mb-3.5 w-0 min-w-[calc(100%+2rem)] rounded-lg bg-navy px-4 py-3.5 text-left text-navy-ink">
            <p className="font-bold">{done.room}</p>
            <p className="mt-1 text-sm text-navy-ink/85">{done.date}</p>
            <p className="text-sm text-navy-ink/85">{done.time}</p>
          </div>
        </div>
        {done.emailed ? (
          <p className="text-[15px] text-ink-muted">
            A confirmation email will be sent to{" "}
            <strong className="font-semibold [overflow-wrap:anywhere] text-ink">
              {done.email}
            </strong>
          </p>
        ) : (
          <p className="text-[15px] font-semibold text-warning">
            We couldn&apos;t send the confirmation email, but your booking is saved.
            Please screenshot this page.
          </p>
        )}
        <button
          type="button"
          onClick={onAgain}
          className="group mt-5 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-pill bg-navy px-[18px] text-sm font-semibold text-navy-ink hover:bg-brand-strong hover:shadow-[0_12px_24px_-14px] hover:shadow-brand-strong/80 motion-safe:transition-[background-color,box-shadow] motion-safe:duration-300 motion-safe:delay-75"
        >
          Book another room
          <Arrow className="size-3.5 group-hover:translate-x-[3px]" />
        </button>
      </div>
    </div>
  );
}

export default function Workspace({
  rooms,
  today,
  initialFloor,
  initialRoomId,
}: {
  rooms: Room[];
  today: string;
  initialFloor: number;
  initialRoomId: number | null;
}) {
  const [floor, setFloor] = useState(initialFloor);
  const [roomId, setRoomId] = useState<number | null>(initialRoomId);
  const [date, setDate] = useState(today);
  const [picked, setPicked] = useState<number[]>([]);
  const [slots, setSlots] = useState<Slots | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [done, setDone] = useState<Done | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");

  const floorButtons = useRef<Record<number, HTMLButtonElement | null>>({});
  const refocusFloor = useRef(false);
  const steps = useRef<HTMLDivElement>(null);
  const dateSection = useRef<HTMLElement>(null);
  const hoursSection = useRef<HTMLElement>(null);
  const detailsSection = useRef<HTMLElement>(null);
  const scrollTimer = useRef<number | undefined>(undefined);

  const room = rooms.find((r) => r.id === roomId) ?? null;
  const locked = room === null;
  const max = addDays(today, MAX_DAYS_AHEAD);

  const [state, formAction, pending] = useActionState<BookState, FormData>(
    async (prev, form) => {
      if (roomId === null) return { error: "Please pick a room first." };
      const next = await book(roomId, prev, form);
      if (next.done) {
        setDone(next.done);
        setRefresh((n) => n + 1);
      } else {
        setNotice(next.error ?? "");
        if (next.slotTaken) {
          setPicked([]);
          setRefresh((n) => n + 1);
        }
      }
      return next;
    },
    {},
  );

  const slotsKey = roomId === null ? null : `${roomId}|${date}`;

  useEffect(() => {
    if (roomId === null || done) return;
    const key = `${roomId}|${date}`;
    let stale = false;
    getTaken(roomId, date)
      .then((result) => {
        if (stale) return;
        if ("error" in result) {
          setSlots({ key, taken: [], pastUntil: -1, error: result.error });
        } else {
          setSlots({ key, taken: result.taken, pastUntil: result.pastUntil });
        }
      })
      .catch(() => {
        if (!stale) {
          setSlots({
            key,
            taken: [],
            pastUntil: -1,
            error: "We couldn't load the times. Please try again.",
          });
        }
      });
    return () => {
      stale = true;
    };
  }, [roomId, date, refresh, done]);

  useEffect(() => {
    if (!done && refocusFloor.current) {
      refocusFloor.current = false;
      floorButtons.current[floor]?.focus();
    }
  }, [done, floor]);

  useEffect(() => {
    window.dispatchEvent(new Event(pending ? "progress:start" : "progress:finish"));
  }, [pending]);

  useEffect(() => () => window.clearTimeout(scrollTimer.current), []);

  const ready = slots !== null && slots.key === slotsKey && !slots.error;
  const slotError = slots !== null && slots.key === slotsKey ? slots.error : undefined;
  const unavailable = (h: number) =>
    !ready || slots.taken.includes(h) || h <= slots.pastUntil;
  const chosen = picked.some(unavailable) ? [] : picked;

  function scrollToSection(target: () => HTMLElement | null, delay: number) {
    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      const el = target();
      if (!el) return;
      const behavior = prefersReducedMotion() ? "auto" : "smooth";
      const box = steps.current;
      if (box && window.matchMedia("(min-width: 1024px)").matches) {
        const top = box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top;
        box.scrollTo({ top, behavior });
      } else {
        window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 76, behavior });
      }
    }, delay);
  }

  function pickRoom(id: number) {
    if (id === roomId) return;
    const first = roomId === null;
    setRoomId(id);
    setPicked([]);
    setNotice("");
    if (first) scrollToSection(() => dateSection.current, 120);
  }

  function pickDate(next: string) {
    if (next === date) return;
    setDate(next);
    setPicked([]);
    setNotice("");
    scrollToSection(() => hoursSection.current, 180);
  }

  function pickHour(h: number) {
    const next = nextHours(chosen, h, unavailable);
    setPicked(next);
    setNotice("");
    if (chosen.length === 0 && next.length > 0) scrollToSection(() => detailsSection.current, 1500);
    else window.clearTimeout(scrollTimer.current);
  }

  function clearError(name: string) {
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name as keyof FieldErrors];
      return next;
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (roomId === null || chosen.length === 0) {
      e.preventDefault();
      return;
    }
    window.clearTimeout(scrollTimer.current);
    setNotice("");
    const data = new FormData(e.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim();
    const found = validateFields({
      name: text("name"),
      email: text("email").toLowerCase(),
      contact: text("contact"),
      consent: data.get("consent") === "on",
    });
    setErrors(found);
    const first = FIELD_ORDER.find((key) => found[key]);
    if (!first) return;
    e.preventDefault();
    setNotice("Please check your details above.");
    const el = e.currentTarget.elements.namedItem(first) as HTMLElement | null;
    if (!el) return;
    el.focus({ preventScroll: true });
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    const box = steps.current;
    if (box && window.matchMedia("(min-width: 1024px)").matches) {
      const top = box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top - 60;
      box.scrollTo({ top, behavior });
    } else {
      el.scrollIntoView({ block: "center", behavior });
    }
  }

  function again() {
    refocusFloor.current = true;
    window.clearTimeout(scrollTimer.current);
    setDone(null);
    setRoomId(null);
    setPicked([]);
    setDate(today);
    setSlots(null);
    setNotice("");
    setErrors({});
  }

  const hoursMeta = chosen.length
    ? `${chosen.length} ${chosen.length === 1 ? "hour" : "hours"} picked`
    : slotError
      ? "Couldn't load"
      : ready
        ? ""
        : "Checking times…";

  return (
    <>
      {!done && (
        <div className="mb-4">
          <h1
            style={{ animationDelay: "100ms" }}
            className="rise text-[30px] leading-[1.08] font-medium tracking-[-0.035em] text-navy md:text-[32px]"
          >
            Book a room
          </h1>
          <p
            style={{ animationDelay: "200ms" }}
            className="rise mt-1 text-[15px] tracking-[-0.01em] text-ink-muted"
          >
            Pick a room below, pick a date, then choose how long your meeting is.
          </p>
        </div>
      )}
      <section
        aria-label="Booking workspace"
        style={{ animationDelay: "420ms" }}
        className={`rise-desk relative rounded-xl bg-mist p-3 ${
          done
            ? "lg:h-[max(460px,calc(100dvh_-_136px))]"
            : "lg:h-[max(520px,calc(100dvh_-_212px))]"
        }`}
      >
        {done ? (
          <Success done={done} onAgain={again} />
        ) : (
          <div className="flex flex-col gap-3 lg:grid lg:h-full lg:grid-cols-[64px_minmax(0,1fr)_340px]">
            <nav
              aria-label="Floors"
              style={{ animationDelay: "540ms" }}
              className="rise grid grid-cols-6 gap-1.5 lg:flex lg:flex-col-reverse lg:justify-center lg:gap-2"
            >
              {FLOORS.map((n) => {
                const current = n === floor;
                const open = OPEN_FLOORS.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    ref={(el) => {
                      floorButtons.current[n] = el;
                    }}
                    disabled={!open}
                    aria-pressed={open ? current : undefined}
                    aria-label={`${n}F, ${FLOOR_NAMES[n]} floor${open ? "" : ", not available yet"}`}
                    onClick={() => setFloor(n)}
                    className={`relative grid h-[48px] place-items-center rounded-[10px] border text-base font-bold tracking-[0.01em] lg:h-14 lg:w-16 lg:text-[17px] ${motion} ${
                      !open
                        ? "cursor-not-allowed border-transparent bg-line/70 text-outline"
                        : current
                          ? "border-brand-strong bg-brand-strong text-navy-ink shadow-[0_10px_22px_-12px] shadow-brand-strong/75"
                          : "border-surface/90 bg-surface/60 text-navy hover:border-surface hover:bg-surface hover:shadow-[0_8px_18px_-12px] hover:shadow-navy/45 hover:ring-3 hover:ring-brand/15"
                    }`}
                  >
                    {n}F
                  </button>
                );
              })}
            </nav>

            <FloorPlan floor={floor} rooms={rooms} picked={room} onPick={pickRoom} />

            {locked ? (
              <div aria-hidden="true" className="hidden lg:block" />
            ) : (
              <div className="rise-desk relative flex min-h-0 min-w-0 flex-col gap-3">
                <div
                  ref={steps}
                  className="flex min-w-0 flex-col gap-2.5 lg:-mr-1.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:rounded-lg lg:pr-1.5 lg:overscroll-contain lg:[scrollbar-color:var(--color-outline-soft)_transparent] lg:[scrollbar-width:thin]"
                >
                  <section
                    ref={dateSection}
                    aria-labelledby="section-date"
                    className="flex-none rounded-lg bg-surface p-3.5"
                  >
                    <SectionHead id="section-date" title="Date" />
                    <div aria-hidden="true" className="mb-3 h-px bg-line" />
                    <Calendar today={today} max={max} value={date} onPick={pickDate} />
                  </section>

                  <section
                    ref={hoursSection}
                    aria-labelledby="section-hours"
                    className="flex-none rounded-lg bg-surface p-3.5"
                  >
                    <SectionHead id="section-hours" title="Time">
                      <span className="ml-auto text-[13px] font-medium whitespace-nowrap text-ink-muted">
                        {hoursMeta}
                      </span>
                    </SectionHead>
                    <div role="group" aria-label="Choose your hours" className="flex flex-col gap-1.5">
                      {HOURS.map((h) => {
                        const bad = unavailable(h);
                        const on = !bad && chosen.includes(h);
                        return (
                          <button
                            key={h}
                            type="button"
                            aria-pressed={on}
                            aria-label={`${formatHour24(h)} to ${formatHour24(h + 1)}${
                              bad && ready
                                ? h <= (slots?.pastUntil ?? -1)
                                  ? ", past"
                                  : ", taken"
                                : ""
                            }`}
                            disabled={bad}
                            onClick={() => pickHour(h)}
                            className={`flex min-h-11 w-full items-center justify-center rounded-md border text-sm font-medium tabular-nums lg:min-h-9 ${motion} ${
                              bad
                                ? "cursor-not-allowed border-mist bg-mist text-ink-muted line-through"
                                : on
                                  ? "border-brand-strong bg-brand-strong text-navy-ink"
                                  : "border-line bg-surface text-ink hover:border-brand hover:bg-brand-soft hover:ring-3 hover:ring-brand/15"
                            }`}
                          >
                            {slotLabel(h)}
                          </button>
                        );
                      })}
                    </div>
                    {slotError && (
                      <p role="alert" className="mt-2.5 text-[13px] font-semibold text-danger">
                        {slotError}{" "}
                        <button
                          type="button"
                          onClick={() => setRefresh((n) => n + 1)}
                          className="rounded-sm font-semibold text-brand-strong underline hover:text-navy motion-safe:transition-colors motion-safe:duration-250"
                        >
                          Try again
                        </button>
                      </p>
                    )}
                    <div aria-hidden="true" className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <i className="size-3 rounded-[3px] border border-outline-soft bg-surface" />
                        Open
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <i className="size-3 rounded-[3px] border border-brand-strong bg-brand-strong" />
                        Yours
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <i className="size-3 rounded-[3px] border border-outline-soft bg-mist" />
                        Taken
                      </span>
                    </div>
                  </section>

                  <section
                    ref={detailsSection}
                    aria-labelledby="section-details"
                    className="flex-none rounded-lg bg-surface p-3.5"
                  >
                    <SectionHead id="section-details" title="Your details" />
                    <form
                      id="details"
                      action={formAction}
                      noValidate
                      onSubmit={onSubmit}
                      onChange={(e) => {
                        if (e.target instanceof HTMLInputElement) clearError(e.target.name);
                      }}
                      className="flex flex-col gap-2.5"
                    >
                      <input type="hidden" name="date" value={date} />
                      {chosen.map((h) => (
                        <input key={h} type="hidden" name="hours" value={h} />
                      ))}
                      <TextField
                        name="name"
                        label="Name"
                        hint="required"
                        autoComplete="name"
                        required
                        defaultValue={state.values?.name}
                        error={errors.name}
                      />
                      <TextField
                        name="email"
                        label="Email"
                        hint="required"
                        type="email"
                        autoComplete="email"
                        required
                        defaultValue={state.values?.email}
                        error={errors.email}
                      />
                      <TextField
                        name="contact"
                        label="Contact number"
                        hint="required"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="0917 123 4567"
                        required
                        defaultValue={state.values?.contact}
                        error={errors.contact}
                      />
                      <TextField
                        name="dgroupLeader"
                        label="D-Group leader"
                        hint="optional"
                        autoComplete="off"
                        defaultValue={state.values?.dgroupLeader}
                      />
                      <div className="flex flex-col gap-1">
                        <label htmlFor="field-notes" className="text-[13px] font-semibold">
                          Notes <small className="text-xs font-medium text-ink-muted">(optional)</small>
                        </label>
                        <textarea
                          id="field-notes"
                          name="notes"
                          rows={3}
                          maxLength={500}
                          placeholder="Enter anything you want the staff to know..."
                          defaultValue={state.values?.notes}
                          className={`resize-y py-2 ${fieldClass}`}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label
                          className={`flex cursor-pointer items-start gap-2.5 rounded-md bg-brand-soft p-2.5 text-[13px] leading-[1.45] text-ink hover:bg-brand-tint ${motion} ${
                            errors.consent ? "inset-ring-[1.5px] inset-ring-danger" : ""
                          }`}
                        >
                          <input
                            name="consent"
                            type="checkbox"
                            required
                            autoComplete="off"
                            aria-describedby="field-consent-error"
                            aria-invalid={errors.consent ? true : undefined}
                            className="mt-px size-[18px] flex-none cursor-pointer accent-brand-strong"
                          />
                          <span>
                            I agree that my name, email and contact number will be stored
                            and used only to manage this room booking.
                          </span>
                        </label>
                        <FieldError id="field-consent-error" message={errors.consent} />
                      </div>
                    </form>
                  </section>
                </div>

                <aside
                  aria-label="Reservation information"
                  className="fixed inset-x-3 bottom-3 z-20 mx-auto grid max-w-[720px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg bg-navy py-3 pr-3 pl-4 text-navy-ink shadow-[0_18px_40px_-24px] shadow-navy/90 lg:static lg:mx-0 lg:block lg:max-w-none lg:flex-none lg:p-4"
                >
                  <div aria-live="polite" className="min-w-0">
                    <p className="hidden text-[11px] font-semibold tracking-[0.08em] text-brand-tint uppercase lg:block">
                      Reservation Information
                    </p>
                    <p className="truncate text-[15px] font-bold tracking-[-0.01em] lg:mt-2 lg:text-base">
                      {room.name} · Floor {room.floor}
                    </p>
                    <p className="truncate text-[13px] leading-[1.35] text-navy-ink/85 lg:mt-0.5 lg:text-sm">
                      {longDate.format(asDate(date))}
                    </p>
                    <p className="truncate text-[13px] leading-[1.35] text-navy-ink/85 lg:text-sm">
                      {chosen.length ? formatRange24(chosen) : "Pick your time"}
                    </p>
                  </div>
                  <button
                    type="submit"
                    form="details"
                    disabled={pending || chosen.length === 0}
                    className={`group inline-flex min-h-11 min-w-[120px] items-center justify-center gap-2 rounded-pill px-[22px] text-[15px] font-semibold disabled:cursor-not-allowed disabled:bg-surface/12 disabled:text-navy-ink/60 lg:mt-3 lg:w-full ${
                      pending
                        ? "cursor-progress bg-brand-tint text-navy"
                        : "bg-surface text-navy enabled:hover:bg-brand-tint enabled:hover:ring-3 enabled:hover:ring-brand-tint/35"
                    } motion-safe:transition-[background-color,color,box-shadow] motion-safe:duration-300 motion-safe:delay-75`}
                  >
                    {pending ? "Reserving…" : "Reserve"}
                    {pending ? (
                      <span
                        aria-hidden="true"
                        className="size-4 rounded-full border-2 border-navy/25 border-t-navy motion-safe:animate-spin"
                      />
                    ) : (
                      <Arrow className="group-enabled:group-hover:translate-x-[3px]" />
                    )}
                  </button>
                  <p
                    role="alert"
                    className="col-span-full text-[13px] font-semibold text-brand-tint empty:hidden lg:mt-2"
                  >
                    {notice}
                  </p>
                </aside>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
