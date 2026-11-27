"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type ToastKind = "success" | "danger" | "warning" | "neutral";

export type ToastNotice = {
  key: string;
  kind: ToastKind;
  title: string;
  text: string;
};

const STYLES: Record<ToastKind, { icon: string; bar: string }> = {
  success: { icon: "bg-success/15 text-success", bar: "bg-success" },
  danger: { icon: "bg-danger/15 text-danger", bar: "bg-danger" },
  warning: { icon: "bg-warning/15 text-warning", bar: "bg-warning" },
  neutral: { icon: "bg-mist text-ink-muted", bar: "bg-outline" },
};

const PATHS: Record<ToastKind, string[]> = {
  success: ["M5 12.5l4.5 4.5L19 7.5"],
  danger: ["M6 6l12 12M18 6L6 18"],
  warning: ["M12 3l9.5 17h-19z", "M12 10v4M12 17.5v.01"],
  neutral: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", "M12 11v5M12 8v.01"],
};

const SHOW_MS = 4000;
const WARNING_MS = 8000;
const EXIT_MS = 200;

export function ResultToast({ notice }: { notice: ToastNotice }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [closed, setClosed] = useState(false);
  const duration = notice.kind === "warning" ? WARNING_MS : SHOW_MS;
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const style = STYLES[notice.kind];

  useEffect(() => {
    if (paused || leaving) return;
    startedAt.current = Date.now();
    const id = setTimeout(() => setLeaving(true), remaining.current);
    return () => {
      clearTimeout(id);
      remaining.current = Math.max(remaining.current - (Date.now() - startedAt.current), 400);
    };
  }, [paused, leaving]);

  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => {
      setClosed(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("notice");
      next.delete("sent");
      next.delete("t");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, EXIT_MS);
    return () => clearTimeout(id);
  }, [leaving, pathname, router, searchParams]);

  if (closed) return null;

  return (
    <div
      role={notice.kind === "warning" ? "alert" : "status"}
      aria-live={notice.kind === "warning" ? "assertive" : "polite"}
      aria-atomic="true"
      data-leaving={leaving}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="result-toast fixed right-6 bottom-6 z-50 w-[360px] max-w-[calc(100%-3rem)] overflow-hidden rounded-card-mobile border border-line bg-surface text-ink shadow-lg shadow-scrim/25"
    >
      <div className="flex items-start gap-3 py-4 pr-3 pl-4">
        <span
          aria-hidden="true"
          className={`grid size-9 flex-none place-items-center rounded-pill ${style.icon}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {PATHS[notice.kind].map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-px">
          <p className="text-[15px] leading-5 font-semibold text-navy">{notice.title}</p>
          <p className="text-[13px] leading-[19px] text-ink-muted [overflow-wrap:anywhere]">
            {notice.text}
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setLeaving(true)}
          className="grid size-8 flex-none place-items-center rounded-pill text-ink-muted hover:bg-mist hover:text-ink motion-safe:transition-[color,background-color] motion-safe:duration-300 motion-safe:delay-75"
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div aria-hidden="true" className="h-[3px] bg-mist motion-reduce:hidden">
        <div
          className={`result-toast-bar h-full origin-left ${style.bar}`}
          style={{
            animationDuration: `${duration}ms`,
            animationPlayState: paused || leaving ? "paused" : "running",
          }}
        />
      </div>
    </div>
  );
}
