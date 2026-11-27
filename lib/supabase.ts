import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

export type Room = {
  id: number;
  name: string;
  floor: number;
  size_sqm: number | null;
  pax: number | null;
  description: string | null;
  photo_url: string | null;
  amenities: string[];
  active: boolean;
};

export type Booking = {
  id: number;
  room_id: number;
  date: string;
  hour: number;
  kind: "booking" | "block";
  name: string;
  email: string | null;
  contact: string | null;
  expected_pax: number | null;
  dgroup_leader: string | null;
  notes: string | null;
  cancel_token: string;
  status: "pending" | "booked" | "declined" | "cancelled" | "expired";
  created_at: string;
};

export type EmailKind = "approval" | "decline" | "cancellation";
export type EmailStatus = "sent" | "failed" | "resent";

export type EmailLogRow = {
  id: number;
  created_at: string;
  kind: EmailKind;
  status: EmailStatus;
  recipient_name: string;
  recipient_email: string;
  room_name: string;
  floor: number;
  booking_date: string;
  hours: number[];
  error: string | null;
  cancel_token: string | null;
};

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Add it to .env.local (see .env.example).`,
    );
  }
  return value;
}

export function db(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

export async function allow(
  bucket: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown")
    .trim()
    .slice(0, 64);
  const { data, error } = await db().rpc("hit_rate_limit", {
    p_key: `${bucket}:${ip}`,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("Rate limit check failed", error.message);
    return true;
  }
  return data === true;
}

export const AUTH_COOKIE_OPTIONS = { httpOnly: true };

export async function authClient(): Promise<SupabaseClient> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          return;
        }
      },
    },
  });
}

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const allowed = requireEnv("ADMIN_EMAILS")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export const getAdmin = cache(async (): Promise<User | null> => {
  const { data, error } = await (await authClient()).auth.getUser();
  if (error || !data.user || !isAdminEmail(data.user.email)) return null;
  return data.user;
});

export async function requireAdmin(): Promise<User> {
  const user = await getAdmin();
  if (!user) redirect("/admin/login");
  return user;
}
