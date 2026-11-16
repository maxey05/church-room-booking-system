"use client";

import { useEffect, useRef, useState } from "react";
import { FLOOR_PLANS } from "@/lib/floorplans";
import { HOURS, formatHour24, formatRange24 } from "@/lib/rules";
import { CheckMark, Shape, place } from "./floor-plan";

type Scene = {
  x: number;
  y: number;
  cursorOn: boolean;
  pressing: boolean;
  clicks: number;
  hover: string | null;
  room: boolean;
  day: number;
  hours: number[];
  focus: string | null;
  typed: Record<string, string>;
  consent: boolean;
  pending: boolean;
  done: boolean;
  shown: boolean;
};

const W = 1000;
const H = 700;
const PLAN = FLOOR_PLANS[1];
const PLAN_RATIO = PLAN
  ? (PLAN.bounds[2] - PLAN.bounds[0]) / (PLAN.bounds[3] - PLAN.bounds[1])
  : 1;
const PICK_ROOM = "G7";
const TODAY = 16;
const PICK_DAY = 28;
const DAYS_IN_MONTH = 30;
const PICK_HOURS = [14, 15, 16];
const TAKEN = [8, 9, 18];
const FLOORS = [1, 2, 3, 4, 5, 6];
const OPEN_FLOORS = [1, 2];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MOVE_MS = 800;
const TYPE_MS = 55;

const FIELDS = [
  { key: "name", label: "Name", hint: "required", value: "Anna Reyes", placeholder: "" },
  { key: "email", label: "Email", hint: "required", value: "anna.reyes@gmail.com", placeholder: "" },
  {
    key: "contact",
    label: "Contact number",
    hint: "required",
    value: "0918 555 2741",
    placeholder: "0917 123 4567",
  },
  { key: "leader", label: "D-Group leader", hint: "optional", value: "", placeholder: "" },
];

const START: Scene = {
  x: 700,
  y: 660,
  cursorOn: false,
  pressing: false,
  clicks: 0,
  hover: null,
  room: false,
  day: TODAY,
  hours: [],
  focus: null,
  typed: {},
  consent: false,
  pending: false,
  done: false,
  shown: true,
};

const FINAL: Scene = {
  ...START,
  room: true,
  day: PICK_DAY,
  hours: PICK_HOURS,
  typed: Object.fromEntries(FIELDS.map((f) => [f.key, f.value])),
  consent: true,
};

const motion =
  "motion-safe:transition-[background-color,border-color,box-shadow,color] motion-safe:duration-250 motion-safe:ease-out";

function longDate(day: number): string {
  return `${DAY_NAMES[(day - 1) % 7]}, November ${day}`;
}

function stepLabel(s: Scene): string {
  if (s.done) return `${PICK_ROOM} · Room reserved`;
  if (!s.room) return "1F · Choose a room";
  if (s.day === TODAY) return `${PICK_ROOM} · Pick a date`;
  if (s.hours.length === 0) return `${PICK_ROOM} · Pick your time`;
  return `${PICK_ROOM} · Your details`;
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:delay-75 ${className}`}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
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

function Head({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-2.5 flex min-h-[30px] items-center gap-2.5">
      <p className="text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap text-navy">
        {title}
      </p>
      {meta ? (
        <span className="ml-auto text-[13px] font-medium whitespace-nowrap text-ink-muted">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

function Plan({ s }: { s: Scene }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-lg bg-surface px-4 pt-3.5 pb-4">
      <div className="mb-2.5 flex min-h-8 items-center justify-between gap-2.5">
        <p className="text-lg leading-tight font-semibold tracking-[-0.02em] whitespace-nowrap text-navy">
          1F <span className="text-sm font-medium tracking-normal text-ink-muted">· 4 rooms</span>
        </p>
        {s.room ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft px-3 py-[5px] text-[13px] font-semibold whitespace-nowrap text-brand-strong">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5 flex-none"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            {PICK_ROOM} · 1F picked
          </span>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          style={{ aspectRatio: PLAN_RATIO }}
          className="h-full max-w-full rounded-lg bg-brand-soft p-4"
        >
          {PLAN ? (
            <div className="relative size-full text-xs">
              {PLAN.shapes.map((shape, i) => (
                <Shape key={i} shape={shape} bounds={PLAN.bounds} />
              ))}
              {PLAN.rooms.map((r) => {
                const on = s.room && r.name === PICK_ROOM;
                const hovered = s.hover === `room-${r.name}`;
                return (
                  <span
                    key={r.name}
                    data-target={`room-${r.name}`}
                    style={place(r.x, r.y, PLAN.bounds)}
                    className={`absolute box-border flex items-center justify-center rounded-md border-[1.5px] p-0.5 text-center leading-[1.15] font-semibold ${motion} ${
                      on
                        ? "border-brand-strong bg-brand-strong text-navy-ink shadow-[0_12px_24px_-12px] shadow-brand-strong/80"
                        : hovered
                          ? "border-brand bg-surface text-brand-strong shadow-[0_10px_20px_-14px] shadow-navy/50 ring-3 ring-brand/20"
                          : "border-outline bg-surface/90 text-navy"
                    }`}
                  >
                    {on ? <CheckMark /> : null}
                    <span>{r.name}</span>
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Calendar({ s }: { s: Scene }) {
  const nav = "grid size-8 place-items-center rounded-md border border-line bg-surface text-navy";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`${nav} opacity-40`}>
          <Chevron direction="left" />
        </span>
        <span className="text-sm font-semibold text-navy">November 2026</span>
        <span className={nav}>
          <Chevron direction="right" />
        </span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 pb-0.5 text-center text-[11px] font-semibold tracking-[0.04em] text-ink-muted uppercase">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map((d) => {
          const off = d < TODAY;
          const on = d === s.day;
          const hovered = s.hover === `date-${d}`;
          return (
            <span
              key={d}
              data-target={`date-${d}`}
              className={`grid h-8 place-items-center rounded-md border text-sm font-medium ${motion} ${
                off
                  ? "border-transparent text-outline-soft"
                  : on
                    ? "border-brand-strong bg-brand-strong font-semibold text-navy-ink"
                    : hovered
                      ? "border-brand bg-brand-soft text-ink"
                      : d === TODAY
                        ? "border-outline font-semibold text-navy"
                        : "border-transparent text-ink"
              }`}
            >
              {d}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Hours({ s }: { s: Scene }) {
  const count = s.hours.length;
  return (
    <>
      <Head title="Time" meta={count ? `${count} ${count === 1 ? "hour" : "hours"} picked` : ""} />
      <div className="flex flex-col gap-1.5">
        {HOURS.map((h) => {
          const bad = TAKEN.includes(h);
          const on = s.hours.includes(h);
          const hovered = s.hover === `hour-${h}`;
          return (
            <span
              key={h}
              data-target={`hour-${h}`}
              className={`flex min-h-9 items-center justify-center rounded-md border text-sm font-medium tabular-nums ${motion} ${
                bad
                  ? "border-mist bg-mist text-ink-muted line-through"
                  : on
                    ? "border-brand-strong bg-brand-strong text-navy-ink"
                    : hovered
                      ? "border-brand bg-brand-soft text-ink ring-3 ring-brand/15"
                      : "border-line bg-surface text-ink"
              }`}
            >
              {formatHour24(h)}-{formatHour24(h + 1)}
            </span>
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-muted">
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
    </>
  );
}

function Details({ s }: { s: Scene }) {
  return (
    <>
      <Head title="Your details" />
      <div className="flex flex-col gap-2.5">
        {FIELDS.map((f) => {
          const focused = s.focus === f.key;
          const hovered = s.hover === `field-${f.key}`;
          const text = s.typed[f.key] ?? "";
          return (
            <div key={f.key} className="flex flex-col gap-1">
              <p className="text-[13px] font-semibold text-ink">
                {f.label} <small className="text-xs font-medium text-ink-muted">({f.hint})</small>
              </p>
              <div
                data-target={`field-${f.key}`}
                className={`flex h-9 items-center rounded-md border px-3 text-sm ${motion} ${
                  focused
                    ? "border-brand-strong bg-surface ring-3 ring-brand/20"
                    : hovered
                      ? "border-outline bg-brand-tint"
                      : "border-outline-soft bg-brand-soft"
                }`}
              >
                <span className="truncate text-ink">{text}</span>
                {focused ? <span className="demo-caret" /> : null}
                {!text && f.placeholder ? (
                  <span className="truncate text-ink-muted">{f.placeholder}</span>
                ) : null}
              </div>
            </div>
          );
        })}
        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-semibold text-ink">
            Notes <small className="text-xs font-medium text-ink-muted">(optional)</small>
          </p>
          <div className="h-[70px] rounded-md border border-outline-soft bg-brand-soft px-3 py-2 text-sm text-ink-muted">
            Enter anything you want the staff to know...
          </div>
        </div>
        <div
          className={`flex items-start gap-2.5 rounded-md p-2.5 text-[13px] leading-[1.45] text-ink ${motion} ${
            s.hover === "consent" ? "bg-brand-tint" : "bg-brand-soft"
          }`}
        >
          <span
            data-target="consent"
            className={`mt-px grid size-[18px] flex-none place-items-center rounded-[4px] border-[1.5px] ${motion} ${
              s.consent
                ? "border-brand-strong bg-brand-strong text-navy-ink"
                : "border-outline bg-surface"
            }`}
          >
            {s.consent ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            ) : null}
          </span>
          <span>
            I agree that my name, email and contact number will be stored and used only to
            manage this room booking.
          </span>
        </div>
      </div>
    </>
  );
}

function Summary({ s }: { s: Scene }) {
  const ready = s.hours.length > 0;
  const hovered = s.hover === "reserve";
  return (
    <div className="flex-none rounded-lg bg-navy p-4 text-navy-ink shadow-[0_18px_40px_-24px] shadow-navy/90">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-brand-tint uppercase">
        Reservation Information
      </p>
      <p className="mt-2 text-base font-bold tracking-[-0.01em]">{PICK_ROOM} · Floor 1</p>
      <p className="mt-0.5 text-sm text-navy-ink/85">{longDate(s.day)}</p>
      <p className="text-sm text-navy-ink/85">{ready ? formatRange24(s.hours) : "Pick your time"}</p>
      <span
        data-target="reserve"
        className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-pill px-[22px] text-[15px] font-semibold motion-safe:transition-[background-color,color,box-shadow] motion-safe:duration-300 motion-safe:delay-75 ${
          s.pending
            ? "bg-brand-tint text-navy"
            : !ready
              ? "bg-surface/12 text-navy-ink/60"
              : hovered
                ? "bg-brand-tint text-navy ring-3 ring-brand-tint/35"
                : "bg-surface text-navy"
        }`}
      >
        {s.pending ? "Reserving…" : "Reserve"}
        {s.pending ? (
          <span className="size-4 rounded-full border-2 border-navy/25 border-t-navy motion-safe:animate-spin" />
        ) : (
          <Arrow className={hovered && ready ? "translate-x-[3px]" : ""} />
        )}
      </span>
    </div>
  );
}

function Success() {
  return (
    <div className="absolute inset-4 flex items-center justify-center">
      <div className="rise w-full max-w-[440px] rounded-xl bg-surface p-8 text-center shadow-[0_30px_60px_-36px] shadow-navy/45">
        <div className="tick-draw mx-auto mb-3.5 grid size-14 place-items-center rounded-full bg-sky-soft">
          <svg
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
          <p className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em] whitespace-nowrap text-sky">
            Room reserved!
          </p>
          <div className="mx-[-1rem] mt-[18px] mb-3.5 w-0 min-w-[calc(100%+2rem)] rounded-lg bg-navy px-4 py-3.5 text-left text-navy-ink">
            <p className="font-bold">{PICK_ROOM} · Floor 1</p>
            <p className="mt-1 text-sm text-navy-ink/85">{longDate(PICK_DAY)}</p>
            <p className="text-sm text-navy-ink/85">{formatRange24(PICK_HOURS)}</p>
          </div>
        </div>
        <p className="text-[15px] text-ink-muted">
          A confirmation email will be sent to{" "}
          <strong className="font-semibold text-ink">{FIELDS[1].value}</strong>
        </p>
        <span className="mt-5 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-pill bg-navy px-[18px] text-sm font-semibold text-navy-ink">
          Book another room
          <Arrow className="size-3.5" />
        </span>
      </div>
    </div>
  );
}

export default function BookingDemo() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const steps = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [visible, setVisible] = useState(false);
  const [s, setScene] = useState<Scene>(START);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / W));
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.2,
    });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timers: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
      });
    const set = (patch: Partial<Scene>) => setScene((prev) => ({ ...prev, ...patch }));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timers.push(window.setTimeout(() => setScene(FINAL), 0));
      return () => timers.forEach((t) => window.clearTimeout(t));
    }

    function zoom(): number {
      const root = canvas.current;
      return root ? root.getBoundingClientRect().width / W || 1 : 1;
    }

    function find(id: string): Element | null {
      return canvas.current?.querySelector(`[data-target="${id}"]`) ?? null;
    }

    async function scrollPanel(id: string, always: boolean) {
      const box = steps.current;
      const el = find(id);
      if (!box || !el || !box.contains(el)) return;
      const k = zoom();
      const b = box.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const top = (r.top - b.top) / k;
      const bottom = (r.bottom - b.top) / k;
      if (!always && top >= 8 && bottom <= box.clientHeight - 8) return;
      box.scrollTo({ top: box.scrollTop + top - 12, behavior: "smooth" });
      await wait(700);
    }

    async function moveTo(id: string, fx = 0.5) {
      await scrollPanel(id, false);
      const root = canvas.current;
      const el = find(id);
      if (!root || !el) return;
      const k = zoom();
      const c = root.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      set({
        x: (r.left - c.left + r.width * fx) / k,
        y: (r.top - c.top + r.height / 2) / k,
        hover: null,
      });
      await wait(MOVE_MS);
      set({ hover: id });
      await wait(260);
    }

    async function click(patch: Partial<Scene>) {
      setScene((prev) => ({ ...prev, pressing: true, clicks: prev.clicks + 1 }));
      await wait(140);
      set({ ...patch, pressing: false });
    }

    async function type(key: string, value: string) {
      for (let i = 1; i <= value.length; i++) {
        await wait(TYPE_MS);
        setScene((prev) => ({ ...prev, typed: { ...prev.typed, [key]: value.slice(0, i) } }));
      }
    }

    async function run() {
      await wait(0);
      set({ shown: false, cursorOn: false });
      await wait(450);
      for (;;) {
        setScene(START);
        await wait(900);
        set({ cursorOn: true });
        await wait(300);
        await moveTo(`room-${PICK_ROOM}`);
        await click({ room: true, hover: null });
        await wait(1000);
        await moveTo(`date-${PICK_DAY}`);
        await click({ day: PICK_DAY, hover: null });
        await wait(400);
        await scrollPanel(`hour-${PICK_HOURS[0] - 2}`, true);
        await moveTo(`hour-${PICK_HOURS[0]}`);
        await click({ hours: [PICK_HOURS[0]] });
        await wait(250);
        await moveTo(`hour-${PICK_HOURS[PICK_HOURS.length - 1]}`);
        await click({ hours: PICK_HOURS, hover: null });
        await wait(700);
        await scrollPanel("section-details", true);
        for (const f of FIELDS) {
          if (!f.value) continue;
          await moveTo(`field-${f.key}`, 0.88);
          await click({ focus: f.key, hover: null });
          await type(f.key, f.value);
          await wait(250);
        }
        await moveTo("consent");
        await click({ consent: true, focus: null, hover: null });
        await wait(500);
        await moveTo("reserve");
        await click({ pending: true });
        await wait(1500);
        set({ pending: false, done: true, hover: null, cursorOn: false });
        await wait(3800);
        set({ shown: false });
        await wait(500);
      }
    }

    run();
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [visible]);

  return (
    <div
      ref={wrap}
      role="img"
      aria-label="Preview of the booking screen: a pointer picks room G7 on the first floor, chooses Saturday, November 28 from 14:00 to 17:00, fills in the details and reserves the room"
      className="rise relative mx-auto aspect-[1000/700] max-w-[1000px] overflow-hidden rounded-[20px] border border-line bg-surface shadow-2xl shadow-navy/15 [animation-delay:750ms]"
    >
      <div
        ref={canvas}
        aria-hidden="true"
        style={{
          width: W,
          height: H,
          transform: `scale(${scale})`,
          visibility: scale ? "visible" : "hidden",
        }}
        className="absolute top-0 left-0 origin-top-left select-none"
      >
        <div className="relative flex h-9 items-center gap-1.5 border-b border-line bg-bg px-3.5">
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="ml-3 rounded-pill bg-mist px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
            {stepLabel(s)}
          </span>
          <span
            data-state={s.pending ? "run" : s.done ? "end" : "idle"}
            className="demo-progress absolute inset-x-0 -bottom-px h-[3px]"
          >
            <span className="block h-full rounded-r-[3px] bg-linear-to-r from-brand to-brand-strong shadow-[0_0_10px] shadow-brand/55" />
          </span>
        </div>

        <div className="flex h-[calc(100%-2.25rem)] flex-col bg-bg px-6 pt-5 pb-6">
          <div
            style={{ opacity: s.shown ? 1 : 0 }}
            className="flex min-h-0 flex-1 flex-col motion-safe:transition-opacity motion-safe:duration-400"
          >
            {s.done ? null : (
              <div className="mb-3.5">
                <p className="text-[26px] leading-[1.1] font-medium tracking-[-0.035em] text-navy">
                  Book a room
                </p>
                <p className="mt-1 text-[13px] tracking-[-0.01em] text-ink-muted">
                  Pick a room below, pick a date, then choose how long your meeting is.
                </p>
              </div>
            )}
            <div className="relative min-h-0 flex-1 rounded-xl bg-mist p-3">
              {s.done ? (
                <Success />
              ) : (
                <div className="grid h-full grid-cols-[56px_minmax(0,1fr)_300px] gap-3">
                  <div className="flex flex-col-reverse justify-center gap-2">
                    {FLOORS.map((n) => {
                      const open = OPEN_FLOORS.includes(n);
                      return (
                        <span
                          key={n}
                          className={`grid h-12 place-items-center rounded-[10px] border text-[15px] font-bold tracking-[0.01em] ${
                            !open
                              ? "border-transparent bg-line/70 text-outline"
                              : n === 1
                                ? "border-brand-strong bg-brand-strong text-navy-ink shadow-[0_10px_22px_-12px] shadow-brand-strong/75"
                                : "border-surface/90 bg-surface/60 text-navy"
                          }`}
                        >
                          {n}F
                        </span>
                      );
                    })}
                  </div>

                  <Plan s={s} />

                  {s.room ? (
                    <div className="rise-desk flex min-h-0 min-w-0 flex-col gap-3">
                      <div
                        ref={steps}
                        className="relative flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden rounded-lg"
                      >
                        <div className="flex-none rounded-lg bg-surface p-3.5">
                          <Head title="Date" />
                          <div className="mb-3 h-px bg-line" />
                          <Calendar s={s} />
                        </div>
                        <div className="flex-none rounded-lg bg-surface p-3.5">
                          <Hours s={s} />
                        </div>
                        <div data-target="section-details" className="flex-none rounded-lg bg-surface p-3.5">
                          <Details s={s} />
                        </div>
                      </div>
                      <Summary s={s} />
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            transform: `translate(${s.x}px, ${s.y}px)`,
            opacity: s.cursorOn ? 1 : 0,
          }}
          className="demo-cursor pointer-events-none absolute top-0 left-0 z-30"
        >
          {s.clicks > 0 ? (
            <span
              key={s.clicks}
              className="demo-ripple absolute -top-4 -left-4 size-8 rounded-full border-2 border-brand"
            />
          ) : null}
          <svg
            viewBox="0 0 24 24"
            style={{ scale: s.pressing ? 0.84 : 1 }}
            className="relative -mt-[3px] -ml-[6px] size-7 text-navy drop-shadow-md motion-safe:transition-[scale] motion-safe:duration-150"
          >
            <path
              d="M5 3l14 8-6.2 1.6L9.6 19z"
              fill="currentColor"
              stroke="var(--color-surface)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
