"use client";

import { useFormStatus } from "react-dom";

export function CancelButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="min-h-10 rounded-pill bg-danger px-[18px] text-sm font-semibold text-surface enabled:hover:brightness-90 disabled:opacity-60 motion-safe:transition-[filter] motion-safe:duration-300 motion-safe:delay-75"
    >
      {pending ? "Cancelling…" : "Cancel booking"}
    </button>
  );
}
