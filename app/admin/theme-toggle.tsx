"use client";

import { useState, type MouseEvent } from "react";

export default function ThemeToggle({ initial }: { initial: "light" | "dark" }) {
  const [dark, setDark] = useState(initial === "dark");

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    const next = !dark;
    const root = document.documentElement;
    setDark(next);
    root.classList.add("theme-fading");
    e.currentTarget.closest("[data-theme]")?.setAttribute("data-theme", next ? "dark" : "light");
    document.cookie = `admin-theme=${next ? "dark" : "light"}; path=/admin; max-age=31536000; samesite=lax`;
    window.setTimeout(() => root.classList.remove("theme-fading"), 400);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      className="flex min-h-11 w-full items-center gap-3 rounded-slot px-3 text-left text-sm font-medium text-sidebar-ink/75 hover:bg-sidebar-ink/10 motion-safe:transition-colors motion-safe:duration-150"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="flex-none"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <span className="flex-1">Dark mode</span>
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 flex-none rounded-pill motion-safe:transition-colors motion-safe:duration-300 ${
          dark ? "bg-brand" : "bg-sidebar-ink/25"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-4 rounded-pill bg-sidebar-ink motion-safe:transition-transform motion-safe:duration-300 ${
            dark ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}
