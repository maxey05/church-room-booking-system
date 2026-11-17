"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { FLOOR_PLANS } from "@/lib/floorplans";
import { HOURS, formatHour24, formatRange24 } from "@/lib/rules";
import { CheckMark, Shape, place } from "./floor-plan";

export type Scene = {
  x: number;
  y: number;
  cursorOn: boolean;
  pressing: boolean;
  clicks: number;
  hover: string | null;
  floor: number;
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

export type DemoApi = {
  wait: (ms: number) => Promise<void>;
  set: (patch: Partial<Scene>) => void;
  moveTo: (id: string, fx?: number) => Promise<void>;
  click: (patch: Partial<Scene>) => Promise<void>;
  type: (key: string, value: string) => Promise<void>;
  scrollPanel: (id: string, always: boolean) => Promise<void>;
};


export const PICK_ROOM = "G7";
export const TODAY = 16;
export const PICK_DAY = 28;
export const PICK_HOURS = [14, 15, 16];
export const TAKEN = [8, 9, 18];

const W = 1000;
const H = 700;
const DAYS_IN_MONTH = 30;
const FLOORS = [1, 2, 3, 4, 5, 6];
const OPEN_FLOORS = [1, 2];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MOVE_MS = 800;
const TYPE_MS = 55;

export const FIELDS = [
  { key: "name", label: "Name", hint: "required", value: "Anna Reyes", placeholder: "" },
  { key: "email", label: "Email", hint: "required", value: "anna.reyes@gmail.com", placeholder: "" },
  {
    key: "contact",
    label: "Contact number",
    hint: "required",
    value: "0918 555 2741",
    placeholder: "0917 123 4567",
  },
  { key: "pax", label: "Expected pax", hint: "required", value: "8", placeholder: "8" },
  { key: "leader", label: "D-Group leader", hint: "optional", value: "", placeholder: "" },
];

export const START: Scene = {
  x: 700,
  y: 660,
  cursorOn: false,
  pressing: false,
  clicks: 0,
  hover: null,
  floor: 1,
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

export const FILLED: Record<string, string> = Object.fromEntries(
  FIELDS.map((f) => [f.key, f.value]),
);

const HERO_FINAL: Scene = {
  ...START,
  room: true,
  day: PICK_DAY,
  hours: PICK_HOURS,
  typed: FILLED,
  consent: true,
};

const motion =
  "motion-safe:transition-[background-color,border-color,box-shadow,color] motion-safe:duration-250 motion-safe:ease-out";

function longDate(day: number): string {
  return `${DAY_NAMES[(day - 1) % 7]}, November ${day}`;
}

function stepLabel(s: Scene): string {
  if (s.done) return `${PICK_ROOM} · Approval pending`;
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

function Tick({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
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

export function Floors({ s, compact = false }: { s: Scene; compact?: boolean }) {
  return (
    <div className={`flex flex-col-reverse justify-center ${compact ? "gap-1.5" : "gap-2"}`}>
      {FLOORS.map((n) => {
        const open = OPEN_FLOORS.includes(n);
        const hovered = s.hover === `floor-${n}`;
        return (
          <span
            key={n}
            data-target={`floor-${n}`}
            className={`grid place-items-center rounded-[10px] border text-[15px] font-bold tracking-[0.01em] ${motion} ${
              compact ? "h-11" : "h-12"
            } ${
              !open
                ? "border-transparent bg-line/70 text-outline"
                : n === s.floor
                  ? "border-brand-strong bg-brand-strong text-navy-ink shadow-[0_10px_22px_-12px] shadow-brand-strong/75"
                  : hovered
                    ? "border-surface bg-surface text-navy shadow-[0_8px_18px_-12px] shadow-navy/45 ring-3 ring-brand/15"
                    : "border-surface/90 bg-surface/60 text-navy"
            }`}
          >
            {n}F
          </span>
        );
      })}
    </div>
  );
}

export function Plan({ s }: { s: Scene }) {
  const plan = FLOOR_PLANS[s.floor];
  const ratio = plan ? (plan.bounds[2] - plan.bounds[0]) / (plan.bounds[3] - plan.bounds[1]) : 1;
  const picked = s.room && s.floor === 1;
  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-lg bg-surface px-4 pt-3.5 pb-4">
      <div className="mb-2.5 flex min-h-8 items-center justify-between gap-2.5">
        <p className="text-lg leading-tight font-semibold tracking-[-0.02em] whitespace-nowrap text-navy">
          {s.floor}F{" "}
          <span className="text-sm font-medium tracking-normal text-ink-muted">
            · {plan?.rooms.length ?? 0} rooms
          </span>
        </p>
        {picked ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft py-[3px] pr-1 pl-3 text-[13px] font-semibold whitespace-nowrap text-brand-strong">
            <Tick className="size-3.5 flex-none" />
            {PICK_ROOM}
            <span aria-hidden="true" className="grid size-6 flex-none place-items-center rounded-pill">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5.5" />
                <path d="M12 7.6v.01" />
              </svg>
            </span>
          </span>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          style={{ aspectRatio: ratio }}
          className="h-full max-h-full max-w-full overflow-hidden rounded-lg bg-brand-soft p-4"
        >
          {plan ? (
            <div key={s.floor} className="plan-in relative size-full text-xs">
              {plan.shapes.map((shape, i) => (
                <Shape key={i} shape={shape} bounds={plan.bounds} />
              ))}
              {plan.rooms.map((r) => {
                const on = picked && r.name === PICK_ROOM;
                const hovered = s.hover === `room-${r.name}`;
                return (
                  <span
                    key={r.name}
                    data-target={`room-${r.name}`}
                    style={place(r.x, r.y, plan.bounds)}
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

export function DateCard({ s }: { s: Scene }) {
  const nav = "grid size-8 place-items-center rounded-md border border-line bg-surface text-navy";
  return (
    <div className="flex-none rounded-lg bg-surface p-3.5">
      <Head title="Date" />
      <div className="mb-3 h-px bg-line" />
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

export function TimeCard({
  s,
  from = HOURS[0],
  to = HOURS[HOURS.length - 1],
  taken = TAKEN,
  legend = true,
  className = "",
}: {
  s: Scene;
  from?: number;
  to?: number;
  taken?: number[];
  legend?: boolean;
  className?: string;
}) {
  const count = s.hours.length;
  return (
    <div className={`flex-none rounded-lg bg-surface p-3.5 ${className}`}>
      <Head title="Time" meta={count ? `${count} ${count === 1 ? "hour" : "hours"} picked` : ""} />
      <div className="flex flex-col gap-1.5">
        {HOURS.filter((h) => h >= from && h <= to).map((h) => {
          const bad = taken.includes(h);
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
      {legend ? (
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
      ) : null}
    </div>
  );
}

export function DetailsCard({
  s,
  keys = FIELDS.map((f) => f.key),
  notes = true,
  className = "",
}: {
  s: Scene;
  keys?: string[];
  notes?: boolean;
  className?: string;
}) {
  return (
    <div data-target="section-details" className={`flex-none rounded-lg bg-surface p-3.5 ${className}`}>
      <Head title="Your details" />
      <div className="flex flex-col gap-2.5">
        {FIELDS.filter((f) => keys.includes(f.key)).map((f) => {
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
        {notes ? (
          <div className="flex flex-col gap-1">
            <p className="text-[13px] font-semibold text-ink">
              Notes <small className="text-xs font-medium text-ink-muted">(optional)</small>
            </p>
            <div className="h-[70px] rounded-md border border-outline-soft bg-brand-soft px-3 py-2 text-sm text-ink-muted">
              Enter anything you want the staff to know...
            </div>
          </div>
        ) : null}
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
            {s.consent ? <Tick className="size-3" /> : null}
          </span>
          <span>
            I agree that my name, email and contact number will be stored and used only to
            manage this room booking.
          </span>
        </div>
      </div>
    </div>
  );
}

export function Summary({ s }: { s: Scene }) {
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
        className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-pill px-[22px] text-[15px] font-semibold whitespace-nowrap motion-safe:transition-[background-color,color,box-shadow] motion-safe:duration-300 motion-safe:delay-75 ${
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

export function Success({ compact = false }: { compact?: boolean }) {
  return (
    <div className="absolute inset-3 flex items-center justify-center">
      <div
        className={`rise w-full max-w-[440px] rounded-xl bg-surface text-center shadow-[0_30px_60px_-36px] shadow-navy/45 ${
          compact ? "p-6" : "p-8"
        }`}
      >
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
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </svg>
        </div>
        <div className="mx-auto flex w-fit max-w-full flex-col">
          <p className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em] whitespace-nowrap text-sky">
            Approval pending
          </p>
          <div className="mx-[-1rem] mt-[18px] mb-3.5 w-0 min-w-[calc(100%+2rem)] rounded-lg bg-navy px-4 py-3.5 text-left text-navy-ink">
            <p className="font-bold">{PICK_ROOM} · Floor 1</p>
            <p className="mt-1 text-sm text-navy-ink/85">{longDate(PICK_DAY)}</p>
            <p className="text-sm text-navy-ink/85">{formatRange24(PICK_HOURS)}</p>
          </div>
        </div>
        <p className="text-[15px] text-ink-muted">
          Your hours are held while an admin reviews your request. We&apos;ll email{" "}
          <strong className="font-semibold text-ink">{FIELDS[1].value}</strong> once it&apos;s
          approved or declined.
        </p>
        {compact ? null : (
          <span className="mt-5 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-pill bg-navy px-[18px] text-sm font-semibold text-navy-ink">
            Book another room
            <Arrow className="size-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

export function Fade({ s, className = "", children }: { s: Scene; className?: string; children: ReactNode }) {
  return (
    <div
      style={{ opacity: s.shown ? 1 : 0 }}
      className={`motion-safe:transition-opacity motion-safe:duration-400 ${className}`}
    >
      {children}
    </div>
  );
}

function Cursor({ s }: { s: Scene }) {
  return (
    <div
      style={{ transform: `translate(${s.x}px, ${s.y}px)`, opacity: s.cursorOn ? 1 : 0 }}
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
  );
}

export function useDemo(
  width: number,
  height: number,
  script: (api: DemoApi) => Promise<void>,
  start: Scene,
  final: Scene,
) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [visible, setVisible] = useState(false);
  const [s, setScene] = useState<Scene>(start);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setScale(Math.min(el.clientWidth / width, el.clientHeight / height)),
    );
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.3,
    });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [width, height]);

  useEffect(() => {
    if (!visible) return;
    const timers: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
      });
    const set = (patch: Partial<Scene>) => setScene((prev) => ({ ...prev, ...patch }));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timers.push(window.setTimeout(() => setScene(final), 0));
      return () => timers.forEach((t) => window.clearTimeout(t));
    }

    function zoom(): number {
      const root = canvas.current;
      return root ? root.getBoundingClientRect().width / width || 1 : 1;
    }

    function find(id: string): Element | null {
      return canvas.current?.querySelector(`[data-target="${id}"]`) ?? null;
    }

    async function scrollPanel(id: string, always: boolean) {
      const box = panel.current;
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

    const api: DemoApi = { wait, set, moveTo, click, type, scrollPanel };

    async function run() {
      await wait(0);
      set({ shown: false, cursorOn: false });
      await wait(450);
      for (;;) {
        setScene(start);
        await wait(800);
        set({ cursorOn: true });
        await wait(300);
        await script(api);
        set({ shown: false, cursorOn: false, hover: null });
        await wait(500);
      }
    }

    run();
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [visible, width, height, script, start, final]);

  return { wrap, canvas, panel, scale, s };
}

export function DemoFrame({
  wrap,
  canvas,
  scale,
  width,
  height,
  s,
  label,
  className,
  children,
}: {
  wrap: RefObject<HTMLDivElement | null>;
  canvas: RefObject<HTMLDivElement | null>;
  scale: number;
  width: number;
  height: number;
  s: Scene;
  label?: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={wrap}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`overflow-hidden ${className}`}
    >
      <div
        ref={canvas}
        aria-hidden="true"
        style={{
          width,
          height,
          transform: `translate(-50%, -50%) scale(${scale})`,
          visibility: scale ? "visible" : "hidden",
        }}
        className="absolute top-1/2 left-1/2 select-none"
      >
        {children}
        <Cursor s={s} />
      </div>
    </div>
  );
}

async function heroScript({ wait, set, moveTo, click, type, scrollPanel }: DemoApi) {
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
}

export default function BookingDemo() {
  const { wrap, canvas, panel, scale, s } = useDemo(W, H, heroScript, START, HERO_FINAL);

  return (
    <DemoFrame
      wrap={wrap}
      canvas={canvas}
      scale={scale}
      width={W}
      height={H}
      s={s}
      label="Preview of the booking screen: a pointer picks room G7 on the first floor, chooses Saturday, November 28 from 14:00 to 17:00, fills in the details and reserves the room"
      className="rise relative mx-auto aspect-[1000/700] max-w-[1000px] rounded-[20px] border border-line bg-surface shadow-2xl shadow-navy/15 [animation-delay:750ms]"
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
        <Fade s={s} className="flex min-h-0 flex-1 flex-col">
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
                <Floors s={s} />
                <Plan s={s} />
                {s.room ? (
                  <div className="rise-desk flex min-h-0 min-w-0 flex-col gap-3">
                    <div
                      ref={panel}
                      className="relative flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden rounded-lg"
                    >
                      <DateCard s={s} />
                      <TimeCard s={s} />
                      <DetailsCard s={s} />
                    </div>
                    <Summary s={s} />
                  </div>
                ) : (
                  <div />
                )}
              </div>
            )}
          </div>
        </Fade>
      </div>
    </DemoFrame>
  );
}
