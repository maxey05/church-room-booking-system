"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { parseRoomPax } from "@/lib/rules";
import { updateRoomCapacity } from "../actions";

const fade =
  "motion-safe:transition-[color,background-color,border-color,box-shadow,filter] motion-safe:duration-300 motion-safe:delay-75";
const iconButton = `grid size-11 place-items-center rounded-pill hover:bg-mist ${fade}`;

export default function CapacityCell({
  roomId,
  roomName,
  pax,
}: {
  roomId: number;
  roomName: string;
  pax: number | null;
}) {
  const [value, setValue] = useState(pax);
  const [prevPax, setPrevPax] = useState(pax);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const active = useRef(false);
  const busy = useRef(false);
  const returnFocus = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  if (pax !== prevPax) {
    setPrevPax(pax);
    setValue(pax);
  }

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (returnFocus.current) {
      returnFocus.current = false;
      openRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function start() {
    active.current = true;
    setDraft(value === null ? "" : String(value));
    setError("");
    setSaved(false);
    setEditing(true);
  }

  function cancel(refocus: boolean) {
    active.current = false;
    returnFocus.current = refocus;
    setError("");
    setEditing(false);
  }

  function commit(refocus: boolean) {
    if (!active.current || busy.current) return;
    const parsed = parseRoomPax(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (parsed.pax === value) {
      cancel(refocus);
      return;
    }
    busy.current = true;
    startTransition(async () => {
      const result = await updateRoomCapacity(roomId, draft);
      busy.current = false;
      if ("error" in result) {
        setError(result.error);
        return;
      }
      active.current = false;
      returnFocus.current = refocus;
      setValue(result.pax);
      setError("");
      setEditing(false);
      setSaved(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaved(false), 2000);
    });
  }

  if (editing) {
    return (
      <div data-editing className="flex flex-wrap items-center gap-2">
        <label htmlFor={`capacity-${roomId}`} className="sr-only">
          Capacity for {roomName}
        </label>
        <input
          ref={inputRef}
          id={`capacity-${roomId}`}
          type="text"
          inputMode="numeric"
          maxLength={3}
          value={draft}
          readOnly={pending}
          onChange={(e) => {
            setDraft(e.target.value.replace(/\D/g, "").slice(0, 3));
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(true);
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel(true);
            }
          }}
          onBlur={() => commit(false)}
          aria-invalid={error ? true : undefined}
          className="h-11 w-22 rounded-pill border-2 border-brand-strong bg-surface px-4 text-base font-semibold text-ink"
        />
        <span className="text-ink-muted">pax</span>
        <button
          type="button"
          aria-label="Save capacity"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => commit(true)}
          className={`${iconButton} text-success`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Cancel editing"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => cancel(true)}
          className={`${iconButton} text-ink-muted`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
        {error ? (
          <p role="alert" className="basis-full text-sm font-semibold text-danger">
            {error}
          </p>
        ) : (
          <p className="basis-full text-xs text-ink-muted">Enter to save · Esc to cancel</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        ref={openRef}
        type="button"
        aria-label={`Edit capacity for ${roomName}`}
        onClick={start}
        className={`group -ml-[13px] inline-flex min-h-11 items-center gap-2 rounded-slot border border-transparent px-3 font-medium text-ink hover:border-brand-tint hover:bg-brand-soft ${fade}`}
      >
        <span className={value === null ? "text-ink-muted" : undefined}>
          {value === null ? "Not set yet" : `${value} pax`}
        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink-muted opacity-60 group-hover:opacity-100"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      </button>
      <span role="status" className="text-sm font-semibold text-success">
        {saved ? "Saved" : ""}
      </span>
    </div>
  );
}
