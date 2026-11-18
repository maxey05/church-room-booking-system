import nodemailer from "nodemailer";
import type { DecidedBooking } from "@/lib/bookings";
import { emailFailureReason, formatDate, formatRange } from "@/lib/rules";
import { db, requireEnv, type EmailKind, type EmailLogRow } from "@/lib/supabase";

export type EmailBooking = {
  name: string;
  email: string;
  roomName: string;
  floor: number;
  date: string;
  hours: number[];
};

export type ResendOutcome =
  | { kind: "stale" }
  | { kind: "cancelled" }
  | { kind: "done"; id: number | null };

async function send(to: string, subject: string, lines: string[]): Promise<void> {
  const user = requireEnv("GMAIL_USER");
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: requireEnv("GMAIL_APP_PASSWORD") },
    connectionTimeout: 10_000,
    socketTimeout: 10_000,
  });
  await transport.sendMail({
    from: `"CCF Alabang Room Booking" <${user}>`,
    to,
    subject,
    text: lines.join("\n"),
  });
}

export function composeEmail(
  kind: EmailKind,
  b: EmailBooking,
  link: string,
): { subject: string; lines: string[] } {
  const where = `Room: ${b.roomName} (Floor ${b.floor})`;
  const when = `When: ${formatDate(b.date)}, ${formatRange(b.hours)}`;
  if (kind === "approval") {
    return {
      subject: `Room booking approved: ${b.roomName} — ${formatDate(b.date)}`,
      lines: [
        `Hi ${b.name},`,
        "",
        "Good news! Your room booking has been approved.",
        "",
        where,
        when,
        "",
        "Need to cancel? Open this link and press the cancel button:",
        link,
        "",
        "See you there!",
        "CCF Alabang Room Booking",
      ],
    };
  }
  if (kind === "cancellation") {
    return {
      subject: `Room booking cancelled: ${b.roomName} — ${formatDate(b.date)}`,
      lines: [
        `Hi ${b.name},`,
        "",
        "Sorry, your approved room booking has been cancelled by an admin.",
        "",
        where,
        when,
        "",
        "Those hours are open again. You're welcome to book another time or room here:",
        link,
        "",
        "God bless,",
        "CCF Alabang Room Booking",
      ],
    };
  }
  return {
    subject: `Room booking not approved: ${b.roomName} — ${formatDate(b.date)}`,
    lines: [
      `Hi ${b.name},`,
      "",
      "Sorry, we couldn't approve your room booking request this time.",
      "",
      where,
      when,
      "",
      "Those hours are open again. You're welcome to book another time or room here:",
      link,
      "",
      "God bless,",
      "CCF Alabang Room Booking",
    ],
  };
}

function liveLink(kind: EmailKind, token: string | null): string {
  if (kind !== "approval") return `${requireEnv("SITE_URL")}/rooms`;
  if (!token) throw new Error("This approval email has no cancel link to rebuild.");
  return `${requireEnv("SITE_URL")}/cancel/${token}`;
}

export function previewLink(kind: EmailKind): string {
  return kind !== "approval" ? `${process.env.SITE_URL ?? ""}/rooms` : "…";
}

export function rowBooking(row: EmailLogRow): EmailBooking {
  return {
    name: row.recipient_name,
    email: row.recipient_email,
    roomName: row.room_name,
    floor: row.floor,
    date: row.booking_date,
    hours: row.hours,
  };
}

async function record(
  kind: EmailKind,
  status: "sent" | "failed",
  b: EmailBooking,
  token: string | null,
  reason: string | null,
): Promise<number | null> {
  try {
    const { data, error } = await db()
      .from("email_log")
      .insert({
        kind,
        status,
        recipient_name: b.name,
        recipient_email: b.email,
        room_name: b.roomName,
        floor: b.floor,
        booking_date: b.date,
        hours: b.hours,
        error: reason,
        cancel_token: token,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return (data as { id: number }).id;
  } catch (e) {
    console.error("Saving the email log failed", e);
    return null;
  }
}

async function deliver(kind: EmailKind, b: EmailBooking, token: string | null): Promise<void> {
  try {
    const message = composeEmail(kind, b, liveLink(kind, token));
    await send(b.email, message.subject, message.lines);
  } catch (e) {
    await record(kind, "failed", b, token, emailFailureReason(e));
    throw e;
  }
  await record(kind, "sent", b, token, null);
}

export async function sendApproved(b: DecidedBooking): Promise<void> {
  await deliver("approval", b, b.cancelToken);
}

export async function sendDeclined(b: Omit<DecidedBooking, "cancelToken">): Promise<void> {
  await deliver("decline", b, null);
}

export async function sendCancelled(b: Omit<DecidedBooking, "cancelToken">): Promise<void> {
  await deliver("cancellation", b, null);
}

export async function resendLoggedEmail(id: number): Promise<ResendOutcome> {
  if (!Number.isInteger(id) || id < 1) return { kind: "stale" };

  const { data, error } = await db()
    .from("email_log")
    .select("*")
    .eq("id", id)
    .eq("status", "failed")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { kind: "stale" };
  const row = data as EmailLogRow;

  if (row.kind === "approval") {
    if (!row.cancel_token) return { kind: "stale" };
    const { data: live, error: liveError } = await db()
      .from("bookings")
      .select("id")
      .eq("cancel_token", row.cancel_token)
      .eq("kind", "booking")
      .eq("status", "booked")
      .limit(1);
    if (liveError) throw new Error(liveError.message);
    if (!live || live.length === 0) return { kind: "cancelled" };
  }

  const { data: claimed, error: claimError } = await db()
    .from("email_log")
    .update({ status: "resent" })
    .eq("id", id)
    .eq("status", "failed")
    .select("id");
  if (claimError) throw new Error(claimError.message);
  if (!claimed || claimed.length === 0) return { kind: "stale" };

  const b = rowBooking(row);
  let reason: string | null = null;
  try {
    const message = composeEmail(row.kind, b, liveLink(row.kind, row.cancel_token));
    await send(b.email, message.subject, message.lines);
  } catch (e) {
    console.error("Resending the email failed", e);
    reason = emailFailureReason(e);
  }
  const newId = await record(
    row.kind,
    reason === null ? "sent" : "failed",
    b,
    row.cancel_token,
    reason,
  );
  return { kind: "done", id: newId };
}
