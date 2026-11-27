"use client";

import { useFormStatus } from "react-dom";

export function ApproveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="min-h-11 rounded-pill bg-brand-strong px-4 text-sm font-medium text-surface enabled:hover:bg-navy disabled:opacity-60 motion-safe:transition-[color,background-color,border-color] motion-safe:duration-300 motion-safe:delay-75"
    >
      {pending ? "Approving…" : "Approve"}
    </button>
  );
}
