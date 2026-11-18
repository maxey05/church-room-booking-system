import {
  contactVariants,
  DEFAULT_DAILY_LIMIT,
  manilaDayRange,
  groupByToken,
  manilaNow,
  parseDailyLimit,
  hasStarted,
} from "@/lib/rules";
import { db } from "@/lib/supabase";

export async function cancelByToken(token: string): Promise<number> {
  const { data, error } = await db()
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("cancel_token", token)
    .eq("status", "booked")
    .select("id");
  if (error) throw new Error(error.message);
  return data.length;
}

export type FoundBooking = {
  roomId: number;
  roomName: string;
  floor: number;
  date: string;
  name: string;
  hours: number[];
  active: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  hour: number;
  date: string;
  name: string;
  status: "pending" | "booked" | "declined" | "cancelled" | "expired";
  room_id: number;
  rooms: { name: string; floor: number } | null;
};

export async function findBooking(token: string): Promise<FoundBooking | null> {
  if (!UUID.test(token)) return null;
  const { data, error } = await db()
    .from("bookings")
    .select("hour, date, name, status, room_id, rooms(name, floor)")
    .eq("cancel_token", token)
    .eq("kind", "booking")
    .order("hour");
  if (error) throw new Error(error.message);
  const rows = data as unknown as Row[];
  const first = rows[0];
  if (!first?.rooms) return null;
  return {
    roomId: first.room_id,
    roomName: first.rooms.name,
    floor: first.rooms.floor,
    date: first.date,
    name: first.name,
    hours: rows.map((r) => r.hour),
    active: rows.some((r) => r.status === "booked"),
  };
}

export type DecidedBooking = {
  name: string;
  email: string;
  roomName: string;
  floor: number;
  date: string;
  hours: number[];
  cancelToken: string;
};

type PendingRow = {
  hour: number;
  date: string;
  name: string;
  email: string;
  room_id: number;
  rooms: { name: string; floor: number } | null;
};

export async function decideByToken(
  token: string,
  decision: "approve" | "decline",
  now: Date = new Date(),
): Promise<DecidedBooking | null> {
  if (!UUID.test(token)) return null;
  const { data, error } = await db()
    .from("bookings")
    .select("hour, date, name, email, room_id, rooms(name, floor)")
    .eq("cancel_token", token)
    .eq("kind", "booking")
    .eq("status", "pending")
    .order("hour");
  if (error) throw new Error(error.message);
  const rows = data as unknown as PendingRow[];
  const first = rows[0];
  if (!first?.rooms) return null;
  if (hasStarted(first.date, first.hour, now)) return null;

  const { data: updated, error: updateError } = await db()
    .from("bookings")
    .update({ status: decision === "approve" ? "booked" : "declined" })
    .eq("cancel_token", token)
    .eq("kind", "booking")
    .eq("status", "pending")
    .select("id");
  if (updateError) throw new Error(updateError.message);
  if (updated.length === 0) return null;

  return toDecided(rows, token);
}

function toDecided(rows: PendingRow[], token: string): DecidedBooking | null {
  const first = rows[0];
  if (!first?.rooms) return null;
  return {
    name: first.name,
    email: first.email,
    roomName: first.rooms.name,
    floor: first.rooms.floor,
    date: first.date,
    hours: rows.map((r) => r.hour),
    cancelToken: token,
  };
}

export async function findBookedGroup(token: string): Promise<DecidedBooking | null> {
  if (!UUID.test(token)) return null;
  const { data, error } = await db()
    .from("bookings")
    .select("hour, date, name, email, room_id, rooms(name, floor)")
    .eq("cancel_token", token)
    .eq("kind", "booking")
    .eq("status", "booked")
    .order("hour");
  if (error) throw new Error(error.message);
  return toDecided(data as unknown as PendingRow[], token);
}

export async function expireStalePending(now: Date = new Date()): Promise<void> {
  const { data, error } = await db()
    .from("bookings")
    .select("cancel_token, date, hour")
    .eq("kind", "booking")
    .eq("status", "pending")
    .lte("date", manilaNow(now).date);
  if (error) throw new Error(error.message);
  const tokens = groupByToken(data as { cancel_token: string; date: string; hour: number }[])
    .filter((g) => hasStarted(g.date, g.hours[0], now))
    .map((g) => g.cancel_token);
  if (tokens.length === 0) return;
  const { error: updateError } = await db()
    .from("bookings")
    .update({ status: "expired" })
    .in("cancel_token", tokens)
    .eq("kind", "booking")
    .eq("status", "pending");
  if (updateError) throw new Error(updateError.message);
}

export async function getDailyLimit(): Promise<number> {
  try {
    const { data, error } = await db()
      .from("settings")
      .select("daily_booking_limit")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return parseDailyLimit(data?.daily_booking_limit) ?? DEFAULT_DAILY_LIMIT;
  } catch (e) {
    console.error("Loading the daily booking limit failed, using the default", e);
    return DEFAULT_DAILY_LIMIT;
  }
}

export async function countBookingsToday(email: string, contact: string): Promise<number> {
  const { start, end } = manilaDayRange(manilaNow().date);
  const base = () =>
    db()
      .from("bookings")
      .select("cancel_token")
      .eq("kind", "booking")
      .in("status", ["pending", "booked"])
      .gte("created_at", start)
      .lt("created_at", end);
  const [byEmail, byContact] = await Promise.all([
    base().eq("email", email.trim().toLowerCase()),
    base().in("contact", contactVariants(contact)),
  ]);
  if (byEmail.error) throw new Error(byEmail.error.message);
  if (byContact.error) throw new Error(byContact.error.message);
  const tokens = new Set<string>();
  for (const row of [...(byEmail.data ?? []), ...(byContact.data ?? [])]) {
    tokens.add(row.cancel_token as string);
  }
  return tokens.size;
}
