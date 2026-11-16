"use server";

import { sendConfirmation } from "@/lib/email";
import {
  formatRange,
  manilaNow,
  resolveDate,
  validateBooking,
} from "@/lib/rules";
import { db } from "@/lib/supabase";

export type BookState = {
  error?: string;
  values?: {
    name: string;
    email: string;
    contact: string;
    dgroupLeader: string;
    notes: string;
  };
  slotTaken?: boolean;
  done?: {
    room: string;
    date: string;
    time: string;
    emailed: boolean;
    email: string;
  };
};

export type TakenResult =
  | { taken: number[]; pastUntil: number }
  | { error: string };

const TAKEN =
  "Sorry, one of those slots was just taken. We've refreshed the times, so please pick another.";

const MAX_NOTES = 500;

const longDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
});

export async function book(
  roomId: number,
  _prev: BookState,
  form: FormData,
): Promise<BookState> {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const values = {
    name: text("name"),
    email: text("email").toLowerCase(),
    contact: text("contact"),
    dgroupLeader: text("dgroupLeader"),
    notes: text("notes").slice(0, MAX_NOTES),
  };
  const date = text("date");
  const hours = form.getAll("hours").map(Number);

  const invalid = validateBooking({
    ...values,
    consent: form.get("consent") === "on",
    date,
    hours,
  });
  if (invalid) return { error: invalid, values };

  const { data: room, error: roomError } = await db()
    .from("rooms")
    .select("id, name, floor")
    .eq("id", roomId)
    .eq("active", true)
    .maybeSingle();
  if (roomError) throw new Error(roomError.message);
  if (!room) return { error: "This room is not available.", values };

  const cancelToken = crypto.randomUUID();
  const { error: insertError } = await db()
    .from("bookings")
    .insert(
      hours.map((hour) => ({
        room_id: room.id,
        date,
        hour,
        name: values.name,
        email: values.email,
        contact: values.contact.replace(/[\s-]/g, ""),
        dgroup_leader: values.dgroupLeader || null,
        notes: values.notes || null,
        cancel_token: cancelToken,
      })),
    );
  if (insertError) {
    if (insertError.code === "23505") return { error: TAKEN, values, slotTaken: true };
    throw new Error(insertError.message);
  }

  let emailed = true;
  try {
    await sendConfirmation({
      to: values.email,
      name: values.name,
      roomName: room.name,
      floor: room.floor,
      date,
      hours,
      cancelToken,
    });
  } catch (e) {
    console.error("Confirmation email failed", e);
    emailed = false;
  }

  return {
    done: {
      room: `${room.name} · Floor ${room.floor}`,
      date: longDate.format(new Date(`${date}T00:00:00Z`)),
      time: formatRange(hours),
      emailed,
      email: values.email,
    },
  };
}

export async function getTaken(roomId: number, date: string): Promise<TakenResult> {
  const now = manilaNow();
  if (
    !Number.isInteger(roomId) ||
    roomId < 1 ||
    typeof date !== "string" ||
    resolveDate(date, now.date) !== date
  ) {
    return { error: "Please pick a valid room and date." };
  }

  const { data, error } = await db()
    .from("bookings")
    .select("hour")
    .eq("room_id", roomId)
    .eq("date", date)
    .eq("status", "booked");
  if (error) {
    console.error("Loading taken hours failed", error.message);
    return { error: "We couldn't load the times. Please try again." };
  }

  return {
    taken: (data ?? []).map((r) => r.hour as number),
    pastUntil: date === now.date ? now.hour : -1,
  };
}
