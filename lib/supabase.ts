import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
  dgroup_leader: string | null;
  cancel_token: string;
  status: "booked" | "cancelled";
  created_at: string;
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

export async function authClient(): Promise<SupabaseClient> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
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
