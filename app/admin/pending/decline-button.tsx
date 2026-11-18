"use client";

import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

const fade =
  "motion-safe:transition-[color,background-color,border-color,filter] motion-safe:duration-300 motion-safe:delay-75";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`min-h-11 rounded-pill bg-danger px-4 text-sm font-semibold text-surface enabled:hover:brightness-90 disabled:opacity-60 ${fade}`}
    >
      {pending ? "Declining…" : "Confirm decline"}
    </button>
  );
}

export function DeclineButton({
  action,
  name,
  room,
  date,
  time,
}: {
  action: () => Promise<string>;
  name: string;
  room: string;
  date: string;
  time: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const textId = useId();
  const router = useRouter();
  const rows: [string, string][] = [
    ["Name", name],
    ["Room", room],
    ["Date", date],
    ["Time", time],
  ];

  async function decline() {
    const next = await action();
    ref.current?.close();
    router.replace(next, { scroll: false });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className={`min-h-11 rounded-pill border border-outline-soft bg-surface px-4 text-sm font-medium text-danger hover:border-danger hover:bg-danger/10 ${fade}`}
      >
        Decline
      </button>
      <dialog
        ref={ref}
        aria-labelledby={headingId}
        aria-describedby={textId}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="decline-dialog m-auto w-[calc(100%-2rem)] max-w-[26rem] rounded-card-mobile bg-surface p-0 text-ink backdrop:bg-scrim/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex flex-col gap-4 p-5">
          <h2 id={headingId} className="text-lg leading-6">
            Decline this request?
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
            <p className="text-ink-muted">A decline email will be sent.</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => ref.current?.close()}
              className={`min-h-11 rounded-pill border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-brand hover:bg-brand-soft ${fade}`}
            >
              Keep request
            </button>
            <form action={decline}>
              <ConfirmButton />
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
