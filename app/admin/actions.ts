"use server";

import { revalidatePath } from "next/cache";
import { cancelByToken } from "@/lib/bookings";
import { formatDate, formatRange, validateBlock } from "@/lib/rules";
import { db, requireAdmin } from "@/lib/supabase";

export type BlockState = {
  error?: string;
  done?: string;
  values?: { room: string; date: string; from: string; to: string; label: string };
};

const OVERLAP =
  "Some of those hours are already booked. Cancel those bookings first, then block.";

function refresh(): void {
  revalidatePath("/admin");
  revalidatePath("/rooms/[id]", "page");
}

export async function cancelAdmin(token: string): Promise<void> {
  await requireAdmin();
  await cancelByToken(token);
  refresh();
}

export async function blockSlots(_prev: BlockState, form: FormData): Promise<BlockState> {
  await requireAdmin();

  const text = (key: string) => String(form.get(key) ?? "").trim();
  const values = {
    room: text("room"),
    date: text("date"),
    from: text("from"),
    to: text("to"),
    label: text("label"),
  };
  const from = Number(values.from);
  const to = Number(values.to);

  const invalid = validateBlock({ date: values.date, from, to, label: values.label });
  if (invalid) return { error: invalid, values };

  const roomId = Number(values.room);
  const { data: room, error: roomError } = Number.isInteger(roomId)
    ? await db()
        .from("rooms")
        .select("id, name")
        .eq("id", roomId)
        .eq("active", true)
        .maybeSingle()
    : { data: null, error: null };
  if (roomError) throw new Error(roomError.message);
  if (!room) return { error: "That room is not available.", values };

  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const cancelToken = crypto.randomUUID();
  const { error } = await db()
    .from("bookings")
    .insert(
      hours.map((hour) => ({
        room_id: room.id,
        date: values.date,
        hour,
        kind: "block",
        name: values.label,
        cancel_token: cancelToken,
      })),
    );
  if (error) {
    if (error.code === "23505") return { error: OVERLAP, values };
    throw new Error(error.message);
  }

  refresh();
  return {
    done: `Blocked ${room.name}, ${formatDate(values.date)}, ${formatRange(hours)}`,
  };
}
