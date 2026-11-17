"use client";

import type { ReactNode } from "react";
import {
  DateCard,
  DemoFrame,
  DetailsCard,
  Fade,
  FIELDS,
  FILLED,
  Floors,
  PICK_DAY,
  PICK_HOURS,
  PICK_ROOM,
  Plan,
  START,
  Success,
  Summary,
  TimeCard,
  useDemo,
  type DemoApi,
  type Scene,
} from "./booking-demo";

const SW = 650;
const SH = 372;
const STEP_TAKEN = [12, 17];
const DETAIL_KEYS = ["name", "email", "contact"];

const ROOM_START: Scene = { ...START, floor: 2, x: 470, y: 340 };
const ROOM_FINAL: Scene = { ...START, room: true };

const HOURS_START: Scene = { ...START, room: true, x: 300, y: 350 };
const HOURS_FINAL: Scene = { ...HOURS_START, day: PICK_DAY, hours: PICK_HOURS };

const CONFIRM_START: Scene = {
  ...START,
  room: true,
  day: PICK_DAY,
  hours: PICK_HOURS,
  x: 330,
  y: 350,
};
const CONFIRM_FINAL: Scene = { ...CONFIRM_START, typed: FILLED, consent: true, done: true };

async function roomScript({ wait, moveTo, click }: DemoApi) {
  await moveTo("floor-1");
  await click({ floor: 1, hover: null });
  await wait(1100);
  await moveTo(`room-${PICK_ROOM}`);
  await click({ room: true, hover: null });
  await wait(3000);
}

async function hoursScript({ wait, moveTo, click }: DemoApi) {
  await moveTo(`date-${PICK_DAY}`);
  await click({ day: PICK_DAY, hover: null });
  await wait(500);
  await moveTo(`hour-${PICK_HOURS[0]}`);
  await click({ hours: [PICK_HOURS[0]] });
  await wait(300);
  await moveTo(`hour-${PICK_HOURS[PICK_HOURS.length - 1]}`);
  await click({ hours: PICK_HOURS, hover: null });
  await wait(3000);
}

async function confirmScript({ wait, set, moveTo, click, type }: DemoApi) {
  for (const f of FIELDS) {
    if (!DETAIL_KEYS.includes(f.key)) continue;
    await moveTo(`field-${f.key}`, 0.88);
    await click({ focus: f.key, hover: null });
    await type(f.key, f.value);
    await wait(200);
  }
  await moveTo("consent");
  await click({ consent: true, focus: null, hover: null });
  await wait(400);
  await moveTo("reserve");
  await click({ pending: true });
  await wait(1300);
  set({ pending: false, done: true, hover: null, cursorOn: false });
  await wait(3400);
}

function Stage({ s, children }: { s: Scene; children: ReactNode }) {
  return (
    <div className="relative size-full rounded-xl bg-mist p-3">
      <Fade s={s} className="h-full">
        {children}
      </Fade>
    </div>
  );
}

export function StepRoom() {
  const { wrap, canvas, scale, s } = useDemo(SW, SH, roomScript, ROOM_START, ROOM_FINAL);
  return (
    <DemoFrame
      wrap={wrap}
      canvas={canvas}
      scale={scale}
      width={SW}
      height={SH}
      s={s}
      className="absolute inset-0"
    >
      <Stage s={s}>
        <div className="grid h-full grid-cols-[52px_minmax(0,1fr)_196px] gap-3">
          <Floors s={s} compact />
          <Plan s={s} />
          {s.room ? (
            <div className="rise-desk flex min-w-0 flex-col justify-end">
              <Summary s={s} />
            </div>
          ) : (
            <div />
          )}
        </div>
      </Stage>
    </DemoFrame>
  );
}

export function StepHours() {
  const { wrap, canvas, scale, s } = useDemo(SW, SH, hoursScript, HOURS_START, HOURS_FINAL);
  return (
    <DemoFrame
      wrap={wrap}
      canvas={canvas}
      scale={scale}
      width={SW}
      height={SH}
      s={s}
      className="absolute inset-0"
    >
      <Stage s={s}>
        <div className="grid h-full grid-cols-2 items-start gap-3">
          <DateCard s={s} />
          <TimeCard s={s} from={12} to={17} taken={STEP_TAKEN} legend={false} />
        </div>
      </Stage>
    </DemoFrame>
  );
}

export function StepConfirm() {
  const { wrap, canvas, scale, s } = useDemo(SW, SH, confirmScript, CONFIRM_START, CONFIRM_FINAL);
  return (
    <DemoFrame
      wrap={wrap}
      canvas={canvas}
      scale={scale}
      width={SW}
      height={SH}
      s={s}
      className="absolute inset-0"
    >
      <Stage s={s}>
        {s.done ? (
          <Success compact />
        ) : (
          <div className="grid h-full grid-cols-[minmax(0,1fr)_196px] gap-3">
            <DetailsCard s={s} keys={DETAIL_KEYS} notes={false} />
            <div className="flex min-w-0 flex-col justify-end">
              <Summary s={s} />
            </div>
          </div>
        )}
      </Stage>
    </DemoFrame>
  );
}
