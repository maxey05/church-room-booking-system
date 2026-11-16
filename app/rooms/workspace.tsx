"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  addDays,
  formatDate,
  formatHour,
  formatRange,
  HOURS,
  MAX_DAYS_AHEAD,
  toggleHour,
  validateFields,
  type FieldErrors,
} from "@/lib/rules";
import FloorPlan from "../floor-plan";
import { book, getTaken, type BookState } from "./actions";

type Room = { id: number; name: string; floor: number };
type Slots = { key: string; taken: number[]; pastUntil: number; error?: string };
type Done = NonNullable<BookState["done"]>;

const FLOORS = [1, 2, 3, 4, 5, 6];
const FLOOR_NAMES = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth"];
const FIELD_ORDER = ["name", "email", "contact", "consent"] as const;

const motion =
  "motion-safe:transition-[background-color,border-color,box-shadow,color] motion-safe:duration-250 motion-safe:ease-out";
const arrowMotion =
  "motion-safe:transition-transform motion-safe:duration-300 motion-safe:delay-75";

const shortDay = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });
const shortMonth = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" });
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

function StepHead({
  n,
  id,
  title,
  children,
}: {
  n: number;
  id: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-3 flex min-h-[30px] items-center gap-2.5">
      <span className="inline-flex flex-none rounded-pill border border-outline-soft bg-surface/60 px-2.5 py-[3px] text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
        Step {n}
      </span>
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
    <div className="flex flex-col gap-[5px]">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label} <small className="text-xs font-medium text-ink-muted">({hint})</small>
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-error`}
        className={`min-h-11 w-full rounded-pill border border-outline-soft bg-brand-soft px-4 text-base text-ink placeholder:text-ink-muted hover:border-outline hover:bg-brand-tint focus:border-brand-strong focus:bg-surface focus:ring-3 focus:ring-brand/20 focus:outline-none aria-invalid:border-danger ${motion}`}
        {...input}
      />
      <FieldError id={`${id}-error`} message={error} />
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
        className={`rise w-full max-w-[460px] rounded-3xl bg-surface p-6 text-center shadow-[0_30px_60px_-36px] shadow-navy/45 md:p-9 ${
          done.emailed ? "" : "ring-2 ring-warning"
        }`}
      >
        <div className="tick-draw mx-auto mb-3.5 grid size-[60px] place-items-center rounded-full bg-brand-soft">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-[30px] text-brand-strong"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h2
          ref={heading}
          tabIndex={-1}
          className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em] text-success focus:outline-none"
        >
          Room reserved!
        </h2>
        <div className="mt-[18px] mb-3.5 rounded-[18px] bg-navy px-4 py-3.5 text-left text-navy-ink">
          <p className="font-bold">{done.room}</p>
          <p className="text-sm text-navy-ink/80">{done.when}</p>
        </div>
        {done.emailed ? (
          <p className="text-[15px] text-ink-muted">
            A confirmation email with a cancel link was sent to{" "}
            <strong className="font-semibold [overflow-wrap:anywhere] text-ink">
              {done.email}
            </strong>
            .
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
          className="group mt-[22px] inline-flex min-h-[52px] items-center justify-center gap-2 rounded-pill bg-navy px-7 text-base font-semibold text-navy-ink hover:bg-brand-strong hover:shadow-[0_12px_24px_-14px] hover:shadow-brand-strong/80 motion-safe:transition-[background-color,box-shadow] motion-safe:duration-300 motion-safe:delay-75"
        >
          Book another room
          <Arrow className="group-hover:translate-x-[3px]" />
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
  const strip = useRef<HTMLDivElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);

  const room = rooms.find((r) => r.id === roomId) ?? null;
  const locked = room === null;
  const max = addDays(today, MAX_DAYS_AHEAD);
  const dates = useMemo(
    () => Array.from({ length: MAX_DAYS_AHEAD + 1 }, (_, i) => addDays(today, i)),
    [today],
  );

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
    const el = strip.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      const before = el.scrollLeft;
      el.scrollLeft += e.deltaY;
      if (el.scrollLeft !== before) e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [done]);

  useEffect(() => {
    if (!done && refocusFloor.current) {
      refocusFloor.current = false;
      floorButtons.current[floor]?.focus();
    }
  }, [done, floor]);

  const ready = slots !== null && slots.key === slotsKey && !slots.error;
  const slotError = slots !== null && slots.key === slotsKey ? slots.error : undefined;
  const unavailable = (h: number) =>
    !ready || slots.taken.includes(h) || h <= slots.pastUntil;
  const chosen = picked.some(unavailable) ? [] : picked;

  function pickRoom(id: number) {
    if (id === roomId) return;
    setRoomId(id);
    setPicked([]);
    setNotice("");
  }

  function pickDate(next: string, scroll: boolean) {
    if (dateInput.current) dateInput.current.value = next;
    if (next === date) return;
    setDate(next);
    setPicked([]);
    setNotice("");
    if (scroll) {
      const chip = strip.current?.children[dates.indexOf(next)] as HTMLElement | undefined;
      if (chip && strip.current) {
        strip.current.scrollTo({
          left: chip.offsetLeft - (strip.current.clientWidth - chip.offsetWidth) / 2,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      }
    }
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
    : room
      ? slotError
        ? "Couldn't load"
        : ready
          ? "Tap one or a few"
          : "Checking times…"
      : "1-hour slots";

  return (
    <section
      aria-label="Booking workspace"
      style={{ animationDelay: "420ms" }}
      className="rise-desk relative rounded-[20px] bg-mist p-3 md:rounded-[28px] md:p-4 lg:h-[clamp(600px,calc(100dvh_-_224px),840px)]"
    >
      {done ? (
        <Success done={done} onAgain={again} />
      ) : (
        <div className="flex flex-col gap-3 lg:grid lg:h-full lg:grid-cols-[64px_minmax(0,1fr)_340px] lg:gap-4">
          <nav
            aria-label="Floors"
            style={{ animationDelay: "540ms" }}
            className="rise grid grid-cols-6 gap-1.5 lg:flex lg:flex-col-reverse lg:justify-center lg:gap-2"
          >
            {FLOORS.map((n) => {
              const current = n === floor;
              const hasPlan = n === 1 || n === 2;
              return (
                <button
                  key={n}
                  type="button"
                  ref={(el) => {
                    floorButtons.current[n] = el;
                  }}
                  aria-pressed={current}
                  aria-label={`${n}F, ${FLOOR_NAMES[n]} floor${hasPlan ? "" : ", no plan yet"}`}
                  onClick={() => setFloor(n)}
                  className={`relative grid h-[52px] place-items-center rounded-[14px] border text-base font-bold tracking-[0.01em] lg:h-[60px] lg:w-16 lg:rounded-2xl lg:text-[17px] ${motion} ${
                    current
                      ? "border-brand-strong bg-brand-strong text-navy-ink shadow-[0_10px_22px_-12px] shadow-brand-strong/75"
                      : "border-surface/90 bg-surface/60 text-navy hover:border-surface hover:bg-surface hover:shadow-[0_8px_18px_-12px] hover:shadow-navy/45 hover:ring-3 hover:ring-brand/15"
                  }`}
                >
                  {n}F
                  {hasPlan && (
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-[7px] left-1/2 -ml-0.5 size-1 rounded-full motion-safe:transition-colors motion-safe:duration-250 ${
                        current ? "bg-navy-ink" : "bg-brand"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <FloorPlan floor={floor} rooms={rooms} picked={room} onPick={pickRoom} />

          <div
            style={{ animationDelay: "700ms" }}
            className="rise-desk relative flex min-h-0 min-w-0 flex-col gap-3"
          >
            <div
              role="note"
              className={`absolute top-3.5 left-1/2 z-[3] flex w-max max-w-[calc(100%_-_24px)] -translate-x-1/2 items-center gap-2 rounded-pill bg-navy py-2.5 pr-4 pl-3 text-sm font-semibold text-navy-ink shadow-[0_14px_30px_-14px] shadow-navy/70 motion-safe:transition-[opacity,visibility] motion-safe:duration-300 lg:top-[42%] ${
                locked ? "" : "invisible opacity-0"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="nudge-left hidden size-[18px] flex-none text-brand-tint lg:block"
              >
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="nudge-up size-[18px] flex-none text-brand-tint lg:hidden"
              >
                <path d="M12 19V5M6 11l6-6 6 6" />
              </svg>
              Pick a room on the map to start
            </div>

            <div
              ref={steps}
              inert={locked}
              className={`flex min-w-0 flex-col gap-3 motion-safe:transition-[opacity,filter] motion-safe:duration-300 lg:-mr-1.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:rounded-[20px] lg:pr-1.5 lg:overscroll-contain lg:[scrollbar-color:var(--color-outline-soft)_transparent] lg:[scrollbar-width:thin] ${
                locked ? "opacity-45 saturate-50" : ""
              }`}
            >
              <section aria-labelledby="step-date" className="flex-none rounded-[20px] bg-surface p-3.5 md:p-4">
                <StepHead n={1} id="step-date" title="Date">
                  <span className="ml-auto inline-flex items-center">
                    <label htmlFor="date-input" className="sr-only">
                      Or type a date
                    </label>
                    <input
                      id="date-input"
                      type="date"
                      min={today}
                      max={max}
                      ref={dateInput}
                      defaultValue={today}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!next) return;
                        if (next >= today && next <= max) pickDate(next, true);
                        else e.target.value = date;
                      }}
                      className={`h-11 w-[8.25rem] cursor-pointer rounded-pill border border-line bg-surface px-2.5 text-[13px] font-medium text-ink hover:border-brand hover:bg-brand-soft focus:border-brand-strong focus:ring-3 focus:ring-brand/20 focus:outline-none lg:h-9 ${motion}`}
                    />
                  </span>
                </StepHead>
                <div className="relative -mx-3.5 md:-mx-4">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 bottom-1.5 z-[1] w-[18px] bg-linear-to-r from-surface to-transparent"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 bottom-1.5 z-[1] w-[18px] bg-linear-to-l from-surface to-transparent"
                  />
                  <div
                    ref={strip}
                    role="group"
                    aria-label="Choose a date"
                    className="flex snap-x snap-proximity scroll-px-3.5 gap-1.5 overflow-x-auto px-3.5 pt-[3px] pb-2 md:scroll-px-4 md:px-4 [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]"
                  >
                    {dates.map((d, i) => {
                      const on = d === date;
                      const when = asDate(d);
                      const sub = on ? "text-navy-ink" : "text-ink-muted";
                      return (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={on}
                          aria-label={`${i === 0 ? "Today, " : ""}${longDate.format(when)}`}
                          onClick={() => pickDate(d, false)}
                          className={`flex h-16 w-[52px] flex-none snap-start flex-col items-center justify-center rounded-[14px] border ${motion} ${
                            on
                              ? "border-brand-strong bg-brand-strong shadow-[0_10px_18px_-12px] shadow-brand-strong/80"
                              : "border-line bg-surface hover:border-brand hover:bg-brand-soft hover:ring-3 hover:ring-brand/15"
                          }`}
                        >
                          <span className={`text-[11px] font-semibold tracking-[0.04em] uppercase motion-safe:transition-colors motion-safe:duration-250 ${sub}`}>
                            {i === 0 ? "Today" : shortDay.format(when)}
                          </span>
                          <span
                            className={`text-[19px] leading-[1.15] font-semibold tracking-[-0.02em] motion-safe:transition-colors motion-safe:duration-250 ${on ? "text-navy-ink" : "text-navy"}`}
                          >
                            {Number(d.slice(8))}
                          </span>
                          <span className={`text-[10px] font-semibold motion-safe:transition-colors motion-safe:duration-250 ${sub}`}>
                            {shortMonth.format(when)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section aria-labelledby="step-hours" className="flex-none rounded-[20px] bg-surface p-3.5 md:p-4">
                <StepHead n={2} id="step-hours" title="Hours">
                  <span className="ml-auto text-[13px] font-medium whitespace-nowrap text-ink-muted">
                    {hoursMeta}
                  </span>
                </StepHead>
                <div
                  role="group"
                  aria-label="Choose your hours"
                  className="grid grid-cols-3 gap-1.5 min-[600px]:max-lg:grid-cols-5"
                >
                  {HOURS.map((h) => {
                    const bad = unavailable(h);
                    const on = !bad && chosen.includes(h);
                    return (
                      <button
                        key={h}
                        type="button"
                        aria-pressed={on}
                        disabled={bad}
                        onClick={() => {
                          setPicked(toggleHour(chosen, h));
                          setNotice("");
                        }}
                        className={`relative flex min-h-11 items-center justify-center rounded-xl border text-sm font-medium ${motion} ${
                          bad
                            ? "cursor-not-allowed border-mist bg-mist text-ink-muted line-through"
                            : on
                              ? "border-brand-strong bg-brand-strong text-navy-ink"
                              : "border-line bg-surface text-ink hover:border-brand hover:bg-brand-soft hover:ring-3 hover:ring-brand/15"
                        }`}
                      >
                        {on && (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="absolute left-2.5 size-3.5"
                          >
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        )}
                        {formatHour(h)}
                        {bad && ready && (
                          <span className="sr-only">
                            {h <= (slots?.pastUntil ?? -1) ? " (past)" : " (taken)"}
                          </span>
                        )}
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
                    <i className="size-3 rounded-[4px] border border-outline-soft bg-surface" />
                    Free
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <i className="size-3 rounded-[4px] border border-brand-strong bg-brand-strong" />
                    Yours
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <i className="size-3 rounded-[4px] border border-outline-soft bg-mist" />
                    Taken
                  </span>
                </div>
              </section>

              <section aria-labelledby="step-details" className="flex-none rounded-[20px] bg-surface p-3.5 md:p-4">
                <StepHead n={3} id="step-details" title="Your details" />
                <form
                  id="details"
                  action={formAction}
                  noValidate
                  onSubmit={onSubmit}
                  onChange={(e) => {
                    if (e.target instanceof HTMLInputElement) clearError(e.target.name);
                  }}
                  className="flex flex-col gap-3"
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
                    label="DGroup leader"
                    hint="optional"
                    autoComplete="off"
                    defaultValue={state.values?.dgroupLeader}
                  />
                  <div className="flex flex-col gap-[5px]">
                    <label
                      className={`flex cursor-pointer items-start gap-2.5 rounded-2xl bg-brand-soft p-3 text-[13px] leading-[1.45] text-ink hover:bg-brand-tint ${motion} ${
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
                        className="mt-px size-5 flex-none cursor-pointer accent-brand-strong"
                      />
                      <span>
                        I agree that my name, email and contact number will be stored
                        and used only to manage this room booking, in line with the Data
                        Privacy Act of 2012. <small className="text-xs text-ink-muted">(required)</small>
                      </span>
                    </label>
                    <FieldError id="field-consent-error" message={errors.consent} />
                  </div>
                </form>
              </section>
            </div>

            <aside
              aria-label="Booking summary"
              className="fixed inset-x-3 bottom-3 z-20 mx-auto grid max-w-[720px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-[22px] bg-navy py-3 pr-3 pl-[18px] text-navy-ink shadow-[0_18px_40px_-24px] shadow-navy/90 lg:static lg:mx-0 lg:block lg:max-w-none lg:flex-none lg:rounded-[20px] lg:p-4"
            >
              <div aria-live="polite" className="min-w-0">
                <p className="hidden text-[11px] font-semibold tracking-[0.08em] text-brand-tint uppercase lg:block">
                  Your booking
                </p>
                <p className="truncate text-[15px] font-bold tracking-[-0.01em] lg:mt-1 lg:text-base">
                  {room ? `${room.name} · Floor ${room.floor}` : "No room yet"}
                </p>
                <p className="text-[13px] leading-[1.35] text-navy-ink/80 lg:truncate lg:text-sm">
                  {room ? (
                    <>
                      {formatDate(date)} ·{" "}
                      <span className="whitespace-nowrap">
                        {chosen.length ? formatRange(chosen) : "Pick your hours"}
                      </span>
                    </>
                  ) : (
                    "Pick a room on the map"
                  )}
                </p>
              </div>
              <button
                type="submit"
                form="details"
                disabled={pending || locked || chosen.length === 0}
                className={`group inline-flex min-h-12 min-w-[120px] items-center justify-center gap-2 rounded-pill px-[22px] text-[15px] font-semibold disabled:cursor-not-allowed disabled:bg-surface/12 disabled:text-navy-ink/60 lg:mt-3 lg:w-full ${
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
        </div>
      )}
    </section>
  );
}
