"use client";

import { useActionState, useState } from "react";
import { signIn, type LoginState } from "./actions";

const box =
  "block cursor-text rounded-slot border border-outline-soft bg-surface px-4 pt-2.5 pb-2 hover:border-outline focus-within:border-brand-strong focus-within:ring-3 focus-within:ring-brand-tint motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200";
const label = "block text-xs font-medium text-ink-muted";
const input =
  "mt-0.5 block min-h-7 w-full bg-transparent text-base text-ink outline-none placeholder:text-outline";

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:delay-75 motion-safe:group-hover:translate-x-0.5"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signIn,
    {},
  );
  const [showReset, setShowReset] = useState(false);

  return (
    <form action={formAction} className="flex flex-col">
      <div className="flex flex-col gap-4">
        <label className={box}>
          <span className={label}>Email Address</span>
          <input
            name="email"
            type="email"
            maxLength={254}
            required
            autoComplete="username"
            placeholder="example@email.com"
            defaultValue={state.email}
            className={input}
          />
        </label>
        <label className={box}>
          <span className={label}>Password</span>
          <input
            name="password"
            type="password"
            maxLength={128}
            required
            autoComplete="current-password"
            placeholder="******"
            className={input}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => setShowReset((open) => !open)}
        aria-expanded={showReset}
        className="mt-1 inline-flex min-h-11 items-center self-start text-sm font-medium text-brand-strong underline decoration-brand-tint underline-offset-4 hover:text-navy hover:decoration-navy motion-safe:transition-colors motion-safe:duration-300 motion-safe:delay-75"
      >
        Forgot your password?
      </button>
      {showReset && (
        <p className="text-sm text-ink-muted">
          Password reset by email isn&apos;t set up yet. Ask the site owner to
          reset it for you.
        </p>
      )}

      {state.error && (
        <p role="alert" className="mt-2 font-semibold text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-pill bg-navy px-7 text-base font-semibold text-navy-ink hover:bg-brand-strong disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink-muted disabled:hover:bg-mist motion-safe:transition-colors motion-safe:duration-300 motion-safe:delay-75"
      >
        {pending ? "Logging in…" : "Login"}
        {!pending && <Arrow />}
      </button>
    </form>
  );
}
