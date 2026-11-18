"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const fade =
  "motion-safe:transition-[color,background-color,border-color,filter] motion-safe:duration-300 motion-safe:delay-75";

export default function NoticeDialog({
  title,
  rows,
  closeHref,
  children,
}: {
  title: string;
  rows: [string, string][];
  closeHref: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const textId = useId();
  const router = useRouter();

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      aria-describedby={textId}
      onClose={() => router.replace(closeHref, { scroll: false })}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="decline-dialog m-auto w-[calc(100%-2rem)] max-w-[26rem] rounded-card-mobile bg-surface p-0 text-ink backdrop:bg-scrim/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex flex-col gap-4 p-5">
        <h2 id={headingId} className="text-lg leading-6">
          {title}
        </h2>
        <div id={textId} className="flex flex-col gap-3 text-sm leading-6">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-slot bg-mist p-4">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="font-semibold [overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
          </dl>
          {children}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={() => ref.current?.close()}
            className={`min-h-11 rounded-pill bg-navy px-5 text-sm font-semibold text-navy-ink hover:bg-brand-strong ${fade}`}
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
