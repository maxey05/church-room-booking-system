import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { HOURS, formatRange } from "@/lib/rules";
import { HeroTitle, Reveal } from "./landing-motion";

type Box = {
  l: number;
  t: number;
  w: number;
  h: number;
  kind?: "stairs" | "space" | "picked";
  name?: string;
};

const BOX_CLASS = {
  plain: "border-outline bg-surface/70 text-navy",
  stairs:
    "rounded-md border-outline bg-[repeating-linear-gradient(to_bottom,transparent_0_6px,var(--color-outline-soft)_6px_7.5px)]",
  space: "border-dashed border-outline bg-transparent",
  picked:
    "border-brand-strong bg-brand-strong text-navy-ink shadow-lg shadow-brand-strong/30",
};

const HERO_PLAN: Box[] = [
  { l: 1, t: 1, w: 9, h: 11 },
  { l: 12, t: 4, w: 7, h: 8, kind: "stairs" },
  { l: 21, t: 2, w: 10, h: 10 },
  { l: 33, t: 4, w: 7, h: 8, kind: "stairs" },
  { l: 1, t: 14, w: 50, h: 4 },
  { l: 8, t: 19, w: 35, h: 37, kind: "space" },
  { l: 45, t: 19, w: 35, h: 23, kind: "picked", name: "G7" },
  { l: 45, t: 44, w: 35, h: 37, kind: "space" },
  { l: 8, t: 58, w: 35, h: 23, name: "G4" },
  { l: 82, t: 44, w: 17, h: 18, name: "Singles Lounge" },
  { l: 63, t: 83, w: 17, h: 16, name: "G5" },
];

const STEP_PLAN: Box[] = [
  { l: 6, t: 10, w: 40, h: 44, kind: "space" },
  { l: 50, t: 10, w: 44, h: 34, kind: "picked", name: "G7" },
  { l: 6, t: 60, w: 40, h: 30, name: "G4" },
  { l: 50, t: 50, w: 22, h: 40, kind: "space" },
  { l: 76, t: 50, w: 18, h: 40, name: "G5" },
];

const HERO_SLOTS: [string, "free" | "taken" | "picked"][] = [
  ["7 AM", "free"],
  ["8 AM", "taken"],
  ["9 AM", "taken"],
  ["10 AM", "free"],
  ["11 AM", "free"],
  ["12 PM", "free"],
  ["1 PM", "free"],
  ["2 PM", "picked"],
  ["3 PM", "picked"],
  ["4 PM", "picked"],
  ["5 PM", "free"],
  ["6 PM", "taken"],
];

const STEP_SLOTS: [string, "free" | "taken" | "picked"][] = [
  ["11 AM", "free"],
  ["12 PM", "taken"],
  ["1 PM", "free"],
  ["2 PM", "picked"],
  ["3 PM", "picked"],
  ["4 PM", "picked"],
  ["5 PM", "free"],
  ["6 PM", "taken"],
  ["7 PM", "free"],
];

const SLOT_CLASS = {
  free: "border-line bg-surface text-ink",
  taken: "border-mist bg-mist text-ink-muted line-through",
  picked: "border-brand-strong bg-brand-strong text-navy-ink",
};

const FILL_DELAY = ["delay-700", "delay-900", "delay-1100"];

function boxStyle(b: Box): CSSProperties {
  return {
    left: `${b.l}%`,
    top: `${b.t}%`,
    width: `${b.w}%`,
    height: `${b.h}%`,
  };
}

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover:translate-x-0.5"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function StepLabel({ n }: { n: number }) {
  return (
    <span className="inline-flex rounded-pill border border-outline-soft bg-surface/60 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
      Step {n}
    </span>
  );
}

function StepRow({
  n,
  title,
  text,
  flip = false,
  children,
}: {
  n: number;
  title: string;
  text: string;
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <li>
      <Reveal className="grid items-center gap-3 rounded-card-mobile bg-mist p-3 md:rounded-[28px] md:p-4 lg:grid-cols-2 lg:gap-4">
        <div className={`flex flex-col items-start gap-4 p-4 md:p-6 lg:p-10 ${flip ? "lg:order-2" : ""}`}>
          <StepLabel n={n} />
          <h3 className="text-2xl leading-tight font-semibold tracking-[-0.02em] md:text-[28px]">
            {title}
          </h3>
          <p className="max-w-md text-base text-ink-muted md:text-[17px]">{text}</p>
        </div>
        <div
          aria-hidden="true"
          className="relative h-64 overflow-hidden rounded-[20px] bg-surface md:h-72"
        >
          {children}
        </div>
      </Reveal>
    </li>
  );
}

export default function Home() {
  return (
    <div className="pb-4">
      <section className="pt-8 pb-10 text-center md:pt-20 md:pb-14">
        <HeroTitle className="mx-auto max-w-[15ch] text-[40px] leading-[1.08] font-medium tracking-[-0.035em] text-navy md:text-[64px]" />
        <p className="rise mx-auto mt-5 max-w-xl text-lg tracking-[-0.01em] text-ink-muted [animation-delay:250ms] md:text-xl">
          Book your D-group meetings in CCF Alabang with ease.
        </p>
        <p className="rise mt-4 inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink [animation-delay:400ms]">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="size-4 text-brand-strong"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          Open {formatRange(HOURS)}
        </p>
        <div className="rise mt-8 flex justify-center [animation-delay:550ms]">
          <Link
            href="/rooms"
            className="group inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-pill bg-navy px-7 text-base font-semibold text-navy-ink shadow-navy/40 hover:bg-ink motion-safe:transition-[background-color,transform,box-shadow] motion-safe:duration-150 motion-safe:hover:-translate-y-px motion-safe:hover:shadow-lg sm:w-auto"
          >
            Book a room
            <Arrow />
          </Link>
        </div>
      </section>

      <div
        role="img"
        aria-label="Preview of the booking screen: the first floor plan with room G7 selected and 2:00 PM to 5:00 PM picked"
        className="rise mx-auto max-w-[1000px] overflow-hidden rounded-[20px] border border-line bg-surface shadow-2xl shadow-navy/15 [animation-delay:700ms]"
      >
        <div aria-hidden="true">
          <div className="flex h-9 items-center gap-1.5 border-b border-line bg-bg px-3.5">
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
            <span className="ml-3 rounded-pill bg-mist px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
              1F · Choose a room
            </span>
          </div>
          <div className="grid gap-4 bg-brand-soft p-4 lg:grid-cols-[72px_minmax(0,1fr)_300px] lg:gap-5 lg:p-6">
            <div className="grid grid-cols-6 gap-1.5 lg:flex lg:flex-col-reverse lg:justify-center">
              {[1, 2, 3, 4, 5, 6].map((f) => (
                <span
                  key={f}
                  className={`grid h-9.5 place-items-center rounded-[10px] border text-sm font-bold ${
                    f === 1
                      ? "border-brand-strong bg-brand-strong text-navy-ink"
                      : "border-surface/90 bg-surface/55 text-navy"
                  }`}
                >
                  {f}F
                </span>
              ))}
            </div>
            <div className="relative aspect-4/3 rounded-2xl border border-surface/90 bg-surface/55">
              {HERO_PLAN.map((b, i) => (
                <span
                  key={i}
                  style={boxStyle(b)}
                  className={`absolute grid place-items-center rounded-lg border-[1.5px] text-center text-[11px] leading-tight font-semibold md:text-xs ${BOX_CLASS[b.kind ?? "plain"]}`}
                >
                  {b.name}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-line bg-surface p-3.5">
                <div className="mb-2.5 flex justify-between text-[13px] font-semibold text-navy">
                  <span>Sat, Nov 28</span>
                  <span className="font-medium text-ink-muted">G7</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {HERO_SLOTS.map(([label, state]) => (
                    <span
                      key={label}
                      className={`grid h-8.5 place-items-center rounded-[10px] border text-xs font-medium ${SLOT_CLASS[state]}`}
                    >
                      {state === "picked" ? `${label} ✓` : label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-navy p-3.5 text-[13px] text-navy-ink">
                <p className="text-[15px] font-bold">G7 · Floor 1</p>
                <p className="mt-0.5 opacity-80">Sat, Nov 28 · 2:00 PM – 5:00 PM</p>
                <span className="mt-3 grid h-9.5 place-items-center rounded-pill bg-surface font-semibold text-navy">
                  Continue
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section
        id="how"
        aria-labelledby="how-title"
        className="scroll-mt-20 pt-20 md:pt-28"
      >
        <Reveal className="mx-auto max-w-xl text-center">
          <h2
            id="how-title"
            className="text-3xl leading-tight font-medium tracking-[-0.03em] md:text-[40px]"
          >
            Three steps. <span className="text-brand-strong">That’s it.</span>
          </h2>
          <p className="mt-3.5 text-[17px] text-ink-muted">
            Booking a room takes under two minutes, here’s how to do it:
          </p>
        </Reveal>

        <ol className="mt-10 flex flex-col gap-4 md:mt-12 md:gap-6">
          <StepRow
            n={1}
            title="Pick a room on the map"
            text="Choose a floor, then tap any room on the floor plan. You’ll see exactly where it is in the building."
          >
            <div className="absolute inset-4 rounded-2xl bg-brand-soft">
              {STEP_PLAN.map((b, i) => (
                <span
                  key={i}
                  style={boxStyle(b)}
                  className={`absolute grid place-items-center rounded-lg border-[1.5px] text-xs font-semibold ${BOX_CLASS[b.kind ?? "plain"]} ${
                    b.kind === "picked" ? "pick-room delay-900" : ""
                  }`}
                >
                  {b.name}
                </span>
              ))}
              <svg
                viewBox="0 0 24 24"
                className="tap-cursor absolute top-[30%] left-[70%] size-7 text-navy drop-shadow-md delay-200"
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
          </StepRow>

          <StepRow
            n={2}
            flip
            title="Choose your hours"
            text="Pick a date, then tap one hour or a few in a row. Free hours are white and taken ones are crossed out."
          >
            <div className="absolute inset-0 flex flex-col justify-center gap-4 p-6 md:p-10">
              <div className="flex items-center justify-between text-sm font-semibold text-navy">
                <span>Sat, Nov 28</span>
                <span className="font-medium text-ink-muted">G7 · Floor 1</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {STEP_SLOTS.map(([label, state], i) => {
                  const fill = state === "picked";
                  const order = STEP_SLOTS.slice(0, i).filter(([, s]) => s === "picked").length;
                  return (
                    <span
                      key={label}
                      className={`grid h-10 place-items-center rounded-slot border text-sm font-medium ${SLOT_CLASS[state]} ${
                        fill ? `fill-slot ${FILL_DELAY[order]}` : ""
                      }`}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
              <span className="pop-in self-start rounded-pill bg-navy px-3.5 py-1.5 text-sm font-semibold text-navy-ink delay-1400">
                2:00 PM – 5:00 PM
              </span>
            </div>
          </StepRow>

          <StepRow
            n={3}
            title="Get your confirmation"
            text="Add your name and contact details. A confirmation email with a cancel link arrives right away."
          >
            <div className="absolute inset-0 grid place-items-center bg-brand-soft p-5 md:p-8">
              <div className="mail-card w-full max-w-sm rounded-2xl border border-line bg-surface p-4 shadow-xl shadow-navy/10 delay-300">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 flex-none place-items-center rounded-full bg-brand-soft">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-brand-strong)"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5 delay-800"
                    >
                      <path className="mail-tick" d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">
                      Room reserved: G7 — Sat, Nov 28
                    </p>
                    <p className="text-xs text-ink-muted">CCF Alabang Room Booking</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-[13px] text-ink">
                  <span>Room: G7 (Floor 1)</span>
                  <span>When: Sat, Nov 28, 2:00 PM – 5:00 PM</span>
                  <span className="mt-1.5 font-semibold text-brand-strong underline">
                    Cancel booking
                  </span>
                </div>
              </div>
            </div>
          </StepRow>
        </ol>
      </section>

      <Reveal className="mt-20 rounded-card-mobile bg-navy px-6 py-12 text-center md:mt-28 md:rounded-[28px] md:py-18">
        <h2 className="mx-auto max-w-[22ch] text-3xl leading-tight font-medium tracking-[-0.03em] text-navy-ink md:text-[40px]">
          Ready for your next <span className="whitespace-nowrap">D-group</span> meeting?
        </h2>
        <Link
          href="/rooms"
          className="group mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-pill bg-surface px-7 text-base font-semibold text-navy hover:bg-brand-soft motion-safe:transition-[background-color,transform] motion-safe:duration-150 motion-safe:hover:-translate-y-px"
        >
          Book a room
          <Arrow />
        </Link>
      </Reveal>
    </div>
  );
}
