"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const FAILSAFE_MS = 6000;

type Controls = { start: () => void; finish: () => void };

export default function RouteProgress() {
  const pathname = usePathname();
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const controls = useRef<Controls | null>(null);
  const shown = useRef(pathname);

  useEffect(() => {
    const bar = track.current;
    const inner = fill.current;
    if (!bar || !inner) return;
    let timers: number[] = [];
    let running = false;

    const clear = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };

    const reset = () => {
      bar.style.transition = "none";
      bar.style.opacity = "0";
      inner.style.transition = "none";
      inner.style.width = "0%";
    };

    const finish = () => {
      if (!running) return;
      running = false;
      clear();
      inner.style.transition = "width 220ms ease-out";
      inner.style.width = "100%";
      timers.push(
        window.setTimeout(() => {
          bar.style.transition = "opacity 320ms ease-out";
          bar.style.opacity = "0";
        }, 240),
        window.setTimeout(reset, 640),
      );
    };

    const start = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      clear();
      reset();
      void bar.offsetWidth;
      running = true;
      bar.style.opacity = "1";
      inner.style.transition = "width 420ms cubic-bezier(0.1, 0.7, 0.3, 1)";
      inner.style.width = "70%";
      timers.push(
        window.setTimeout(() => {
          inner.style.transition = "width 6s cubic-bezier(0.2, 0.6, 0.3, 1)";
          inner.style.width = "92%";
        }, 420),
        window.setTimeout(finish, FAILSAFE_MS),
      );
    };

    controls.current = { start, finish };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      start();
    };

    const onPop = () => {
      if (window.location.pathname !== shown.current) start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    window.addEventListener("progress:start", start);
    window.addEventListener("progress:finish", finish);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("progress:start", start);
      window.removeEventListener("progress:finish", finish);
      clear();
      reset();
      controls.current = null;
    };
  }, []);

  useEffect(() => {
    shown.current = pathname;
    controls.current?.finish();
  }, [pathname]);

  return (
    <div
      ref={track}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-100 h-[3px] opacity-0"
    >
      <div
        ref={fill}
        className="h-full w-0 rounded-r-[3px] bg-linear-to-r from-brand to-brand-strong shadow-[0_0_10px] shadow-brand/55"
      />
    </div>
  );
}
