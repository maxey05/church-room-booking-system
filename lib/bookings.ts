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
  status: "booked" | "cancelled";
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
