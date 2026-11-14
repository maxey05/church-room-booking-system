"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { FLOOR_PLANS, type PlanShape, type Range } from "@/lib/floorplans";

type PlanBounds = readonly [number, number, number, number];

function place(x: Range, y: Range, b: PlanBounds) {
  const w = b[2] - b[0];
  const h = b[3] - b[1];
  return {
    left: `${((x[0] - b[0]) / w) * 100}%`,
    top: `${((y[0] - b[1]) / h) * 100}%`,
    width: `${((x[1] - x[0]) / w) * 100}%`,
    height: `${((y[1] - y[0]) / h) * 100}%`,
  };
}

const SHAPE_CLASS: Record<Exclude<PlanShape["kind"], "elevator">, string> = {
  block: "rounded border border-outline md:rounded-md md:border-[1.5px]",
  stairs:
    "rounded border border-outline p-[3px] bg-origin-content bg-clip-content bg-[repeating-linear-gradient(to_bottom,transparent_0_4px,var(--color-outline-soft)_4px_5px)] md:rounded-md md:border-[1.5px] md:p-[5px] md:bg-[repeating-linear-gradient(to_bottom,transparent_0_7px,var(--color-outline-soft)_7px_8.5px)]",
  space:
    "rounded-lg border border-dashed border-outline md:rounded-xl md:border-[1.5px]",
};

const STAGE_WIDTH =
  "relative mx-auto max-w-[580px] w-[min(100%,max(15rem,calc((100dvh_-_24rem)*var(--ratio))))] lg:w-[min(100%,max(18rem,calc((100dvh_-_20rem)*var(--ratio))))]";

function Shape({ shape, bounds }: { shape: PlanShape; bounds: PlanBounds }) {
  const style = place(shape.x, shape.y, bounds);
  if (shape.kind === "elevator") {
    return (
      <div
        aria-hidden="true"
        style={style}
        className="absolute box-border flex flex-col items-center gap-0.5 rounded-[3px] border border-outline bg-surface/80 p-0.5 md:gap-1 md:rounded-[5px] md:border-[1.5px] md:p-1"
      >
        <div className="box-border h-1 w-[34%] rounded-[1px] border border-outline md:h-[7px] md:rounded-sm md:border-[1.5px]" />
        <div className="flex w-full flex-1 gap-px md:gap-0.5">
          <div className="box-border flex-1 rounded-[1px] border border-outline bg-linear-to-r from-mist to-line md:rounded-sm md:border-[1.5px]" />
          <div className="box-border flex-1 rounded-[1px] border border-outline bg-linear-to-r from-line to-mist md:rounded-sm md:border-[1.5px]" />
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

export default function FloorPlan({
  floor,
  rooms,
}: {
  floor: number;
  rooms: { id: number; name: string }[];
}) {
  const [pickedId, setPickedId] = useState<number | null>(null);
  const plan = FLOOR_PLANS[floor];
  const label = `${floor}F`;
  const idByName = new Map(rooms.map((r) => [r.name, r.id]));
  const picked = rooms.find((r) => r.id === pickedId) ?? null;
  const roomCount = plan
    ? plan.rooms.filter((r) => idByName.has(r.name)).length
    : 0;
  const basis = plan ?? FLOOR_PLANS[1];
  const ratio = basis
    ? (basis.bounds[2] - basis.bounds[0]) / (basis.bounds[3] - basis.bounds[1])
    : 1;
  const stageStyle = { aspectRatio: ratio, "--ratio": ratio } as CSSProperties;

  return (
    <section
      aria-label="Floor plan"
      className="relative box-border min-w-0 rounded-[22px] border border-surface/70 bg-surface/50 p-3 shadow-xl shadow-navy/8 lg:w-[720px] lg:flex-none lg:rounded-[30px] lg:px-8 lg:py-6 lg:backdrop-blur-[28px] lg:backdrop-saturate-150"
    >
      <div className="mb-3.5 flex items-center gap-2.5 px-1.5 lg:mb-5 lg:gap-3 lg:px-0">
        <h2 className="text-xl lg:text-[22px]">{label}</h2>
        <span className="rounded-pill bg-brand-tint px-2.5 py-1 text-[13px] font-semibold text-navy lg:px-3 lg:py-1.5">
          {plan
            ? `${roomCount} ${roomCount === 1 ? "room" : "rooms"}`
            : "Plan coming soon"}
        </span>
      </div>

      {plan ? (
        <div className={STAGE_WIDTH} style={stageStyle}>
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
                  if (id !== undefined) setPickedId(id);
                }}
                style={place(r.x, r.y, plan.bounds)}
                className={`absolute box-border flex items-center justify-center rounded-[7px] border-[1.5px] px-0.5 text-center text-xs leading-tight font-semibold motion-safe:transition-[box-shadow,background-color] motion-safe:duration-150 md:rounded-[10px] md:border-2 md:p-1 md:text-sm ${
                  id === undefined
                    ? "cursor-not-allowed border-outline bg-transparent text-ink-muted"
                    : on
                      ? "border-brand-strong bg-brand-strong text-navy-ink"
                      : "border-brand bg-transparent text-brand-strong hover:ring-4 hover:ring-brand/20 hover:ring-inset"
                }`}
              >
                {r.name}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          style={stageStyle}
          className={`${STAGE_WIDTH} box-border flex flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-outline p-5 text-center lg:gap-2 lg:rounded-2xl lg:p-6`}
        >
          <p className="text-lg font-bold lg:text-xl">No floor plan yet</p>
          <p className="max-w-60 text-sm text-ink-muted lg:max-w-[340px] lg:text-[15px]">
            Rooms on {label} will appear here once the plan is added.
          </p>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 border-t border-navy/8 bg-surface/90 px-4 pt-3 pb-7 backdrop-blur-xl lg:static lg:mt-5 lg:flex-row lg:items-center lg:justify-between lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <span
          aria-live="polite"
          className="text-center text-[15px] font-semibold text-ink empty:hidden lg:text-left lg:text-base lg:font-normal"
        >
          {picked ? `${picked.name} · ${label}` : null}
        </span>
        {picked ? (
          <Link
            href={`/rooms/${picked.id}`}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-pill bg-brand-strong px-7 text-base font-semibold text-navy-ink hover:bg-navy lg:ml-auto lg:w-auto lg:text-[15px]"
          >
            Continue
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-pill bg-line px-7 text-base font-semibold text-ink-muted lg:ml-auto lg:w-auto lg:text-[15px]"
          >
            Continue
          </button>
        )}
      </div>
    </section>
  );
}
