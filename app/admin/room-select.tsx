"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

type Option = { value: string; label: string };

export default function RoomSelect({
  name,
  options,
  defaultValue,
  className,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
  className: string;
}) {
  const [value, setValue] = useState(
    options.some((o) => o.value === defaultValue) ? (defaultValue as string) : (options[0]?.value ?? ""),
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function show() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function pick(i: number) {
    setValue(options[i].value);
    setOpen(false);
    button.current?.focus();
  }

  function onKey(e: KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab" && open) {
      setOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return show();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => Math.min(last, Math.max(0, i + step)));
    } else if (open && (e.key === "Home" || e.key === "End")) {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : last);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) pick(active);
      else show();
    }
  }

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
        className={`${className} flex w-full items-center justify-between gap-3 text-left`}
      >
        <span className="truncate">{selected?.label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`flex-none text-ink-muted motion-safe:transition-transform motion-safe:duration-300 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <ul
        id={listId}
        role="listbox"
        data-open={open}
        className="room-menu absolute inset-x-0 top-[calc(100%+6px)] z-40 max-h-72 min-w-56 overflow-y-auto rounded-slot border border-line bg-surface p-1.5 shadow-[0_18px_40px_-18px] shadow-scrim/40"
      >
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={on}
              onPointerDown={(e) => e.preventDefault()}
              onPointerMove={() => setActive(i)}
              onClick={(e) => {
                e.preventDefault();
                pick(i);
              }}
              className={`flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-md px-3 text-sm motion-safe:transition-colors motion-safe:duration-200 ${
                i === active ? "bg-brand-soft" : ""
              } ${on ? "font-semibold text-navy" : "font-normal text-ink"}`}
            >
              {o.label}
              {on && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="flex-none text-brand-strong"
                >
                  <path d="M5 12l5 5 9-10" />
                </svg>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
