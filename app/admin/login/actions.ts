"use server";

import { redirect } from "next/navigation";
import { MAX_EMAIL } from "@/lib/rules";
import { allow, authClient, isAdminEmail } from "@/lib/supabase";

const MAX_PASSWORD = 128;

export type LoginState = { error?: string; email?: string };

export async function signIn(
  _prev: LoginState,
  form: FormData,
): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) {
    return { error: "Please enter your email and password.", email };
  }
  if (email.length > MAX_EMAIL || password.length > MAX_PASSWORD) {
    return { error: "Incorrect email or password.", email: email.slice(0, MAX_EMAIL) };
  }
  if (!(await allow("login", 10, 900))) {
    return { error: "Too many login attempts. Please wait 15 minutes and try again.", email };
  }

  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return {
      error:
        error.status === 400
          ? "Incorrect email or password."
          : "Sorry, login isn't working right now. Please try again in a moment.",
      email,
    };
  }

  if (!isAdminEmail(data.user.email)) {
    await supabase.auth.signOut();
    return { error: "This account is not an admin.", email };
  }

  redirect("/admin");
}

export async function signOut() {
  await (await authClient()).auth.signOut();
  redirect("/admin/login");
}
