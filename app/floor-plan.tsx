"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { FLOOR_PLANS, type PlanShape, type Range } from "@/lib/floorplans";

type PlanBounds = readonly [number, number, number, number];
type Box = { w: number; h: number; pad: number };
type Room = { id: number; name: string; floor: number; pax: number | null };

const LEAVE_MS = 520;
const PAD_DESKTOP = 16;
const PAD_PHONE = 10;

const motion =
  "motion-safe:transition-[background-color,border-color,box-shadow,color] motion-safe:duration-250 motion-safe:ease-out";

export function place(x: Range, y: Range, b: PlanBounds) {
  const w = b[2] - b[0];
  const h = b[3] - b[1];
  return {
    left: `${((x[0] - b[0]) / w) * 100}%`,
    top: `${((y[0] - b[1]) / h) * 100}%`,
    width: `${((x[1] - x[0]) / w) * 100}%`,
    height: `${((y[1] - y[0]) / h) * 100}%`,
  };
}

function ratioOf(floor: number): number {
  const plan = FLOOR_PLANS[floor] ?? FLOOR_PLANS[1];
  if (!plan) return 1;
  return (plan.bounds[2] - plan.bounds[0]) / (plan.bounds[3] - plan.bounds[1]);
}

function fit(floor: number, box: Box) {
  const r = ratioOf(floor);
  const availW = Math.max(box.w - 2 * box.pad, 120);
  const availH = Math.max(box.h - 2 * box.pad, 120);
  const pw = Math.min(availW, availH * r, 640);
  const ph = pw / r;
  return {
    pw: Math.round(pw),
    ph: Math.round(ph),
    sw: Math.round(pw + 2 * box.pad),
    sh: Math.round(ph + 2 * box.pad),
  };
}

const SHAPE_CLASS: Record<Exclude<PlanShape["kind"], "elevator">, string> = {
  block: "rounded-sm border-[1.5px] border-outline-soft bg-surface/50",
  space: "rounded-md border-[1.5px] border-dashed border-outline",
};

export function Shape({ shape, bounds }: { shape: PlanShape; bounds: PlanBounds }) {
  const style = place(shape.x, shape.y, bounds);
  if (shape.kind === "elevator") {
    return (
      <div
        aria-hidden="true"
        style={style}
        className="absolute box-border flex flex-col items-center gap-[3px] rounded-[4px] border-[1.5px] border-outline bg-surface/80 p-[3px]"
      >
        <div className="box-border h-1.5 w-[34%] rounded-xs border-[1.5px] border-outline" />
        <div className="flex w-full flex-1 gap-0.5">
          <div className="box-border flex-1 rounded-xs border-[1.5px] border-outline bg-linear-to-r from-mist to-line" />
          <div className="box-border flex-1 rounded-xs border-[1.5px] border-outline bg-linear-to-r from-line to-mist" />
        </div>
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      style={style}
      className={`absolute box-border ${SHAPE_CLASS[shape.kind]}`}
    />
  );
}

export function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="absolute top-[7%] right-[7%] size-[1.05em]"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Layer({
  floor,
  box,
  rooms,
  pickedId,
  onPick,
  leaving,
}: {
  floor: number;
  box: Box;
  rooms: Room[];
  pickedId: number | null;
  onPick: (id: number) => void;
  leaving: boolean;
}) {
  const plan = FLOOR_PLANS[floor];
  const label = `${floor}F`;
  const size = fit(floor, box);
  const style: CSSProperties = {
    width: size.pw,
    height: size.ph,
    fontSize: Math.max(10.5, Math.min(14, size.pw / 36)),
  };
  const idByName = new Map(
    rooms.filter((r) => r.floor === floor).map((r) => [r.name, r.id]),
  );

  return (
    <div
      inert={leaving}
      aria-hidden={leaving ? true : undefined}
      style={style}
      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${leaving ? "plan-out" : "plan-in"}`}
    >
      {plan ? (
        <>
          {plan.shapes.map((shape, i) => (
            <Shape key={i} shape={shape} bounds={plan.bounds} />
          ))}
          {plan.rooms.map((r) => {
            const id = idByName.get(r.name);
            const on = id !== undefined && id === pickedId;
            return (
              <button
                key={r.name}
                type="button"
                disabled={id === undefined}
                aria-pressed={id === undefined ? undefined : on}
                aria-label={
                  id === undefined
                    ? `${r.name}, ${label}, unavailable`
                    : `${r.name}, ${label}`
                }
                onClick={() => {
                  if (id !== undefined) onPick(id);
                }}
                style={place(r.x, r.y, plan.bounds)}
                className={`absolute box-border flex items-center justify-center rounded-md border-[1.5px] p-0.5 text-center leading-[1.15] font-semibold ${motion} ${
                  id === undefined
                    ? "cursor-not-allowed border-outline-soft bg-transparent text-ink-muted"
                    : on
                      ? "border-brand-strong bg-brand-strong text-navy-ink shadow-[0_12px_24px_-12px] shadow-brand-strong/80"
                      : "border-outline bg-surface/90 text-navy hover:border-brand hover:bg-surface hover:text-brand-strong hover:shadow-[0_10px_20px_-14px] hover:shadow-navy/50 hover:ring-3 hover:ring-brand/20"
                }`}
              >
                {on && <CheckMark />}
                <span>{r.name}</span>
              </button>
            );
          })}
        </>
      ) : (
        <div className="absolute inset-0 box-border flex flex-col items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-outline p-6 text-center">
          <span className="mb-1.5 grid size-12 place-items-center rounded-lg bg-surface/75 text-brand-strong">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-6"
            >
              <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
              <path d="M9 3v15M15 6v15" />
            </svg>
          </span>
          <strong className="text-lg font-semibold tracking-[-0.01em] text-navy">
            No floor plan yet
          </strong>
          <span className="max-w-[30ch] text-sm text-ink-muted">
            Rooms on {label} will appear here once the plan is added.
          </span>
        </div>
      )}
    </div>
  );
}

function RoomInfo({ room }: { room: Room }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const rows: { label: string; value: string | null }[] = [
    { label: "Room", value: room.name },
    { label: "Floor", value: `${room.floor}F` },
    { label: "Pax", value: room.pax === null ? null : String(room.pax) },
  ];

  return (
    <span
      ref={wrap}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
      className="relative inline-flex min-w-0"
    >
      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-pill bg-brand-soft py-[3px] pr-1 pl-3 text-[13px] font-semibold whitespace-nowrap text-brand-strong">
        <svg
          aria-hidden="true"
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
        <span className="truncate">{room.name}</span>
        <button
          ref={trigger}
          type="button"
          aria-label="Room information"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((v) => !v)}
          className={`relative grid size-6 flex-none place-items-center rounded-pill after:absolute after:-inset-1 after:content-[''] ${motion} ${
            open
              ? "bg-navy text-navy-ink"
              : "text-brand-strong hover:bg-brand-tint"
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
            className="size-4"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5.5" />
            <path d="M12 7.6v.01" />
          </svg>
        </button>
      </span>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Room information"
          className="absolute top-full right-0 z-30 mt-2.5 w-58 rounded-lg bg-navy px-4 pt-3.5 pb-1.5 text-navy-ink shadow-[0_18px_40px_-24px] shadow-navy/90 motion-safe:animate-[fade-in_150ms_ease-out]"
        >
          <span
            aria-hidden="true"
            className="absolute -top-1.5 right-2.5 size-3 rotate-45 rounded-[2px] bg-navy"
          />
          <div className="relative flex items-center justify-between gap-2 pb-2">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-brand-tint uppercase">
              Room information
            </p>
            <button
              type="button"
              aria-label="Close room information"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
              className={`-my-1 -mr-1.5 grid size-6 place-items-center rounded-pill text-brand-tint hover:bg-navy-ink/10 hover:text-navy-ink ${motion}`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <dl className="relative">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-baseline justify-between gap-3 border-t border-navy-ink/15 py-2.5"
              >
                <dt className="text-[13px] text-brand-tint">{r.label}</dt>
                <dd
                  className={`text-right ${
                    r.value === null
                      ? "text-[13px] font-medium text-brand-tint"
                      : "text-[15px] font-semibold"
                  }`}
                >
                  {r.value ?? "Not set yet"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </span>
  );
}

export default function FloorPlan({
  floor,
  rooms,
  picked,
  onPick,
}: {
  floor: number;
  rooms: Room[];
  picked: Room | null;
  onPick: (id: number) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [shown, setShown] = useState(floor);
  const [leaving, setLeaving] = useState<number[]>([]);

  if (shown !== floor) {
    setLeaving([shown, ...leaving.filter((f) => f !== shown && f !== floor)]);
    setShown(floor);
  }

  useEffect(() => {
    if (leaving.length === 0) return;
    const timer = window.setTimeout(() => setLeaving([]), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setBox({
        w: el.clientWidth,
        h: el.clientHeight,
        pad: window.matchMedia("(min-width: 1024px)").matches
          ? PAD_DESKTOP
          : PAD_PHONE,
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plan = FLOOR_PLANS[floor];
  const label = `${floor}F`;
  const roomCount = plan
    ? plan.rooms.filter((r) =>
        rooms.some((x) => x.floor === floor && x.name === r.name),
      ).length
    : 0;
  const stage = box ? fit(floor, box) : null;
  const layers = [floor, ...leaving.filter((f) => f !== floor)];

  return (
    <section
      aria-labelledby="plan-title"
      style={{ animationDelay: "620ms" }}
      className="rise flex min-h-0 min-w-0 flex-col rounded-lg bg-surface p-3.5 lg:px-4 lg:pt-3.5 lg:pb-4"
    >
      <div className="mb-2.5 flex min-h-8 items-center justify-between gap-2.5">
        <h2
          id="plan-title"
          aria-live="polite"
          className="text-lg leading-tight font-semibold tracking-[-0.02em] whitespace-nowrap md:text-xl"
        >
          {label}{" "}
          <span className="text-sm font-medium tracking-normal text-ink-muted">
            ·{" "}
            {plan
              ? `${roomCount} ${roomCount === 1 ? "room" : "rooms"}`
              : "Plan coming soon"}
          </span>
        </h2>
        {picked && <RoomInfo key={picked.id} room={picked} />}
      </div>

      <div
        ref={frame}
        className="relative aspect-[0.9] max-h-[62dvh] flex-none lg:aspect-auto lg:max-h-none lg:min-h-0 lg:flex-1"
      >
        <div
          style={
            stage ? { width: stage.sw, height: stage.sh } : { width: 0, height: 0 }
          }
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-brand-soft ${
            leaving.length > 0
              ? "motion-safe:transition-[width,height] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.2,0.7,0.2,1)]"
              : ""
          }`}
        >
          {box &&
            layers.map((f) => (
              <Layer
                key={f}
                floor={f}
                box={box}
                rooms={rooms}
                pickedId={picked?.id ?? null}
                onPick={onPick}
                leaving={f !== floor}
              />
            ))}
        </div>
      </div>
    </section>
  );
}
