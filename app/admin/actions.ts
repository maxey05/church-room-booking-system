"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelByToken, decideByToken, findBookedGroup } from "@/lib/bookings";
import {
  composeEmail,
  previewLink,
  resendLoggedEmail,
  rowBooking,
  sendApproved,
  sendCancelled,
  sendDeclined,
} from "@/lib/email";
import {
  formatDate,
  formatRange,
  isRealDate,
  parseDailyLimit,
  parseRoomPax,
  validateBlock,
  validateDailyLimit,
} from "@/lib/rules";
import { db, requireAdmin, type EmailLogRow } from "@/lib/supabase";

export type BlockState = {
  error?: string;
  done?: string;
  values?: { room: string; date: string; from: string; to: string; label: string };
};

const OVERLAP =
  "Some of those hours are already booked or waiting for approval. Cancel or decline those first, then block.";

export type LimitState = {
  error?: string;
  done?: string;
  value?: string;
};

export type RoomCapacityResult = { ok: true; pax: number | null } | { error: string };

function refresh(): void {
  revalidatePath("/admin", "layout");
  revalidatePath("/rooms/[id]", "page");
}

export async function cancelAdmin(token: string): Promise<void> {
  await requireAdmin();
  await cancelByToken(token);
  refresh();
}

export async function cancelFromCalendar(token: string, date: string): Promise<string> {
  await requireAdmin();
  const params = new URLSearchParams();
  if (isRealDate(date)) params.set("date", date);
  const booked = await findBookedGroup(token);
  if ((await cancelByToken(token)) > 0) {
    let sent = 0;
    if (booked?.email) {
      try {
        await sendCancelled(booked);
        sent = 1;
      } catch (e) {
        console.error("Cancellation email failed", e);
      }
    }
    params.set("notice", "cancelled");
    params.set("sent", String(sent));
    params.set("t", token);
  } else {
    const b = await decideByToken(token, "decline");
    if (!b) {
      params.set("notice", "stale");
    } else {
      let sent = 1;
      try {
        await sendDeclined(b);
      } catch (e) {
        console.error("Decline email failed", e);
        sent = 0;
      }
      params.set("notice", "declined");
      params.set("sent", String(sent));
      params.set("t", token);
    }
  }
  refresh();
  revalidatePath("/admin/list");
  return `/admin/calendar?${params}`;
}

const PENDING_FILTERS = ["over24", "floor1", "floor2"];

async function decide(
  token: string,
  filter: string,
  decision: "approve" | "decline",
): Promise<string> {
  const b = await decideByToken(token, decision);
  const params = new URLSearchParams();
  if (PENDING_FILTERS.includes(filter)) params.set("filter", filter);
  if (!b) {
    params.set("notice", "stale");
  } else {
    let sent = 1;
    try {
      if (decision === "approve") await sendApproved(b);
      else await sendDeclined(b);
    } catch (e) {
      console.error(decision === "approve" ? "Approval email failed" : "Decline email failed", e);
      sent = 0;
    }
    params.set("notice", decision === "approve" ? "approved" : "declined");
    params.set("sent", String(sent));
    params.set("t", token);
  }
  refresh();
  revalidatePath("/admin/list");
  return `/admin/pending?${params}`;
}

export async function approveRequest(token: string, filter: string): Promise<void> {
  await requireAdmin();
  redirect(await decide(token, filter, "approve"));
}

export async function declineRequest(token: string, filter: string): Promise<string> {
  await requireAdmin();
  return decide(token, filter, "decline");
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

export async function updateBookingLimit(
  _prev: LimitState,
  form: FormData,
): Promise<LimitState> {
  await requireAdmin();

  const raw = String(form.get("limit") ?? "").trim();
  const invalid = validateDailyLimit(raw);
  const limit = parseDailyLimit(raw);
  if (invalid || limit === null) return { error: invalid ?? "Invalid limit.", value: raw };

  const { error } = await db()
    .from("settings")
    .upsert({ id: true, daily_booking_limit: limit });
  if (error) {
    console.error("Saving the daily booking limit failed", error.message);
    return {
      error: "We couldn't save the limit. Please try again in a moment.",
      value: raw,
    };
  }

  revalidatePath("/admin/rooms");
  return {
    done: `Saved. One person can now request up to ${limit} ${limit === 1 ? "booking" : "bookings"} per day.`,
    value: String(limit),
  };
}

export async function updateRoomCapacity(
  roomId: number,
  value: string,
): Promise<RoomCapacityResult> {
  await requireAdmin();

  if (!Number.isInteger(roomId) || roomId < 1) return { error: "That room could not be found." };
  const parsed = parseRoomPax(String(value));
  if (!parsed.ok) return { error: parsed.error };

  const { data, error } = await db()
    .from("rooms")
    .update({ pax: parsed.pax })
    .eq("id", roomId)
    .select("id");
  if (error) {
    console.error("Saving the room capacity failed", error.message);
    return { error: "We couldn't save the capacity. Please try again in a moment." };
  }
  if (!data || data.length === 0) return { error: "That room could not be found." };

  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  return { ok: true, pax: parsed.pax };
}

const EMAIL_LOG_PARAMS = ["from", "to", "q", "type", "status"];

export async function resendEmail(id: number, query: string): Promise<string> {
  await requireAdmin();

  const kept = new URLSearchParams(String(query).slice(0, 500));
  const params = new URLSearchParams();
  for (const key of EMAIL_LOG_PARAMS) {
    const value = kept.get(key);
    if (value) params.set(key, value.slice(0, 100));
  }

  const outcome = await resendLoggedEmail(id);
  if (outcome.kind === "done") {
    params.set("notice", "resent");
    if (outcome.id !== null) params.set("e", String(outcome.id));
  } else {
    params.set("notice", outcome.kind);
  }

  refresh();
  const qs = params.toString();
  return qs ? `/admin/email-log?${qs}` : "/admin/email-log";
}

export async function previewEmail(
  id: number,
): Promise<{ subject: string; body: string } | null> {
  await requireAdmin();

  if (!Number.isInteger(id) || id < 1) return null;
  const { data, error } = await db().from("email_log").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("Loading the email preview failed", error.message);
    return null;
  }
  if (!data) return null;
  const row = data as EmailLogRow;
  const message = composeEmail(row.kind, rowBooking(row), previewLink(row.kind));
  return { subject: message.subject, body: message.lines.join("\n") };
}
