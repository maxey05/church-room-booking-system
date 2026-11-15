"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

const field =
  "min-h-11 w-full rounded-pill border border-outline bg-brand-tint px-4 text-base font-normal text-ink";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signIn,
    {},
  );

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-col gap-4 rounded-card-mobile bg-brand-soft p-4 md:rounded-card md:p-6"
    >
      <label className="flex flex-col gap-1 font-semibold">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue={state.email}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={field}
        />
      </label>

      {state.error && (
        <p role="alert" className="font-semibold text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-pill bg-brand-strong px-6 font-semibold text-surface transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink-muted motion-reduce:transition-none md:w-auto"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
