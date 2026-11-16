"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const SEGMENTS = [
  { text: "A room for your dgroup, ", serif: false },
  { text: "booked in ", serif: false },
  { text: "minutes", serif: true },
  { text: ".", serif: false },
];
const FULL = SEGMENTS.map((s) => s.text).join("");
const STARTS = SEGMENTS.map((_, i) =>
  SEGMENTS.slice(0, i).reduce((n, s) => n + s.text.length, 0),
);
const START_DELAY = 400;
const CHAR_DELAY = 45;
const MARK_DELAY = 300;
const PAUSE = 500;
const HOLD = 9000;
const UNMARK_DELAY = 700;
const ERASE_DELAY = 28;
const RETYPE_DELAY = 350;

export function HeroTitle({ className }: { className?: string }) {
  const [typed, setTyped] = useState(0);
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      at(0, () => {
        setTyped(FULL.length);
        setMarked(true);
      });
      return () => timers.forEach((t) => window.clearTimeout(t));
    }

    function typeFrom(i: number) {
      if (i < FULL.length) {
        const next = i + 1;
        at(CHAR_DELAY + (next === STARTS[1] + 1 ? PAUSE : 0), () => {
          setTyped(next);
          typeFrom(next);
        });
        return;
      }
      at(MARK_DELAY, () => {
        setMarked(true);
        at(HOLD, () => {
          setMarked(false);
          at(UNMARK_DELAY, () => erase(FULL.length));
        });
      });
    }

    function erase(i: number) {
      if (i > STARTS[1]) {
        at(ERASE_DELAY, () => {
          setTyped(i - 1);
          erase(i - 1);
        });
        return;
      }
      at(RETYPE_DELAY, () => typeFrom(STARTS[1]));
    }

    at(START_DELAY, () => typeFrom(0));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const caretAt = SEGMENTS.findIndex(
    (s, i) =>
      typed < STARTS[i] + s.text.length ||
      (i === SEGMENTS.length - 1 && typed === FULL.length),
  );

  function segment(i: number) {
    const s = SEGMENTS[i];
    const shown = Math.max(0, Math.min(s.text.length, typed - STARTS[i]));
    return (
      <span
        key={i}
        className={
          s.serif
            ? "font-display text-[1.1em] font-normal tracking-normal italic"
            : undefined
        }
      >
        {s.text.slice(0, shown)}
        {!marked && caretAt === i ? <span className="caret" /> : null}
        <span className="text-transparent">{s.text.slice(shown)}</span>
      </span>
    );
  }

  return (
    <h1 className={className}>
      <span className="sr-only">{FULL}</span>
      <span aria-hidden="true">
        {segment(0)}
        <span className="highlight" data-on={marked}>
          {segment(1)}
          {segment(2)}
          {segment(3)}
        </span>
      </span>
    </h1>
  );
}

export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-seen={seen} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

type Phase = "idle" | "play" | "rewind";

const REPLAY_START = 450;
const REPLAY_REWIND = 700;

export function Replay({
  children,
  className = "",
  hold = 5200,
}: {
  children: ReactNode;
  className?: string;
  hold?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>("idle");
  const [phase, setPhase] = useState<Phase>("idle");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.35,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timers: number[] = [];
    const go = (next: Phase, ms: number, then?: () => void) => {
      timers.push(
        window.setTimeout(() => {
          phaseRef.current = next;
          setPhase(next);
          then?.();
        }, ms),
      );
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function loop() {
      if (reduce) return;
      go("rewind", hold, () => go("play", REPLAY_REWIND, loop));
    }

    if (phaseRef.current === "play") loop();
    else go("play", reduce ? 0 : REPLAY_START, loop);
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [visible, hold]);

  return (
    <div ref={ref} aria-hidden="true" data-phase={phase} className={`replay ${className}`}>
      {children}
    </div>
  );
}
