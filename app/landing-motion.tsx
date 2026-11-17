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
