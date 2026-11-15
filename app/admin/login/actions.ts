"use server";

import { redirect } from "next/navigation";
import { authClient, isAdminEmail } from "@/lib/supabase";

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
